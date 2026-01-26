-- Migration: Create Plans Table
-- Description: Stores system pricing plans, add-ons, and packages.

-- 1. Create table plans
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,          -- slug, e.g., 'pro', 'enterprise', 'addon-users-5'
    display_name TEXT NOT NULL,         -- e.g., 'Plano Profissional', 'Pacote +5 Usuários'
    description TEXT,
    
    -- Type Definition
    type TEXT NOT NULL DEFAULT 'subscription' CHECK (type IN ('subscription', 'addon', 'one_time')),
    addon_config JSONB DEFAULT '{}',    -- Metadata for addons (e.g. { "users_added": 5 })

    -- Pricing
    price_cents INTEGER NOT NULL,       -- Price in cents (e.g. 19900 = R$ 199,00)
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly', 'one_time')),
    
    -- Configuration
    limits JSONB DEFAULT '{}',          -- Enforcement limits (e.g. { "inspections": 100, "users": 5 })
    features JSONB DEFAULT '{}',        -- Boolean features (e.g. { "ai_agents": true, "integrations": true })
    
    -- Visibility & Status
    is_active BOOLEAN DEFAULT true,     -- If false, cannot be purchased
    is_public BOOLEAN DEFAULT true,     -- If true, shows on Landing Page
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS Policies
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active/public plans (Landing Page needs this)
CREATE POLICY "Public read active plans" ON public.plans
    FOR SELECT
    USING (is_active = true AND is_public = true);

-- Authenticated users can read all active plans (Internal Dashboard)
CREATE POLICY "Auth users read active plans" ON public.plans
    FOR SELECT
    USING (is_active = true);

-- SysAdmin can do everything
CREATE POLICY "SysAdmin full access plans" ON public.plans
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('system_admin', 'sys_admin'))
    );

-- 3. Seed Initial Plans (Idempotent)
INSERT INTO public.plans (name, display_name, description, type, price_cents, billing_period, limits, features, is_active, is_public)
VALUES 
('basic', 'Técnico', 'Para profissionais iniciando a digitalização', 'subscription', 19900, 'monthly', '{"inspections_monthly": 10, "users": 1, "storage_gb": 5}', '{"ai_agents": false, "dashboard": false}', true, true),
('pro', 'Inteligente', 'Assistentes IA, análises avançadas e múltiplas unidades', 'subscription', 39700, 'monthly', '{"inspections_monthly": 999999, "users": 5, "storage_gb": 50}', '{"ai_agents": true, "dashboard": true, "ai_multimodal": true}', true, true)
ON CONFLICT (name) DO NOTHING;
