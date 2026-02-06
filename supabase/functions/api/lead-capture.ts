import { Hono } from "hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { cors } from 'hono/cors';

const leadRoutes = new Hono().basePath('/api/leads');

// Enable CORS for external forms
leadRoutes.use('/*', cors({
    origin: '*', // Allow all origins for lead capture
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['Content-Type']
}));

// ============================================================================
// Rate Limiting (Simple In-Memory)
// ============================================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
        return true;
    }

    if (record.count >= RATE_LIMIT) {
        return false;
    }

    record.count++;
    return true;
}

// ============================================================================
// POST /leads/capture - Generic Lead Capture Endpoint
// ============================================================================
leadRoutes.post("/capture", async (c) => {
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const clientIp = c.req.header('x-forwarded-for')?.split(',')[0] || 'unknown';

    // Rate limit check
    if (!checkRateLimit(clientIp)) {
        return c.json({
            success: false,
            error: "Muitas requisições. Aguarde 1 minuto."
        }, 429);
    }

    try {
        const body = await c.req.json();
        const {
            name,
            email,
            phone,
            company,
            source,      // e.g., 'ebook_guia', 'webinar', 'newsletter'
            campaign,    // Optional campaign ID/name
            notes,       // Optional custom notes
            metadata     // Optional extra data (JSON)
        } = body;

        // Basic validation
        if (!email) {
            return c.json({ success: false, error: "Email é obrigatório" }, 400);
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return c.json({ success: false, error: "Email inválido" }, 400);
        }

        console.log("[LEADS] Capturing lead:", email, "Source:", source);

        // Check if lead already exists
        const { data: existingLead } = await supabaseAdmin
            .from('leads')
            .select('id, email, source')
            .eq('email', email)
            .single();

        let leadId: number;
        let isNew = false;

        if (existingLead) {
            // Update existing lead with new source/info
            leadId = existingLead.id;

            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            // Only update fields if provided
            if (name) updateData.contact_name = name;
            if (phone) updateData.phone = phone;
            if (company) updateData.company_name = company;
            if (notes) updateData.notes = `${existingLead.source || ''} | ${source}: ${notes}`;

            await supabaseAdmin
                .from('leads')
                .update(updateData)
                .eq('id', leadId);

            console.log("[LEADS] Updated existing lead:", leadId);

        } else {
            // Create new lead
            isNew = true;
            const { data: newLead, error: leadError } = await supabaseAdmin
                .from('leads')
                .insert({
                    email,
                    contact_name: name || null,
                    company_name: company || name || email.split('@')[0],
                    phone: phone || null,
                    source: source || 'landing_page',
                    status: 'new',
                    notes: campaign ? `Campanha: ${campaign}` : notes || null,
                    deal_value: 0
                })
                .select()
                .single();

            if (leadError) {
                console.error("[LEADS] Failed to create lead:", leadError);
                return c.json({ success: false, error: "Erro ao cadastrar" }, 500);
            }

            leadId = newLead.id;
            console.log("[LEADS] Created new lead:", leadId);
        }

        // Success response
        return c.json({
            success: true,
            is_new: isNew,
            message: isNew ? "Cadastro realizado com sucesso!" : "Dados atualizados!",
            lead_id: leadId
        });

    } catch (e: any) {
        console.error("[LEADS] Error:", e);
        return c.json({
            success: false,
            error: "Erro interno. Tente novamente."
        }, 500);
    }
});

// ============================================================================
// GET /leads/sources - List available lead sources (for analytics)
// ============================================================================
leadRoutes.get("/sources", async (c) => {
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data } = await supabaseAdmin
        .from('leads')
        .select('source')
        .not('source', 'is', null);

    const sources = [...new Set(data?.map(l => l.source) || [])];

    return c.json({ sources });
});

export default leadRoutes;
