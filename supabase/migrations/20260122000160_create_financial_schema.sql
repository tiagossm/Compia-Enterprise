-- Migration 60: Create Financial Schema & CRM Integration
-- Date: 2026-01-22
-- Author: O Guardião

-- ============================================================================
-- 1. Table: plans (Definição de Produtos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,          -- 'starter', 'professional', 'enterprise'
    display_name TEXT NOT NULL,         -- 'Starter', 'Professional', 'Enterprise'
    slug TEXT NOT NULL UNIQUE,          -- URL friendly version
    description TEXT,
    
    -- Pricing (Lei dos Centavos)
    price_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'BRL',
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    
    -- Limits & Features
    limits JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { "users": 5, "storage_gb": 10, "inspections_monthly": 100 }
    features JSONB NOT NULL DEFAULT '{}'::jsonb, -- { "ai_analysis": true, "api_access": false }
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Public read (authenticated), Admin write only
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone" ON public.plans
    FOR SELECT USING (true);

-- ============================================================================
-- 2. Table: subscriptions (Contratos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    
    -- Status Lifecycle
    status TEXT NOT NULL DEFAULT 'trial' 
        CHECK (status IN ('trial', 'active', 'past_due', 'grace_period', 'suspended', 'canceled')),
    
    -- Gateway Integration (Lei da Segregação)
    gateway_name TEXT DEFAULT 'asaas',  -- 'asaas', 'stripe'
    gateway_customer_id TEXT,
    gateway_subscription_id TEXT,
    
    -- CRM Integration (Integração Comercial)
    crm_deal_id TEXT,             -- ID do negócio no Pipedrive/HubSpot
    mrr_value_cents INTEGER,      -- Valor recorrente mensal para relatórios
    usage_limits_snapshot JSONB,  -- Snapshot dos limites no momento da contratação
    
    -- Timestamps
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by organization
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- RLS: OrgAdmin sees own subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins see own subscription" ON public.subscriptions
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'org_admin')
        )
    );

-- ============================================================================
-- 3. Table: invoices (Histórico Financeiro)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id),
    
    -- Gateway Reference
    gateway_invoice_id TEXT,
    payment_link TEXT,
    pdf_url TEXT,
    
    -- Values
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'BRL',
    
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'overdue', 'canceled', 'refunded', 'failed')),
        
    due_date DATE,
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: OrgAdmin sees invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins see own invoices" ON public.invoices
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'org_admin')
        )
    );

-- ============================================================================
-- 4. Table: webhook_events (Lei da Idempotência)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'processed', -- 'processed', 'failed', 'ignored'
    error_message TEXT,
    
    -- Compounded unique constraint for idempotency
    UNIQUE(gateway, external_event_id)
);

-- Only service role can access webhooks log
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No public policies (Service Role only)

-- ============================================================================
-- 5. Table: usage_metrics (Log de Consumo Diário - CRM Feed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Core Metrics
    active_users_count INTEGER DEFAULT 0,
    inspections_count INTEGER DEFAULT 0,
    ai_analyses_count INTEGER DEFAULT 0,
    storage_used_mb NUMERIC(10, 2) DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per org per day
    UNIQUE(organization_id, date)
);

-- RLS: OrgAdmin sees own usage
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins see own usage" ON public.usage_metrics
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'org_admin')
        )
    );

-- ============================================================================
-- 6. Updates to organizations table (CRM Fields)
-- ============================================================================

-- Add CRM tracking fields if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'crm_deal_id') THEN
        ALTER TABLE public.organizations ADD COLUMN crm_deal_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'crm_status') THEN
        ALTER TABLE public.organizations ADD COLUMN crm_status TEXT DEFAULT 'lead';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'account_manager_id') THEN
        ALTER TABLE public.organizations ADD COLUMN account_manager_id UUID REFERENCES public.users(id);
    END IF;
END $$;

-- ============================================================================
-- 7. Seed Initial Plans
-- ============================================================================
INSERT INTO public.plans (name, display_name, slug, price_cents, billing_period, limits, features)
VALUES 
(
    'starter', 
    'Essencial', 
    'starter-monthly', 
    19900, 
    'monthly', 
    '{"users": 2, "storage_gb": 5, "inspections_monthly": 100, "ai_minutes": 0}'::jsonb,
    '{"ai_chat": true, "ai_multimodal": false, "dashboard": false}'::jsonb
),
(
    'professional', 
    'Inteligente', 
    'pro-monthly', 
    39700, 
    'monthly', 
    '{"users": 15, "storage_gb": 50, "inspections_monthly": 500, "ai_minutes": 60}'::jsonb,
    '{"ai_chat": true, "ai_multimodal": true, "dashboard": true}'::jsonb
),
(
    'enterprise', 
    'Enterprise', 
    'enterprise-custom', 
    0, 
    'monthly', 
    '{"users": 9999, "storage_gb": 500, "inspections_monthly": 99999, "ai_minutes": 9999}'::jsonb,
    '{"ai_chat": true, "ai_multimodal": true, "dashboard": true, "sla": true}'::jsonb
)
ON CONFLICT (name) DO NOTHING;
