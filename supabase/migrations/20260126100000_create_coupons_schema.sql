-- Migration 70: Create Coupons Schema
-- Date: 2026-01-26
-- Description: Adds support for discount coupons and plan management

-- ============================================================================
-- 1. Table: coupons
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,          -- Uppercase alphanumeric (e.g., 'WELCOME20')
    description TEXT,
    
    -- Discount logic
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value INTEGER NOT NULL,    -- Percentage (e.g. 20 for 20%) or Cents (e.g. 5000 for R$50)
    
    -- Constraints
    max_uses INTEGER,                   -- NULL = unlimited
    uses_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    minimum_amount_cents INTEGER,       -- Minimum order value
    
    -- Scope
    valid_for_plans JSONB,              -- Array of plan_ids (NULL = all)
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- SysAdmin can do everything
CREATE POLICY "SysAdmin full access coupons" ON public.coupons
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('system_admin', 'sys_admin'))
    );

-- Public (Authenticated) can read valid coupons (for verification)
CREATE POLICY "Auth users read active coupons" ON public.coupons
    FOR SELECT
    USING (is_active = true);


-- ============================================================================
-- 2. Table: coupon_redemptions (Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id),
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id),
    subscription_id UUID REFERENCES public.subscriptions(id),
    
    saved_amount_cents INTEGER NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SysAdmin full access coupon_redemptions" ON public.coupon_redemptions
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('system_admin', 'sys_admin'))
    );

CREATE POLICY "Org admins see own redemptions" ON public.coupon_redemptions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'org_admin')
        )
    );
