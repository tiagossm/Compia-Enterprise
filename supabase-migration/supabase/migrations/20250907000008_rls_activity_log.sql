-- Enable RLS on activity_log (already enabled in prev migration, but reinforcing)
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow System Admins to do everything
CREATE POLICY "System Admins can do everything on activity_log" ON activity_log
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('sys_admin', 'system_admin')
    )
  );

-- Allow Org Admins to view logs for their organization
CREATE POLICY "Org Admins can view activity_log for their organization" ON activity_log
  FOR SELECT
  USING (
    organization_id IN (
        SELECT organization_id FROM users
        WHERE users.id = auth.uid()
        AND users.role IN ('org_admin', 'organization_admin')
    )
  );

-- Allow Users to view their own logs (optional, maybe distinct from audit trail requirements)
CREATE POLICY "Users can view their own activity logs" ON activity_log
  FOR SELECT
  USING ( user_id = auth.uid() );

-- Allow insertion by authenticated users (if using client-side logging) or Service Role (bypasses RLS)
-- We add this just in case logging happens via Anon key in future
CREATE POLICY "Authenticated users can insert activity_log" ON activity_log
  FOR INSERT
  WITH CHECK ( auth.role() = 'authenticated' );
