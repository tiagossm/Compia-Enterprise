import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vjlvvmriqerfmztwtewa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbHZ2bXJpcWVyZm16dHd0ZXdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MjYzMCwiZXhwIjoyMDgwNjU4NjMwfQ.ekNa9E9I42taMqG6EFjAJlhdtWaSmBYU6o-KTzIW4RM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserProfile() {
  console.log('🔍 Verificando perfis de usuários no banco...\n');

  try {
    // 1. Buscar TODOS os usuários
    console.log('1️⃣ Buscando todos os usuários:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role, organization_id, is_active, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (usersError) {
      console.error('   ❌ Erro ao buscar usuários:', usersError.message);
    } else {
      console.log(`   ✅ Encontrados ${users?.length || 0} usuários:`);
      users?.forEach(user => {
        console.log(`      - ${user.email}`);
        console.log(`        ID: ${user.id}`);
        console.log(`        Nome: ${user.name || '(sem nome)'}`);
        console.log(`        Role: ${user.role || '(sem role)'}`);
        console.log(`        Org ID: ${user.organization_id || '(sem org)'}`);
        console.log(`        Ativo: ${user.is_active ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }

    // 2. Verificar usuário específico (eng.tiagosm@gmail.com)
    console.log('\n2️⃣ Verificando usuário específico (eng.tiagosm@gmail.com):');
    const { data: specificUser, error: specificError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'eng.tiagosm@gmail.com')
      .maybeSingle();

    if (specificError) {
      console.error('   ❌ Erro:', specificError.message);
    } else if (!specificUser) {
      console.log('   ⚠️ Usuário não encontrado no banco!');
      console.log('   Isso significa que o auto-cadastro pode não estar funcionando.');
    } else {
      console.log('   ✅ Usuário encontrado!');
      console.log('   Dados completos:');
      console.log(JSON.stringify(specificUser, null, 2));
    }

    // 3. Verificar tabela organizations
    console.log('\n3️⃣ Verificando organizações:');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, type, is_active')
      .limit(10);

    if (orgsError) {
      console.error('   ❌ Erro ao buscar organizações:', orgsError.message);
    } else {
      console.log(`   ✅ Encontradas ${orgs?.length || 0} organizações:`);
      orgs?.forEach(org => {
        console.log(`      - ${org.name} (ID: ${org.id}, Tipo: ${org.type})`);
      });
    }

    // 4. Verificar user_organizations
    if (specificUser) {
      console.log('\n4️⃣ Verificando relacionamento user_organizations:');
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id, role, is_primary')
        .eq('user_id', specificUser.id);

      if (userOrgsError) {
        console.error('   ❌ Erro:', userOrgsError.message);
      } else if (!userOrgs || userOrgs.length === 0) {
        console.log('   ⚠️ Usuário não está vinculado a nenhuma organização!');
      } else {
        console.log(`   ✅ Encontrados ${userOrgs.length} vínculos:`);
        userOrgs.forEach(uo => {
          console.log(`      - Org ID: ${uo.organization_id}, Role: ${uo.role}, Primary: ${uo.is_primary}`);
        });
      }
    }

    // 5. Testar query RLS (simular frontend)
    console.log('\n5️⃣ Testando acesso com RLS (simulando ANON_KEY):');
    const supabaseAnon = createClient(
      SUPABASE_URL,
      'eyJhbGciOiJIUzI1NiIsImtpZCI6Im9JM0o4eFNRVklNM3BrYTQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3ZqbHZ2bXJpcWVyZm16dHd0ZXdhLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJlNGI4Zjg1NC1hNjUzLTRkNDYtYTUxOC1lZWM4YzAwODAwMTIiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY5NzMzMDU2LCJpYXQiOjE3Njk3Mjk0NTYsImVtYWlsIjoiZW5nLnRpYWdvc21AZ21haWwuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJnb29nbGUiLCJwcm92aWRlcnMiOlsiZ29vZ2xlIl19LCJ1c2VyX21ldGFkYXRhIjp7ImF2YXRhcl91cmwiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NLcU1kY1pObU1vYWxIN2xDVHJDcnYyS25HNktGMXE0em8tdGQ4WGdBTjNMNVZtR0dPWlJnPXM5Ni1jIiwiZW1haWwiOiJlbmcudGlhZ29zbUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZnVsbF9uYW1lIjoiVGlhZ28gZG9zIFNhbnRvcyBNYXJ0aW5zIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6IlRpYWdvIGRvcyBTYW50b3MgTWFydGlucyIsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0txTWRjWk5tTW9hbEg3bENUckNydjJLbkc2S0YxcTR6by10ZDhYZ0FOM0w1Vm1HR09aUmc9czk2LWMiLCJwcm92aWRlcl9pZCI6IjEwOTM4MjEzNTg2OTI1NDY0ODIxMyIsInN1YiI6IjEwOTM4MjEzNTg2OTI1NDY0ODIxMyJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzY5NzI5NDU2fV0sInNlc3Npb25faWQiOiI5MTQxMzkxMi0yZDNmLTQ0OGEtOTk1Zi03ZWVhOTA4ZmUzMDkiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.cXmySJP0KiV9NTTFh_B21I0B_Ev612lFvHK61OqMX7A'
    );

    const { data: rlsTest, error: rlsError } = await supabaseAnon
      .from('users')
      .select('id, email, name, role')
      .eq('id', 'e4b8f854-a653-4d46-a518-eec8c0080012')
      .maybeSingle();

    if (rlsError) {
      console.error('   ❌ RLS bloqueou acesso:', rlsError.message);
      console.log('   Isso pode explicar por que o perfil não carrega!');
    } else if (!rlsTest) {
      console.log('   ⚠️ RLS retornou vazio (políticas muito restritivas?)');
    } else {
      console.log('   ✅ RLS permitiu acesso:');
      console.log(JSON.stringify(rlsTest, null, 2));
    }

  } catch (error) {
    console.error('\n💥 Erro inesperado:', error);
  }
}

checkUserProfile();
