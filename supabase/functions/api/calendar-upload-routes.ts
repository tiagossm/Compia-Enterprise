
import { Hono } from "hono";
import { tenantAuthMiddleware as authMiddleware } from "./tenant-auth-middleware.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const calendarUploadRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

type Env = {
    DB: any;
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
};

// File size limits in bytes (same as media-routes)
const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024,      // 10 MB
    video: 100 * 1024 * 1024,     // 100 MB
    audio: 20 * 1024 * 1024,      // 20 MB
    document: 50 * 1024 * 1024    // 50 MB
};

calendarUploadRoutes.post("/upload", authMiddleware, async (c) => {
    const env = c.env;
    const user = c.get("user");

    if (!user) {
        return c.json({ error: "User not found" }, 401);
    }

    try {
        const body = await c.req.json();
        const {
            file_name,
            file_data,
            file_size,
            mime_type
        } = body;

        // Determine media type for validation
        let mediaType = 'document';
        if (mime_type.startsWith('image/')) mediaType = 'image';
        else if (mime_type.startsWith('video/')) mediaType = 'video';
        else if (mime_type.startsWith('audio/')) mediaType = 'audio';

        // Validate size
        const limit = FILE_SIZE_LIMITS[mediaType as keyof typeof FILE_SIZE_LIMITS];
        if (file_size > limit) {
            return c.json({ error: `Arquivo muito grande. Limite: ${limit / 1024 / 1024}MB` }, 400);
        }

        const supabaseUrl = env.SUPABASE_URL;
        const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            return c.json({ error: "Storage not configured" }, 500);
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Convert base64 to binary
        const base64Data = file_data.split(',')[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Generate unique path
        const timestamp = Date.now();
        const sanitizedFileName = file_name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `calendar_uploads/${user.organization_id}/${timestamp}_${sanitizedFileName}`;

        // Upload to 'inspection-media' bucket (reusing existing bucket)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('inspection-media')
            .upload(filePath, binaryData, {
                contentType: mime_type,
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase Storage error:', uploadError);
            throw new Error(uploadError.message);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('inspection-media')
            .getPublicUrl(filePath);

        return c.json({
            success: true,
            file_url: urlData.publicUrl,
            file_name: file_name
        });

    } catch (error) {
        console.error('Error uploading calendar attachment:', error);
        return c.json({
            error: "Erro ao fazer upload",
            details: error instanceof Error ? error.message : "Erro desconhecido"
        }, 500);
    }
});

export default calendarUploadRoutes;
