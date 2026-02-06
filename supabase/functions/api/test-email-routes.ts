import { Hono } from "hono";
import { EmailService } from "./email-service.ts";
import { getWelcomeTemplate, getApprovalTemplate, getAlertTemplate } from "./email-templates.ts";

const testEmailRoutes = new Hono<{ Bindings: any }>().basePath('/api/test-email');

testEmailRoutes.post("/", async (c) => {
    // Get URL parameters
    const to = c.req.query("to");
    const type = c.req.query("type") || "welcome";

    // Get API Key from environment (injected by Supabase)
    const apiKey = Deno.env.get('RESEND_API_KEY');

    if (!apiKey) {
        return c.json({ error: "Configuration Error: RESEND_API_KEY not found" }, 500);
    }

    if (!to) {
        return c.json({ error: "Missing 'to' parameter (email address)" }, 400);
    }

    const emailService = new EmailService(apiKey);
    let subject = "";
    let html = "";

    // Select Template
    switch (type) {
        case 'welcome':
            subject = "Bem-vindo ao Compia Enterprise!";
            html = getWelcomeTemplate("Usuário Teste", "https://compia.tech/login");
            break;
        case 'approval':
            subject = "Seu acesso ao Compia foi aprovado";
            html = getApprovalTemplate("Engenheiro Tiago", "https://compia.tech/login");
            break;
        case 'alert':
            subject = "Alerta de Segurança: Tentativa de Login";
            html = getAlertTemplate(
                "Novo acesso detectado",
                "Detectamos um novo acesso à sua conta vindo de São Paulo/SP (Chrome/Windows). Se foi você, ignore este email.",
                "https://compia.tech/security",
                "Verificar Atividade"
            );
            break;
        default:
            return c.json({ error: "Invalid type. Use 'welcome', 'approval', or 'alert'" }, 400);
    }

    // Send
    const result = await emailService.sendEmail([to], subject, html);

    if (result.success) {
        return c.json({ success: true, id: result.id, message: `Email (${type}) sent to ${to}` });
    } else {
        return c.json({ error: "Failed to send email", details: result.error }, 500);
    }
});

export default testEmailRoutes;
