import { Hono } from "hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AsaasService } from "./asaas-service.ts";
import { cors } from 'hono/cors';

const commerceRoutes = new Hono();

// Enable CORS
commerceRoutes.use('/*', cors());

commerceRoutes.post("/initiate", async (c) => {
    try {
        const body = await c.req.json();
        const { user, company, plan_slug, payment_method } = body;

        console.log("[COMMERCE] Initiate Checkout for:", user.email, "Plan:", plan_slug);

        // 1. Initialize Services
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );
        const asaas = new AsaasService();

        // 2. Validate Plan & Price (Simple map for now, ideally fetch from DB)
        const plans: any = {
            'basic': { price: 199.00, name: 'Técnico' },
            'pro': { price: 397.00, name: 'Inteligente' },
            'enterprise': { price: 0, name: 'Corporativo' } // Should not happen here usually
        };
        const selectedPlan = plans[plan_slug] || plans['basic'];

        if (selectedPlan.price === 0) {
            return c.json({ error: "Invalid plan for checkout" }, 400);
        }

        // 3. Check if User Exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers.users.find((u: any) => u.email === user.email);

        if (userExists) {
            return c.json({ error: "Email já cadastrado. Faça login para assinar." }, 409);
        }

        // 4. Create Auth User
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
                full_name: user.name,
                phone: user.phone
            }
        });

        if (authError || !authUser.user) {
            console.error("Auth Create Error:", authError);
            throw new Error("Falha ao criar usuário: " + authError?.message);
        }

        // 5. Create Organization & Link User
        // We do this via direct DB insert to bypass RLS triggers that might require a session
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: company.name || user.name + "'s Company",
                cnpj: company.cnpj,
                document: company.document,
                slug: company.slug,
                subscription_status: 'pending_payment',
                subscription_plan: plan_slug,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (orgError) {
            // Rollback auth user? For now just throw
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
            throw new Error("Falha ao criar organização: " + orgError.message);
        }

        // Link User to Org (Role: Owner/Admin)
        await supabaseAdmin.from('users').insert({
            id: authUser.user.id,
            email: user.email,
            full_name: user.name,
            current_organization_id: org.id,
            role: 'owner',
            is_active: true,
            approval_status: 'approved'
        });

        await supabaseAdmin.from('user_organizations').insert({
            user_id: authUser.user.id,
            organization_id: org.id,
            role: 'owner',
            is_primary: true
        });


        // 6. Create Asaas Customer
        const asaasCustomer = await asaas.createOrUpdateCustomer({
            name: user.name,
            email: user.email,
            cpfCnpj: company.cnpj || undefined,
            phone: user.phone,
            mobilePhone: user.phone
        });

        // 7. Create Asaas Subscription
        const billingType = payment_method === 'PIX' ? 'PIX' : 'CREDIT_CARD';

        const subscription = await asaas.createSubscription({
            customer: asaasCustomer.id,
            billingType: billingType,
            value: selectedPlan.price,
            nextDueDate: new Date().toISOString().split('T')[0], // Today
            cycle: 'MONTHLY',
            description: `Assinatura Plano ${selectedPlan.name} - COMPIA`,
            externalReference: org.id // CRITICAL for Webhook
        });

        // 8. Store Subscription locally
        await supabaseAdmin.from('subscriptions').insert({
            organization_id: org.id,
            plan_id: plan_slug, // Assuming plan slug matches or handled casually
            status: 'pending',
            gateway: 'asaas',
            gateway_subscription_id: subscription.id,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        // 9. Get First Payment Link (Invoice)
        // Subscription creates a charge immediately if due date is today.
        const payments = await asaas.getSubscriptionPayments(subscription.id);
        const firstPayment = payments.data && payments.data[0];

        // Also store the first invoice if it exists
        if (firstPayment) {
            await supabaseAdmin.from('invoices').insert({
                organization_id: org.id,
                subscription_id: null, // Can link if we query subscription UUID
                gateway_invoice_id: firstPayment.id,
                gateway: 'asaas',
                amount: firstPayment.value,
                status: 'pending',
                due_date: firstPayment.dueDate
            });
        }

        const paymentUrl = firstPayment ? firstPayment.invoiceUrl : null;

        return c.json({
            status: "success",
            user_id: authUser.user.id,
            organization_id: org.id,
            payment_url: paymentUrl || "https://asaas.com/customer-portal" // Fallback
        });

    } catch (e: any) {
        console.error("Checkout Error:", e);
        return c.json({ error: e.message }, 400);
    }
});

export default commerceRoutes;
