// Migration Script: Convert Base64 Media to Supabase Storage
// Run this via: supabase functions deploy migrate-base64-media --project-ref vjlvvmriqerfmztwtewa
// Then call: POST https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/migrate-base64-media

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
    // Only allow POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Use POST method' }), { status: 405 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const dbUrl = Deno.env.get('SUPABASE_DB_URL') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
        return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Import postgres for direct DB access
    const postgres = (await import('https://deno.land/x/postgresjs@v3.4.4/mod.js')).default;
    const sql = postgres(dbUrl, { max: 1 });

    try {
        // Get ONE media with base64 data (process one at a time to avoid timeout)
        const mediaToMigrate = await sql`
      SELECT id, inspection_id, file_name, file_url, mime_type
      FROM inspection_media
      WHERE file_url LIKE 'data:%'
      ORDER BY id ASC
      LIMIT 1
    `;

        console.log(`Found ${mediaToMigrate.length} records to migrate`);

        const results = {
            total: mediaToMigrate.length,
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (const media of mediaToMigrate) {
            try {
                console.log(`Migrating media ID ${media.id}...`);

                // Extract base64 data
                const base64Match = media.file_url.match(/^data:([^;]+);base64,(.+)$/);
                if (!base64Match) {
                    results.errors.push(`ID ${media.id}: Invalid base64 format`);
                    results.failed++;
                    continue;
                }

                const mimeType = base64Match[1];
                const base64Data = base64Match[2];

                // Convert to binary
                const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

                // Generate file path
                const timestamp = Date.now();
                const sanitizedFileName = (media.file_name || 'file').replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `${media.inspection_id}/${timestamp}_migrated_${sanitizedFileName}`;

                // Upload to Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('inspection-media')
                    .upload(filePath, binaryData, {
                        contentType: mimeType,
                        upsert: false
                    });

                if (uploadError) {
                    results.errors.push(`ID ${media.id}: Upload failed - ${uploadError.message}`);
                    results.failed++;
                    continue;
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('inspection-media')
                    .getPublicUrl(filePath);

                const newUrl = urlData.publicUrl;

                // Update database record
                await sql`
          UPDATE inspection_media
          SET file_url = ${newUrl}, updated_at = NOW()
          WHERE id = ${media.id}
        `;

                console.log(`✅ Migrated ID ${media.id} -> ${newUrl.substring(0, 60)}...`);
                results.success++;

            } catch (mediaError) {
                const errorMsg = mediaError instanceof Error ? mediaError.message : String(mediaError);
                results.errors.push(`ID ${media.id}: ${errorMsg}`);
                results.failed++;
            }
        }

        await sql.end();

        return new Response(JSON.stringify({
            message: `Migration complete. ${results.success}/${results.total} migrated successfully.`,
            results
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Migration error:', error);
        await sql.end();
        return new Response(JSON.stringify({
            error: 'Migration failed',
            details: error instanceof Error ? error.message : String(error)
        }), { status: 500 });
    }
});
