import { Hono } from "hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const asaasWebhookRoutes = new Hono();

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
    id: string; // Event ID
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
    // 1. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // [SEC-010] FIX: Validação de webhook agora é OBRIGATÓRIA - Gatekeeper 30/01/2026
    // 2. Authentication (REQUIRED - não aceitar webhooks sem token configurado)
    const webhookToken = c.req.header('asaas-access-token');
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

    if (!expectedToken) {
        console.error("[ASAAS-WEBHOOK] CRITICAL: ASAAS_WEBHOOK_TOKEN not configured!");
        return c.json({ error: "Webhook not configured" }, 500);
    }

    if (webhookToken !== expectedToken) {
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

    // 3. Idempotency Check
    const { data: existingEvent } = await supabaseAdmin
        .from('webhook_events')
        .select('id')
        .eq('gateway', 'asaas')
        .eq('external_event_id', payload.id)
        .maybeSingle();

    if (existingEvent) {
        console.log(`[ASAAS-WEBHOOK] Event ${payload.id} already processed, skipping`);
        return c.json({ status: "already_processed" });
    }

    // 4. Process Event
    try {
        switch (payload.event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                await handlePaymentConfirmed(supabaseAdmin, payload);
                break;

            case 'PAYMENT_OVERDUE':
                await handlePaymentOverdue(supabaseAdmin, payload);
                break;

            case 'PAYMENT_REFUNDED':
                await handlePaymentRefunded(supabaseAdmin, payload);
                break;

            case 'SUBSCRIPTION_DELETED':
                await handleSubscriptionDeleted(supabaseAdmin, payload);
                break;

            default:
                console.log(`[ASAAS-WEBHOOK] Unhandled event type: ${payload.event}`);
        }

        // 5. Log Success
        await supabaseAdmin.from('webhook_events').insert({
            gateway: 'asaas',
            external_event_id: payload.id,
            event_type: payload.event,
            payload: payload,
            status: 'processed',
            processed_at: new Date().toISOString()
        });

        console.log(`[ASAAS-WEBHOOK] Successfully processed event ${payload.id}`);
        return c.json({ status: "processed" });

    } catch (err: any) {
        console.error(`[ASAAS-WEBHOOK] Error processing event ${payload.id}:`, err);

        // Log Failure
        await supabaseAdmin.from('webhook_events').insert({
            gateway: 'asaas',
            external_event_id: payload.id,
            event_type: payload.event,
            payload: payload,
            status: 'failed',
            error_message: err.message,
            processed_at: new Date().toISOString()
        });

        return c.json({ error: "Processing failed", details: err.message }, 500);
    }
});

// ============================================================================
// Event Handlers
// ============================================================================

async function handlePaymentConfirmed(supabase: any, payload: AsaasWebhookPayload) {
    if (!payload.payment) return;

    const { id: paymentId, subscription: subscriptionId, confirmedDate } = payload.payment;

    console.log(`[ASAAS-WEBHOOK] Processing PAYMENT_CONFIRMED: ${paymentId}`);

    const paidAt = confirmedDate ? new Date(confirmedDate).toISOString() : new Date().toISOString();

    // 1. Update Invoice
    const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
            status: 'paid',
            paid_at: paidAt
        })
        .eq('gateway_invoice_id', paymentId);

    if (invoiceError) console.error("Error updating invoice:", invoiceError);
    else console.log(`[ASAAS-WEBHOOK] Invoice ${paymentId} marked as paid`);

    // 2. Update Subscription & Organization (if applicable)
    if (subscriptionId) {
        // Update Subscription
        const { data: subData, error: subError } = await supabase
            .from('subscriptions')
            .update({
                status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq('gateway_subscription_id', subscriptionId)
            .select('organization_id')
            .single();

        if (subError) {
            console.error("Error updating subscription:", subError);
        } else if (subData?.organization_id) {
            console.log(`[ASAAS-WEBHOOK] Subscription ${subscriptionId} active. Updating Org...`);

            // Sync Org Status
            const { error: orgError } = await supabase
                .from('organizations')
                .update({
                    subscription_status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', subData.organization_id);

            if (orgError) console.error("Error updating organization:", orgError);
            else console.log(`[ASAAS-WEBHOOK] Organization ${subData.organization_id} activated.`);
        }
    }
}

async function handlePaymentOverdue(supabase: any, payload: AsaasWebhookPayload) {
    if (!payload.payment) return;
    const { id: paymentId, subscription: subscriptionId, value } = payload.payment;

    console.log(`[ASAAS-WEBHOOK] Processing PAYMENT_OVERDUE: ${paymentId}`);

    // Update Invoice
    const { data: invoiceData } = await supabase
        .from('invoices')
        .update({ status: 'overdue' })
        .eq('gateway_invoice_id', paymentId)
        .select('organization_id')
        .single();

    // Update Subscription (if active)
    if (subscriptionId) {
        await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('gateway_subscription_id', subscriptionId)
            .eq('status', 'active');
    }

    // CRM Lead Logic (Simplified)
    if (invoiceData?.organization_id) {
        // Fetch Org Info
        const { data: org } = await supabase
            .from('organizations')
            .select('name, contact_email, contact_phone')
            .eq('id', invoiceData.organization_id)
            .single();

        if (org) {
            // Check existing churn lead
            const { data: existingLead } = await supabase
                .from('leads')
                .select('id')
                .eq('company_name', org.name)
                .eq('deal_type', 'churn_recovery')
                .not('status', 'in', '("won","lost")')
                .maybeSingle();

            if (!existingLead) {
                console.log(`[ASAAS-WEBHOOK] Creating Churn Recovery Lead for ${org.name}`);
                await supabase.from('leads').insert({
                    company_name: org.name,
                    contact_name: 'Contato Financeiro',
                    email: org.contact_email,
                    phone: org.contact_phone,
                    status: 'new',
                    source: 'billing_failure',
                    notes: `ALERTA FINANCEIRO: Fatura em atraso (ID: ${paymentId}). Valor: R$ ${value.toFixed(2)}.`,
                    deal_value: value,
                    probability: 90,
                    deal_type: 'churn_recovery'
                });
            }
        }
    }
}

async function handlePaymentRefunded(supabase: any, payload: AsaasWebhookPayload) {
    if (!payload.payment) return;
    const { id: paymentId } = payload.payment;

    console.log(`[ASAAS-WEBHOOK] Processing PAYMENT_REFUNDED: ${paymentId}`);

    await supabase
        .from('invoices')
        .update({ status: 'refunded' })
        .eq('gateway_invoice_id', paymentId);
}

async function handleSubscriptionDeleted(supabase: any, payload: AsaasWebhookPayload) {
    const subscriptionId = payload.subscription?.id || payload.payment?.subscription;
    if (!subscriptionId) return;

    console.log(`[ASAAS-WEBHOOK] Processing SUBSCRIPTION_DELETED: ${subscriptionId}`);

    await supabase
        .from('subscriptions')
        .update({
            status: 'canceled',
            canceled_at: new Date().toISOString()
        })
        .eq('gateway_subscription_id', subscriptionId);
}

// Health check
asaasWebhookRoutes.get("/", (c) => {
    return c.json({
        status: "ok",
        message: "Asaas webhook endpoint ready (Supabase Native)",
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
