-- Create Leads table for CRM
create table if not exists leads (
  id bigint generated always as identity primary key,
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  source text, -- 'inbound', 'outbound', 'referral', etc
  owner_id uuid references auth.users(id), -- Quem é o dono do lead (sales rep)
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_owner on leads(owner_id);

-- RLS
alter table leads enable row level security;

-- Only System Admins and Sales (if we had that role) can access leads
-- For now, System Admin only
create policy "System Admin can manage leads"
  on leads for all
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and (users.role = 'system_admin' or users.role = 'sys_admin')
    )
  );
