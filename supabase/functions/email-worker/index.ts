
import { Hono } from "https://esm.sh/hono@4.6.14";
import { cors } from "https://esm.sh/hono@4.6.14/cors";
import { EmailService } from "./email-service.ts";
import { getWelcomeTemplate, getApprovalTemplate, getAlertTemplate, getResetPasswordTemplate, getAccessGrantedTemplate } from "./email-templates.ts";

const app = new Hono();

app.use('/*', cors({
    origin: '*',
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
    exposeHeaders: ['content-length', 'x-request-id']
}));

// Handler para processar email
const sendEmailHandler = async (c: any) => {
    // 1. Get request data
    const body = await c.req.json();
    const { to, type, data } = body;
    const apiKey = Deno.env.get('RESEND_API_KEY');

    if (!apiKey) {
        console.error('[EMAIL-WORKER] RESEND_API_KEY not found');
        return c.json({ error: "Configuration Error: RESEND_API_KEY not found" }, 500);
    }

    if (!to || !type) {
        return c.json({ error: "Missing 'to' or 'type'" }, 400);
    }

    console.log(`[EMAIL-WORKER] Sending ${type} email to ${to}`);

    // 2. Prepare Email
    const emailService = new EmailService(apiKey);
    let subject = "";
    let html = "";

    switch (type) {
        case 'welcome':
            subject = "Bem-vindo ao Compia Enterprise!";
            html = getWelcomeTemplate(data?.name || "Novo Usuário", "https://compia.tech/login");
            break;
        case 'approval':
            subject = "Seu acesso ao Compia foi aprovado";
            html = getApprovalTemplate(data?.name || "Usuário", "https://compia.tech/login");
            break;
        case 'reset_password':
            subject = "Redefinir sua senha do Compia";
            html = getResetPasswordTemplate(data?.name || "Usuário", data?.resetUrl || "https://compia.tech/reset-password");
            break;
        case 'access_granted':
            subject = "Seu acesso ao Compia foi liberado! 🎉";
            html = getAccessGrantedTemplate(data?.name || "Usuário", data?.organizationName, "https://compia.tech/login");
            break;
        case 'alert':
            subject = `Alerta: ${data?.title || "Segurança"}`;
            html = getAlertTemplate(
                data?.title || "Alerta de Sistema",
                data?.message || "Uma atividade importante requer sua atenção.",
                data?.actionUrl,
                data?.actionText
            );
            break;
        default:
            console.error(`[EMAIL-WORKER] Invalid type: ${type}`);
            return c.json({ error: "Invalid type" }, 400);
    }

    // 3. Send
    const result = await emailService.sendEmail(Array.isArray(to) ? to : [to], subject, html);

    if (result.success) {
        console.log(`[EMAIL-WORKER] Email sent successfully: ${result.id}`);
        return c.json({ success: true, id: result.id });
    } else {
        console.error(`[EMAIL-WORKER] Failed to send: ${result.error}`);
        return c.json({ error: "Failed to send email", details: result.error }, 500);
    }
};

// Rotas - Supabase Edge Functions tem path prefix /email-worker
// Precisamos suportar ambos os formatos
app.post('/send', sendEmailHandler);
app.post('/email-worker/send', sendEmailHandler);

// Root POST também funciona para compatibilidade
app.post('/', sendEmailHandler);

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'email-worker' }));
app.get('/email-worker', (c) => c.json({ status: 'ok', service: 'email-worker' }));

Deno.serve(app.fetch);

