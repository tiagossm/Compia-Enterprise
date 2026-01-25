import { Hono } from "hono";

type Env = {
    DB: any;
};

const asaasWebhookRoutes = new Hono<{ Bindings: Env }>();

// Define Asaas event types
type AsaasEventType =
    | 'PAYMENT_CONFIRMED'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_OVERDUE'
    | 'PAYMENT_DELETED'
    | 'PAYMENT_UPDATED'
    | 'PAYMENT_REFUNDED'
    | 'SUBSCRIPTION_DELETED'
    | 'SUBSCRIPTION_UPDATED';

interface AsaasWebhookPayload {
    id: string;
    event: AsaasEventType;
    payment?: {
        id: string;
        customer: string;
        subscription?: string;
        value: number;
        status: string;
        dueDate: string;
        confirmedDate?: string;
    };
    subscription?: {
        id: string;
        customer: string;
        status: string;
    };
}

// ============================================================================
// POST /webhooks/asaas - Main Asaas webhook handler
// ============================================================================
asaasWebhookRoutes.post("/", async (c) => {
    const env = c.env;

    // Verificar token de autenticação do Asaas
    const webhookToken = c.req.header('asaas-access-token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

    // Se configurado, verificar token (em produção, sempre deve estar configurado)
    if (expectedToken && webhookToken !== expectedToken) {
        console.warn("[ASAAS-WEBHOOK] Invalid webhook token received");
        return c.json({ error: "Unauthorized" }, 401);
    }

    let payload: AsaasWebhookPayload;

    try {
        payload = await c.req.json();
    } catch (err) {
        console.error("[ASAAS-WEBHOOK] Failed to parse JSON payload:", err);
        return c.json({ error: "Invalid JSON payload" }, 400);
    }

    console.log(`[ASAAS-WEBHOOK] Received event: ${payload.event}, id: ${payload.id}`);

    // Lei da Idempotência: Verificar se evento já foi processado
    try {
        const existingEvent = await env.DB.prepare(`
            SELECT id FROM webhook_events 
            WHERE gateway = 'asaas' AND external_event_id = ?
        `).bind(payload.id).first();

        if (existingEvent) {
            console.log(`[ASAAS-WEBHOOK] Event ${payload.id} already processed, skipping`);
            return c.json({ status: "already_processed" });
        }
    } catch (err) {
        console.error("[ASAAS-WEBHOOK] Error checking idempotency:", err);
        // Continue processing - we'll try to insert at the end
    }

    // Processar evento baseado no tipo
    try {
        switch (payload.event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                await handlePaymentConfirmed(env.DB, payload);
                break;

            case 'PAYMENT_OVERDUE':
                await handlePaymentOverdue(env.DB, payload);
                break;

            case 'PAYMENT_REFUNDED':
                await handlePaymentRefunded(env.DB, payload);
                break;

            case 'SUBSCRIPTION_DELETED':
                await handleSubscriptionDeleted(env.DB, payload);
                break;

            default:
                console.log(`[ASAAS-WEBHOOK] Unhandled event type: ${payload.event}`);
        }

        // Registrar evento processado (idempotência)
        await env.DB.prepare(`
            INSERT INTO webhook_events (gateway, external_event_id, event_type, payload, status)
            VALUES ('asaas', ?, ?, ?, 'processed')
        `).bind(
            payload.id,
            payload.event,
            JSON.stringify(payload)
        ).run();

        console.log(`[ASAAS-WEBHOOK] Successfully processed event ${payload.id}`);
        return c.json({ status: "processed" });

    } catch (err: any) {
        console.error(`[ASAAS-WEBHOOK] Error processing event ${payload.id}:`, err);

        // Tentar registrar erro
        try {
            await env.DB.prepare(`
                INSERT INTO webhook_events (gateway, external_event_id, event_type, payload, status, error_message)
                VALUES ('asaas', ?, ?, ?, 'failed', ?)
            `).bind(
                payload.id,
                payload.event,
                JSON.stringify(payload),
                err.message
            ).run();
        } catch (logErr) {
            console.error("[ASAAS-WEBHOOK] Failed to log error:", logErr);
        }

        return c.json({ error: "Processing failed", details: err.message }, 500);
    }
});

// ============================================================================
// Event Handlers
// ============================================================================

async function handlePaymentConfirmed(db: any, payload: AsaasWebhookPayload) {
    if (!payload.payment) return;

    const { id: paymentId, subscription: subscriptionId, confirmedDate, value } = payload.payment;

    console.log(`[ASAAS-WEBHOOK] Processing PAYMENT_CONFIRMED: ${paymentId}`);

    // Atualizar fatura para 'paid'
    const updateResult = await db.prepare(`
        UPDATE invoices 
        SET status = 'paid', 
            paid_at = COALESCE(?, NOW()),
            updated_at = NOW()
        WHERE gateway_invoice_id = ?
    `).bind(confirmedDate, paymentId).run();

    console.log(`[ASAAS-WEBHOOK] Updated invoice: ${updateResult?.meta?.changes || 0} rows`);

    // Se tiver subscription, atualizar status para 'active'
    if (subscriptionId) {
        await db.prepare(`
            UPDATE subscriptions 
            SET status = 'active',
                updated_at = NOW()
            WHERE gateway_subscription_id = ? AND status IN ('past_due', 'grace_period', 'trial')
        `).bind(subscriptionId).run();

        console.log(`[ASAAS-WEBHOOK] Updated subscription ${subscriptionId} to active`);
    }
}

async function handlePaymentOverdue(db: any, payload: AsaasWebhookPayload) {
    if (!payload.payment) return;

    const { id: paymentId, subscription: subscriptionId, value } = payload.payment;

    console.log(`[ASAAS-WEBHOOK] Processing PAYMENT_OVERDUE: ${paymentId}`);

    // Update invoice and get organization_id
    const invoice = await db.prepare(`
        UPDATE invoices 
        SET status = 'overdue', updated_at = NOW()
        WHERE gateway_invoice_id = ?
        RETURNING organization_id
    `).bind(paymentId).first();

    // If subscription, update status
    if (subscriptionId) {
        await db.prepare(`
            UPDATE subscriptions 
            SET status = 'past_due',
                updated_at = NOW()
            WHERE gateway_subscription_id = ? AND status = 'active'
        `).bind(subscriptionId).run();
    }

    // ✨ SMART REVENUE: Create Churn Recovery Lead in CRM
    if (invoice && invoice.organization_id) {
        try {
            // Get Org Details
            const org = await db.prepare(`
                SELECT name, contact_email, contact_phone FROM organizations WHERE id = ?
            `).bind(invoice.organization_id).first();

            if (org) {
                // Check if open churn lead already exists
                const existingLead = await db.prepare(`
                    SELECT id FROM leads 
                    WHERE company_name = ? AND deal_type = 'churn_recovery' AND status NOT IN ('won', 'lost')
                `).bind(org.name).first();

                if (!existingLead) {
                    console.log(`[ASAAS-WEBHOOK] Creating Churn Recovery Lead for ${org.name}`);

                    await db.prepare(`
                        INSERT INTO leads (
                            company_name, contact_name, email, phone, 
                            status, source, notes, 
                            deal_value, probability, 
                            deal_type
                        ) VALUES (
                            ?, ?, ?, ?,
                            'new', 'billing_failure', ?,
                            ?, 90, 
                            'churn_recovery'
                        )
                    `).bind(
                        org.name,
                        'Contato Financeiro',
                        org.contact_email,
                        org.contact_phone,
                        `ALERTA FINANCEIRO: Fatura em atraso (ID: ${paymentId}). Valor: R$ ${value.toFixed(2)}.`,
                        value, // Valor da dívida como valor do deal
                    ).run();
                }
            }
        } catch (e) {
            console.error('[ASAAS-WEBHOOK] Failed to create CRM lead:', e);
        }
    }
}

async function handlePaymentRefunded(db: any, payload: AsaasWebhookPayload) {
    if (!payload.payment) return;

    const { id: paymentId } = payload.payment;

    console.log(`[ASAAS-WEBHOOK] Processing PAYMENT_REFUNDED: ${paymentId}`);

    await db.prepare(`
        UPDATE invoices 
        SET status = 'refunded', updated_at = NOW()
        WHERE gateway_invoice_id = ?
    `).bind(paymentId).run();
}

async function handleSubscriptionDeleted(db: any, payload: AsaasWebhookPayload) {
    const subscriptionId = payload.subscription?.id || payload.payment?.subscription;

    if (!subscriptionId) {
        console.warn("[ASAAS-WEBHOOK] SUBSCRIPTION_DELETED without subscription id");
        return;
    }

    console.log(`[ASAAS-WEBHOOK] Processing SUBSCRIPTION_DELETED: ${subscriptionId}`);

    await db.prepare(`
        UPDATE subscriptions 
        SET status = 'canceled',
            canceled_at = NOW(),
            updated_at = NOW()
        WHERE gateway_subscription_id = ?
    `).bind(subscriptionId).run();
}

// ============================================================================
// Health check endpoint for Asaas webhook verification
// ============================================================================
asaasWebhookRoutes.get("/", (c) => {
    return c.json({
        status: "ok",
        message: "Asaas webhook endpoint ready",
        supported_events: [
            "PAYMENT_CONFIRMED",
            "PAYMENT_RECEIVED",
            "PAYMENT_OVERDUE",
            "PAYMENT_REFUNDED",
            "SUBSCRIPTION_DELETED"
        ]
    });
});

export default asaasWebhookRoutes;
