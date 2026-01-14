-- Create AI Usage Logs table
create table if not exists ai_usage_logs (
  id bigint generated always as identity primary key,
  organization_id bigint references organizations(id),
  user_id uuid references auth.users(id),
  feature_type text not null,
  model_used text not null,
  total_tokens integer default 0,
  created_at timestamptz default now()
);

-- Index for performance
create index if not exists idx_ai_logs_org on ai_usage_logs(organization_id);
create index if not exists idx_ai_logs_user on ai_usage_logs(user_id);
create index if not exists idx_ai_logs_date on ai_usage_logs(created_at);

-- RLS
alter table ai_usage_logs enable row level security;

-- System Admin can view all
create policy "System Admin can view all ai logs"
  on ai_usage_logs for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and (users.role = 'system_admin' or users.role = 'sys_admin')
    )
  );

-- Org Admin can view their own org logs
create policy "Org Admin can view own org logs"
  on ai_usage_logs for select
  using (
    organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()
      and is_active = true
      and role = 'org_admin'
    )
  );

-- Insert policy (System functions will bypass RLS via service role usually, but nice to have)
create policy "Users can insert logs"
  on ai_usage_logs for insert
  with check (auth.uid() = user_id);
