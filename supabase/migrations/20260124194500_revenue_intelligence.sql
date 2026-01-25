-- Migration: Create Revenue Intelligence Schema
-- Description: Adds Credit Ledger, MRR Function, and User Health Score View
-- Date: 2026-01-24

-- ============================================================================
-- 1. AI Credits Ledger (Imutable Audit Log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_credits_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id BIGINT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    amount INTEGER NOT NULL, -- Positive (Purchase) or Negative (Usage)
    balance_after INTEGER NOT NULL, -- Calculated balance at that moment
    
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'monthly_grant', 'usage', 'bonus', 'expiration', 'correction')),
    description TEXT,
    
    -- Audit Metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- { "invoice_id": "...", "user_id": "..." }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast balance calculation
CREATE INDEX idx_credits_ledger_org ON public.ai_credits_ledger(organization_id, created_at DESC);

-- RLS: Read-only for admins, Insert only via System Functions
ALTER TABLE public.ai_credits_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view ledger" ON public.ai_credits_ledger
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'org_admin')
        )
    );

-- ============================================================================
-- 2. Function: Get Current MRR (SQL-Level Precision)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_mrr()
RETURNS numeric AS $$
DECLARE
    total_mrr numeric;
BEGIN
    SELECT COALESCE(SUM(
      CASE 
        WHEN p.billing_period = 'yearly' THEN s.mrr_value_cents / 12.0 
        ELSE s.mrr_value_cents 
      END
    ), 0) / 100.0
    INTO total_mrr
    FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.status IN ('active', 'past_due'); -- Consider 'past_due' as recognized revenue until cancellation
    
    RETURN total_mrr;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. View: Customer Health Score (Revenue at Risk Engine)
-- ============================================================================
CREATE OR REPLACE VIEW public.customer_health_score AS
WITH usage_summary AS (
    -- Aggregate usage from last 14 days
    SELECT 
        org.id as organization_id,
        org.name as org_name,
        
        -- Logic 1: Logins (Activity)
        (
            SELECT COUNT(*) 
            FROM auth.sessions s
            JOIN public.users u ON u.id = s.user_id
            WHERE u.managed_organization_id = org.id
            AND s.created_at >= NOW() - INTERVAL '14 days'
        ) as login_count,
        
        -- Logic 2: Checklists (Core Value)
        (
            SELECT COUNT(*) 
            FROM public.inspections i
            WHERE i.organization_id = org.id
            AND i.created_at >= NOW() - INTERVAL '14 days'
        ) as inspection_count,
        
        -- Logic 3: AI Usage (Premium Value)
        COALESCE(org.ai_usage_count, 0) as ai_usage_count,
        
        -- Subscription Info for Revenue at Risk
        s.mrr_value_cents,
        s.status as sub_status
        
    FROM public.organizations org
    LEFT JOIN public.subscriptions s ON s.organization_id = org.id AND s.status = 'active'
    WHERE org.id IN (SELECT organization_id FROM public.subscriptions WHERE status = 'active') -- Only paying customers
)
SELECT 
    organization_id,
    org_name,
    mrr_value_cents,
    login_count,
    inspection_count,
    ai_usage_count,
    
    -- Health Formula: (Logins * 5) + (Inspections * 2) + (AI * 0.5)
    -- Normalized to 0-100 (Capped)
    LEAST(
        ROUND(
            (login_count * 5.0) + 
            (inspection_count * 2.0) + 
            (ai_usage_count * 0.5)
        ), 
    100) as health_score,
    
    -- Risk Flag
    CASE 
        WHEN LEAST(ROUND((login_count * 5.0) + (inspection_count * 2.0) + (ai_usage_count * 0.5)), 100) < 30 THEN true
        ELSE false 
    END as is_at_risk,
    
    NOW() as calculated_at
FROM usage_summary;

-- Grant access
GRANT SELECT ON public.customer_health_score TO authenticated;
