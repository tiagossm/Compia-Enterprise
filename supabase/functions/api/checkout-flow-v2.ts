import { Hono } from "hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import { AsaasService } from "./asaas-service.ts";
import { cors } from 'hono/cors';

const commerceRoutes = new Hono().basePath('/api/commerce');

// Enable CORS
commerceRoutes.use('/*', cors());

// ============================================================================
// UTILITY: Generate SHA256 hash for email (audit without PII)
// ============================================================================
async function hashEmail(email: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// UTILITY: Generate idempotency key
// ============================================================================
function generateIdempotencyKey(email: string, planSlug: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `ck_${planSlug}_${timestamp}_${random}`;
}

// ============================================================================
// Rate Limiting (Simple In-Memory - For production, use Redis/KV)
// ============================================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // requests
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
// UTILITY: Validate and Calculate Coupon Discount
// ============================================================================
async function validateCoupon(supabaseAdmin: any, code: string, planId: string, originalPriceCents: number) {
    if (!code) return { valid: false, message: "Código não fornecido", discountCents: 0 };

    const { data: coupon, error } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .single();

    if (error || !coupon) {
        return { valid: false, message: "Cupom inválido", discountCents: 0 };
    }

    if (!coupon.is_active) {
        return { valid: false, message: "Cupom inativo", discountCents: 0 };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { valid: false, message: "Cupom expirado", discountCents: 0 };
    }

    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        return { valid: false, message: "Limite de uso do cupom atingido", discountCents: 0 };
    }

    // Validate Plan constraint
    if (coupon.valid_for_plans) {
        let validPlans: string[] = [];
        try {
            // Handle potential double-encoding or simple JSON
            if (typeof coupon.valid_for_plans === 'string') {
                // Try parsing once
                let parsed = JSON.parse(coupon.valid_for_plans);
                // If result is still string, parse again (handle double check)
                if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed);
                }
                validPlans = Array.isArray(parsed) ? parsed : [];
            } else if (Array.isArray(coupon.valid_for_plans)) {
                validPlans = coupon.valid_for_plans;
            }
        } catch (e) {
            console.warn("Error parsing valid_for_plans:", e);
        }

        if (validPlans.length > 0 && !validPlans.includes(planId)) {
            // Note: coupon.valid_for_plans usually stores IDs (UUIDs), but we might have slugs. 
            // Ideally we check against the ID we fetched for the plan.
            return { valid: false, message: "Cupom não aplicável a este plano", discountCents: 0 };
        }
    }

    let discountCents = 0;
    if (coupon.discount_type === 'percentage') {
        discountCents = Math.round(originalPriceCents * (coupon.discount_value / 100));
    } else {
        discountCents = Math.round(coupon.discount_value * 100); // Fixed value usually in BRL, convert to cents
    }

    // Ensure discount doesn't exceed price (sanity check)
    if (discountCents > originalPriceCents) {
        discountCents = originalPriceCents;
    }

    return {
        valid: true,
        coupon,
        discountCents
    };
}

// ============================================================================
// POST /commerce/validate-coupon
// ============================================================================
commerceRoutes.post("/validate-coupon", async (c) => {
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { code, plan_slug } = await c.req.json();

    if (!code || !plan_slug) {
        return c.json({ valid: false, message: "Dados incompletos" }, 400);
    }

    // Fetch Plan to get price and ID
    const { data: dbPlan } = await supabaseAdmin
        .from('plans')
        .select('id, price_cents')
        .eq('slug', plan_slug)
        .single();

    if (!dbPlan) {
        return c.json({ valid: false, message: "Plano não encontrado" }, 400);
    }

    const result = await validateCoupon(supabaseAdmin, code, dbPlan.id, dbPlan.price_cents);

    if (!result.valid) {
        return c.json({ valid: false, message: result.message }, 200);
    }

    const finalPriceCents = dbPlan.price_cents - result.discountCents;

    return c.json({
        valid: true,
        message: "Cupom aplicado com sucesso!",
        original_price: dbPlan.price_cents,
        discount: result.discountCents,
        final_price: finalPriceCents,
        discount_type: result.coupon.discount_type,
        discount_value: result.coupon.discount_value
    });
});


