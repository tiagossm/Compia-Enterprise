-- Migration: Create recurring_schedules table
-- Purpose: Store recurrence rules for automated inspection/event creation

CREATE TABLE IF NOT EXISTS recurring_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Template reference
    checklist_template_id BIGINT REFERENCES checklist_templates(id) ON DELETE SET NULL,
    
    -- Recurrence rule (iCal RRULE format)
    -- Examples: 
    --   "FREQ=WEEKLY;BYDAY=MO" (Every Monday)
    --   "FREQ=MONTHLY;BYMONTHDAY=1" (First day of every month)
    rrule TEXT NOT NULL,
    
    -- Schedule metadata
    title TEXT NOT NULL,
    description TEXT,
    
    -- Assignment
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Event/Inspection defaults
    default_duration_minutes INTEGER DEFAULT 60,
    default_location JSONB, -- { address, lat, lng }
    
    -- Automation settings
    is_active BOOLEAN DEFAULT true,
    advance_days INTEGER DEFAULT 7, -- Create events X days in advance
    last_generated_at TIMESTAMPTZ,
    next_occurrence_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_recurring_schedules_org ON recurring_schedules(organization_id);
CREATE INDEX idx_recurring_schedules_active ON recurring_schedules(is_active) WHERE is_active = true;
CREATE INDEX idx_recurring_schedules_next ON recurring_schedules(next_occurrence_at);

-- RLS Policies
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;

-- Users can view schedules from their organization
CREATE POLICY "Users can view org schedules"
ON recurring_schedules FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
);

-- Only admins can create/update/delete schedules
CREATE POLICY "Admins can manage schedules"
ON recurring_schedules FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_organizations 
        WHERE user_id = auth.uid() 
        AND organization_id = recurring_schedules.organization_id
        AND role IN ('org_admin', 'sys_admin')
    )
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_recurring_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recurring_schedules_updated_at
BEFORE UPDATE ON recurring_schedules
FOR EACH ROW EXECUTE FUNCTION update_recurring_schedules_updated_at();

COMMENT ON TABLE recurring_schedules IS 'Stores recurrence rules for automated inspection/event creation (RRULE format)';
