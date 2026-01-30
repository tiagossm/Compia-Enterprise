import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vjlvvmriqerfmztwtewa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbHZ2bXJpcWVyZm16dHd0ZXdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MjYzMCwiZXhwIjoyMDgwNjU4NjMwfQ.ekNa9E9I42taMqG6EFjAJlhdtWaSmBYU6o-KTzIW4RM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkRLSPolicies() {
  console.log('🔍 Verificando políticas RLS das tabelas de checklist...\\n');

  try {
    // 1. Verificar se as tabelas existem com SERVICE_ROLE (bypassa RLS)
    console.log('1️⃣ Verificando se tabelas existem (SERVICE_ROLE - bypassa RLS):');

    const { count: foldersCount, error: foldersError } = await supabase
      .from('checklist_folders')
      .select('*', { count: 'exact', head: true });

    if (foldersError) {
      console.log(`   ❌ checklist_folders: ${foldersError.message}`);
    } else {
      console.log(`   ✅ checklist_folders: ${foldersCount} registros`);
    }

    const { count: templatesCount, error: templatesError } = await supabase
      .from('checklist_templates')
      .select('*', { count: 'exact', head: true });

    if (templatesError) {
      console.log(`   ❌ checklist_templates: ${templatesError.message}`);
    } else {
      console.log(`   ✅ checklist_templates: ${templatesCount} registros`);
    }

    // 2. Teste com token de usuário autenticado (eng.tiagosm@gmail.com - sys_admin)
    console.log('\\n2️⃣ Testando acesso COM autenticação (como o frontend faz):');
    const USER_JWT = 'eyJhbGciOiJIUzI1NiIsImtpZCI6Im9JM0o4eFNRVklNM3BrYTQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3ZqbHZ2bXJpcWVyZm16dHd0ZXdhLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlNGI4Zjg1NC1hNjUzLTRkNDYtYTUxOC1lZWM4YzAwODAwMTIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY5NzMzMDU2LCJpYXQiOjE3Njk3Mjk0NTYsImVtYWlsIjoiZW5nLnRpYWdvc21AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnb29nbGUiLCJwcm92aWRlcnMiOlsiZ29vZ2xlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NLcU1kY1pObU1vYWxIN2xDVHJDcnYyS25HNktGMXE0em8tdGQ4WGdBTjNMNVZtR0dPWlJnPXM5Ni1jIiwiZW1haWwiOiJlbmcudGlhZ29zbUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoiVGlhZ28gZG9zIFNhbnRvcyBNYXJ0aW5zIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6IlRpYWdvIGRvcyBTYW50b3MgTWFydGlucyIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0txTWRjWk5tTW9hbEg3bENUckNydjJLbkc2S0YxcTR6by10ZDhYZ0FOM0w1Vm1HR09aUmc9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwOTM4MjEzNTg2OTI1NDY0ODIxMyIsInN1YiI6IjEwOTM4MjEzNTg2OTI1NDY0ODIxMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzY5NzI5NDU2fV0sInNlc3Npb25faWQiOiI5MTQxMzkxMi0yZDNmLTQ0OGEtOTk1Zi03ZWVhOTA4ZmUzMDkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.cXmySJP0KiV9NTTFh_B21I0B_Ev612lFvHK61OqMX7A';

    const supabaseUser = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsImtpZCI6Im9JM0o4eFNRVklNM3BrYTQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3ZqbHZ2bXJpcWVyZm16dHd0ZXdhLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlNGI4Zjg1NC1hNjUzLTRkNDYtYTUxOC1lZWM4YzAwODAwMTIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY5NzMzMDU2LCJpYXQiOjE3Njk3Mjk0NTYsImVtYWlsIjoiZW5nLnRpYWdvc21AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnb29nbGUiLCJwcm92aWRlcnMiOlsiZ29vZ2xlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NLcU1kY1pObU1vYWxIN2xDVHJDcnYyS25HNktGMXE0em8tdGQ4WGdBTjNMNVZtR0dPWlJnPXM5Ni1jIiwiZW1haWwiOiJlbmcudGlhZ29zbUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoiVGlhZ28gZG9zIFNhbnRvcyBNYXJ0aW5zIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6IlRpYWdvIGRvcyBTYW50b3MgTWFydGlucyIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0txTWRjWk5tTW9hbEg3bENUckNydjJLbkc2S0YxcTR6by10ZDhYZ0FOM0w1Vm1HR09aUmc9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwOTM4MjEzNTg2OTI1NDY0ODIxMyIsInN1YiI6IjEwOTM4MjEzNTg2OTI1NDY0ODIxMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzY5NzI5NDU2fV0sInNlc3Npb25faWQiOiI5MTQxMzkxMi0yZDNmLTQ0OGEtOTk1Zi03ZWVhOTA4ZmUzMDkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.cXmySJP0KiV9NTTFh_B21I0B_Ev612lFvHK61OqMX7A', {
      global: { headers: { Authorization: `Bearer ${USER_JWT}` } }
    });

    const { data: userFolders, error: userFoldersError } = await supabaseUser
      .from('checklist_folders')
      .select('*')
      .limit(5);

    if (userFoldersError) {
      console.log('   ❌ RLS BLOQUEANDO acesso do usuário autenticado!');
      console.log(`      Erro: ${userFoldersError.message}`);
      console.log(`      Código: ${userFoldersError.code}`);
      console.log(`      Hint: ${userFoldersError.hint || 'N/A'}`);
      console.log('\\n   🚨 CAUSA RAIZ: Políticas RLS estão bloqueando o sys_admin!');
      console.log('   💡 SOLUÇÃO: Precisa criar/atualizar políticas RLS para checklist_folders');
    } else {
      console.log(`   ✅ Acesso permitido - retornou ${userFolders?.length || 0} pastas`);
    }

    const { data: userTemplates, error: userTemplatesError } = await supabaseUser
      .from('checklist_templates')
      .select('*')
      .limit(5);

    if (userTemplatesError) {
      console.log('\\n   ❌ RLS BLOQUEANDO checklist_templates também!');
      console.log(`      Erro: ${userTemplatesError.message}`);
    } else {
      console.log(`\\n   ✅ checklist_templates: ${userTemplates?.length || 0} templates`);
    }

  } catch (error) {
    console.error('\\n💥 Erro inesperado:', error.message);
  }
}

checkRLSPolicies();