// ============================================================================
// POST /commerce/initiate - PLG Checkout Flow (Lead-First + Audit Trail)
// ============================================================================
commerceRoutes.post("/initiate", async (c) => {
    // Tracking variables for Audit Trail
    let attemptId: string | null = null;
    let leadId: number | null = null;
    let createdUserId: string | null = null;
    let createdOrgId: number | null = null;
    let asaasCustomerId: string | null = null;
    let asaasSubscriptionId: string | null = null;

    // Initialize Admin Client
    const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get client info for audit
    const clientIp = c.req.header('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    try {
        // ====================================================================
        // STEP 0: Rate Limit Check
        // ====================================================================
        if (!checkRateLimit(clientIp)) {
            return c.json({
                status: "rate_limited",
                message: "Muitas tentativas. Aguarde 1 minuto."
            }, 429);
        }

        const body = await c.req.json();
        const { user, company, plan_slug, payment_method } = body;

        console.log("[COMMERCE] Initiate Checkout for:", user.email, "Plan:", plan_slug);
        c.header('X-Debug-Version', 'v2-check-existing');


        // ====================================================================
        // STEP 1: Validate Plan
        // ====================================================================
        // ====================================================================
        // STEP 1: Validate Plan (Dynamic from DB)
        // ====================================================================
        const { data: dbPlan, error: planError } = await supabaseAdmin
            .from('plans')
            .select('id, slug, name, price_cents, is_active')
            .eq('slug', plan_slug)
            .single();

        if (planError || !dbPlan || !dbPlan.is_active) {
            console.error("[CHECKOUT] Invalid plan:", plan_slug, planError);
            return c.json({ error: "Plano inválido ou inativo." }, 400);
        }

        const selectedPlan = {
            price: dbPlan.price_cents / 100, // Original Price
            name: dbPlan.name,
            slug: dbPlan.slug,
            id: dbPlan.id // Need ID for verification
        };

        // ====================================================================
        // STEP 1.5: Apply Coupon (If provided)
        // ====================================================================
        let appliedCoupon = null;
        let finalPrice = selectedPlan.price;
        const couponCode = body.coupon_code;

        if (couponCode) {
            console.log("[COMMERCE] Validating coupon:", couponCode);
            const couponResult = await validateCoupon(supabaseAdmin, couponCode, dbPlan.id, dbPlan.price_cents);

            if (couponResult.valid) {
                appliedCoupon = couponResult.coupon;
                const discountAmount = couponResult.discountCents / 100;
                finalPrice = Math.max(0, finalPrice - discountAmount); // Ensure not negative
                console.log(`[COMMERCE] Coupon applied! Original: ${selectedPlan.price}, Final: ${finalPrice}`);

                // Track usage (can be async/optimistic)
                await supabaseAdmin.rpc('increment_coupon_usage', { coupon_id: appliedCoupon.id });
            } else {
                console.warn("[COMMERCE] Invalid coupon provided:", couponCode, couponResult.message);
                // Decide: Fail validation or just ignore? For explicit user input, failing is better.
                return c.json({ error: `Cupom inválido: ${couponResult.message}` }, 400);
            }
        }


        // ====================================================================
        // STEP 2: Create Checkout Attempt (Audit Trail - FIRST!)
        // ====================================================================
        const emailHash = await hashEmail(user.email);
        const idempotencyKey = generateIdempotencyKey(user.email, plan_slug);

        const { data: attempt, error: attemptError } = await supabaseAdmin
            .from('checkout_attempts')
            .insert({
                email_hash: emailHash,
                plan_slug: plan_slug,
                step: 'started',
                status: 'pending',
                idempotency_key: idempotencyKey,
                ip_address: clientIp,
                user_agent: userAgent,
                metadata: { company_name: company?.name, payment_method }
            })
            .select()
            .single();

        if (attemptError) {
            console.error("[COMMERCE] Failed to create attempt:", attemptError);
            // Continue anyway - audit failure shouldn't block checkout
        } else {
            attemptId = attempt.id;
        }

        // ====================================================================
        // STEP 3: UPSERT Lead in CRM (Lead-First Pattern)
        // ====================================================================
        const { data: existingLead } = await supabaseAdmin
            .from('leads')
            .select('id')
            .eq('email', user.email)
            .single();

        if (existingLead) {
            leadId = existingLead.id;
            // Update existing lead
            const { error: updateError } = await supabaseAdmin
                .from('leads')
                .update({
                    company_name: company?.name || user.name,
                    contact_name: user.name,
                    phone: user.phone,
                    source: 'checkout',
                    status: 'qualified',
                    notes: `Checkout iniciado. Plano: ${selectedPlan.name}`,
                    deal_value: selectedPlan.price,
                    updated_at: new Date().toISOString()
                })
                .eq('id', leadId);

            if (updateError) {
                console.error("[COMMERCE] Failed to update lead:", updateError);
            } else {
                console.log("[COMMERCE] Updated existing lead:", leadId);
            }
        } else {
            // Create new lead
            console.log("[COMMERCE] Creating new lead for:", user.email);
            const { data: newLead, error: leadError } = await supabaseAdmin
                .from('leads')
                .insert({
                    email: user.email,
                    company_name: company?.name || user.name,
                    contact_name: user.name,
                    phone: user.phone,
                    source: 'checkout',
                    status: 'qualified',
                    notes: `Checkout iniciado. Plano: ${selectedPlan.name}`,
                    deal_value: selectedPlan.price
                })
                .select()
                .single();

            if (leadError) {
                console.error("[COMMERCE] Failed to create lead:", leadError);
            } else if (newLead) {
                leadId = newLead.id;
                console.log("[COMMERCE] Created new lead:", leadId);
            }
        }

        // Update attempt with lead_id
        if (attemptId && leadId) {
            await supabaseAdmin
                .from('checkout_attempts')
                .update({ lead_id: leadId, step: 'lead_created' })
                .eq('id', attemptId);
        }

        // ====================================================================
        // STEP 4: Check if User Exists (Non-Revealing Response)
        // ====================================================================
        // ====================================================================
        // STEP 4: Handle Auth User (Get Existing or Create New)
        // ====================================================================
        const asaas = new AsaasService();
        let userId = null;
        let isNewUser = false;

        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === user.email);

        if (existingUser) {
            console.log("[COMMERCE] User already exists. Proceeding with existing user:", existingUser.id);
            userId = existingUser.id;

            // Optional: Update metadata if needed, but safe to skip to avoid overwriting preferences
        } else {
            // Create New User
            console.log("[COMMERCE] Creating new Auth User:", user.email);
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
                console.error("[COMMERCE] Create user failed:", authError);
                return c.json({ error: "Erro ao criar usuário. Tente novamente." }, 500);
            }
            userId = authUser.user.id;
            isNewUser = true;
        }

        // ====================================================================
        // STEP 5: Create Organization (Always create new org for new subscription context?)
        // OR Check if user has org (Simplification for MVP: Create new Org)
        // ====================================================================

        // Getting user object for context
        const currentUserStub = { id: userId, email: user.email };

        // Ensure we have a valid userId before proceeding
        if (!userId) {
            return c.json({ error: "Falha ao identificar usuário." }, 500);
        }

        createdUserId = userId; // Use userId which is guaranteed to be set

        // Update attempt
        if (attemptId) {
            await supabaseAdmin
                .from('checkout_attempts')
                .update({ step: 'user_created' })
                .eq('id', attemptId);
        }

        // ====================================================================
        // STEP 6: Create Organization
        // ====================================================================
        const { data: org, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
                name: company?.name || user.name + "'s Company",
                razao_social: company?.legal_name,
                nome_fantasia: company?.name,
                cnpj: company?.cnpj,
                // Structured Address
                address_street: company?.address?.street,
                address_number: company?.address?.number,
                address_complement: company?.address?.complement,
                address_neighborhood: company?.address?.neighborhood,
                address_city: company?.address?.city,
                address_state: company?.address?.state,
                address_zip_code: company?.address?.zip_code,
                // Legacy address field (concatenate for fallback)
                address: company?.address ? `${company.address.street}, ${company.address.number} - ${company.address.city}/${company.address.state}` : null,

                document: company?.document,
                slug: company?.slug,
                subscription_status: 'pending_payment',
                subscription_plan: plan_slug,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (orgError) {
            throw new Error("Falha ao criar organização: " + orgError.message);
        }

        createdOrgId = org.id;

        // ====================================================================
        // STEP 7: Link User to Organization
        // ====================================================================
        // ====================================================================
        // STEP 7: Link User to Organization
        // ====================================================================
        await supabaseAdmin.from('users').insert({
            id: userId,
            email: user.email,
            full_name: user.name,
            role: 'owner',
            is_active: true,
            approval_status: 'approved'
        });

        await supabaseAdmin.from('user_organizations').insert({
            user_id: userId,
            organization_id: org.id,
            role: 'owner',
            is_primary: true
        });

        // ====================================================================
        // STEP 8: Create Asaas Customer & Subscription
        // ====================================================================
        if (attemptId) {
            await supabaseAdmin
                .from('checkout_attempts')
                .update({ step: 'payment_initiated' })
                .eq('id', attemptId);
        }

        const asaasCustomer = await asaas.createOrUpdateCustomer({
            name: user.name,
            email: user.email,
            cpfCnpj: company?.cnpj || undefined,
            phone: user.phone,
            mobilePhone: user.phone,
            // Address for Anti-Fraud
            address: company?.address?.street,
            addressNumber: company?.address?.number,
            complement: company?.address?.complement,
            province: company?.address?.neighborhood,
            postalCode: company?.address?.zip_code
        });

        asaasCustomerId = asaasCustomer.id;

        const billingType = payment_method === 'PIX' ? 'PIX' : 'CREDIT_CARD';

        const subscription = await asaas.createSubscription({
            customer: asaasCustomer.id,
            billingType: billingType,
            value: finalPrice, // Use FINAL discounted price
            nextDueDate: new Date().toISOString().split('T')[0],
            cycle: 'MONTHLY',
            description: `Assinatura Plano ${selectedPlan.name} - COMPIA${appliedCoupon ? ` (Cupom: ${appliedCoupon.code})` : ''}`,
            externalReference: String(org.id)
        });

        asaasSubscriptionId = subscription.id;

        // ====================================================================
        // STEP 9: Store Subscription & Invoice Locally
        // ====================================================================
        await supabaseAdmin.from('subscriptions').insert({
            organization_id: org.id,
            plan_id: plan_slug,
            status: 'pending',
            gateway: 'asaas',
            gateway_subscription_id: subscription.id,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

        const payments = await asaas.getSubscriptionPayments(subscription.id);
        const firstPayment = payments.data && payments.data[0];

        let pixDetails = null;

        if (firstPayment) {
            await supabaseAdmin.from('invoices').insert({
                organization_id: org.id,
                subscription_id: null,
                gateway_invoice_id: firstPayment.id,
                gateway: 'asaas',
                amount: firstPayment.value,
                status: 'pending',
                due_date: firstPayment.dueDate
            });

            // If PIX, get QR Code immediately
            if (billingType === 'PIX') {
                try {
                    const qrCodeData = await asaas.getPixQrCode(firstPayment.id);
                    pixDetails = {
                        qr_code: qrCodeData.encodedImage,
                        copy_paste: qrCodeData.payload,
                        expiration: qrCodeData.expirationDate
                    };
                } catch (qrError) {
                    console.error("[CHECKOUT] Failed to fetch PIX QR Code:", qrError);
                }
            }
        }

        const paymentUrl = firstPayment ? firstPayment.invoiceUrl : null;

        // ====================================================================
        // STEP 10: Mark Success
        // ====================================================================
        if (attemptId) {
            await supabaseAdmin
                .from('checkout_attempts')
                .update({
                    step: 'completed',
                    status: 'success',
                    asaas_customer_id: asaasCustomerId,
                    asaas_subscription_id: asaasSubscriptionId
                })
                .eq('id', attemptId);
        }

        if (leadId) {
            await supabaseAdmin
                .from('leads')
                .update({ status: 'converted' })
                .eq('id', leadId);
        }

        return c.json({
            status: "success",
            user_id: userId,
            organization_id: org.id,
            payment_url: paymentUrl || "https://asaas.com/customer-portal",
            pix_details: pixDetails
        });

    } catch (e: any) {
        console.error("[COMMERCE] Checkout Critical Error:", e);

        // Cleanup if user was newly created and process failed completely? 
        // Be careful not to delete existing users
        if (false) {
            // Implementation detail: Only cleanup if isNewUser is true
        }

        // ====================================================================
        // ROLLBACK: Delete Auth User and Org (Keep Lead for CRM)
        // ====================================================================
        try {
            if (createdOrgId) {
                console.log(`[Rollback] Deleting Organization ${createdOrgId}...`);
                await supabaseAdmin.from('user_organizations').delete().eq('organization_id', createdOrgId);
                await supabaseAdmin.from('users').delete().eq('id', createdUserId);
                await supabaseAdmin.from('organizations').delete().eq('id', createdOrgId);
            }

            if (createdUserId) {
                console.log(`[Rollback] Deleting Auth User ${createdUserId}...`);
                await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            }
        } catch (rollbackError) {
            console.error("CRITICAL: Rollback failed!", rollbackError);
        }

        // Update attempt with failure
        if (attemptId) {
            await supabaseAdmin
                .from('checkout_attempts')
                .update({
                    step: 'failed',
                    status: 'failed',
                    error_code: e.name || 'UNKNOWN',
                    error_message: e.message,
                    asaas_customer_id: asaasCustomerId,
                    asaas_subscription_id: asaasSubscriptionId
                })
                .eq('id', attemptId);
        }

        // Update lead for recovery
        if (leadId) {
            await supabaseAdmin
                .from('leads')
                .update({
                    status: 'payment_failed',
                    notes: `Erro no checkout: ${e.message}`
                })
                .eq('id', leadId);
        }

        // Non-revealing generic response
        return c.json({
            status: "pending",
            message: `Erro no checkout: ${e.message}`, // Expose real error for debugging
            can_retry: true
        }, 200); // 200 OK, not 400 - allows retry
    }
});

export default commerceRoutes;
