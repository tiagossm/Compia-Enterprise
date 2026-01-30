-- Migration: Ensure Plans Table Exists (Idempotent)
-- Description: Esta migration garante que a tabela plans existe mas NÃO recria se já existir
-- Note: A definição primária está em 20260122000160_create_financial_schema.sql

DO $$
BEGIN
    -- Verifica se tabela existe e adiciona colunas faltantes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
        -- Adicionar addon_config se faltando
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'addon_config') THEN
            ALTER TABLE public.plans ADD COLUMN addon_config JSONB DEFAULT '{}';
        END IF;

        -- Adicionar type se faltando
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'type') THEN
            ALTER TABLE public.plans ADD COLUMN type TEXT NOT NULL DEFAULT 'subscription' CHECK (type IN ('subscription', 'addon', 'one_time'));
        END IF;

        RAISE NOTICE 'Tabela plans já existe, colunas verificadas';
    ELSE
        RAISE NOTICE 'Tabela plans ainda não existe - será criada por financial_schema migration';
    END IF;
END $$;

-- Seed plans (idempotente)
INSERT INTO public.plans (name, display_name, description, type, price_cents, billing_period, limits, features, is_active, is_public)
VALUES
('basic', 'Técnico', 'Para profissionais iniciando a digitalização', 'subscription', 19900, 'monthly',
 '{"inspections_monthly": 10, "users": 1, "storage_gb": 5}',
 '{"ai_agents": false, "dashboard": false}', true, true),

('pro', 'Inteligente', 'Assistentes IA, análises avançadas e múltiplas unidades', 'subscription', 39700, 'monthly',
 '{"inspections_monthly": 999999, "users": 5, "storage_gb": 50}',
 '{"ai_agents": true, "dashboard": true, "ai_multimodal": true}', true, true)

ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    limits = EXCLUDED.limits,
    features = EXCLUDED.features,
    updated_at = NOW();
