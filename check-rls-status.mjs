import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vjlvvmriqerfmztwtewa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbHZ2bXJpcWVyZm16dHd0ZXdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MjYzMCwiZXhwIjoyMDgwNjU4NjMwfQ.ekNa9E9I42taMqG6EFjAJlhdtWaSmBYU6o-KTzIW4RM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkRLSStatus() {
  console.log('🔍 Verificando status das políticas RLS...\n');

  try {
    // Teste 1: Verificar se a função current_user_id() existe
    console.log('1️⃣ Verificando função current_user_id()...');
    const { data: functionCheck, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .eq('proname', 'current_user_id')
      .maybeSingle();

    if (funcError) {
      console.log('   ⚠️ Não foi possível verificar (esperado - tabela pg_proc não acessível via REST)');
    } else if (functionCheck) {
      console.log('   ✅ Função current_user_id() existe!');
    } else {
      console.log('   ❌ Função current_user_id() NÃO encontrada');
    }

    // Teste 2: Verificar se a tabela users existe e é acessível
    console.log('\n2️⃣ Verificando acesso à tabela users...');
    const { data: usersCheck, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (usersError) {
      console.log('   ❌ Erro ao acessar users:', usersError.message);
      console.log('   Código:', usersError.code);
    } else {
      console.log('   ✅ Tabela users acessível! Registros encontrados:', usersCheck?.length || 0);
    }

    // Teste 3: Verificar políticas RLS através da view pg_policies
    console.log('\n3️⃣ Verificando políticas RLS...');
    const { data: policiesCheck, error: policiesError } = await supabase.rpc(
      'exec_sql',
      {
        query: `
          SELECT tablename, policyname
          FROM pg_policies
          WHERE schemaname = 'public'
          AND tablename = 'users'
          ORDER BY policyname
        `
      }
    );

    if (policiesError) {
      console.log('   ⚠️ Não foi possível listar políticas via RPC:', policiesError.message);
      console.log('   (Esperado - função exec_sql não existe no Supabase)');
    } else {
      console.log('   ✅ Políticas encontradas:');
      policiesCheck?.forEach(p => console.log(`      - ${p.policyname}`));
    }

  } catch (error) {
    console.error('\n💥 Erro inesperado:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMO:');
  console.log('='.repeat(60));
  console.log('A verificação via API REST é limitada.');
  console.log('Para verificar completamente, você precisa:');
  console.log('');
  console.log('1. Acessar: https://supabase.com/dashboard/project/vjlvvmriqerfmztwtewa/sql');
  console.log('2. Executar esta query:');
  console.log('');
  console.log('   SELECT routine_name FROM information_schema.routines');
  console.log('   WHERE routine_schema = \'public\' AND routine_name = \'current_user_id\';');
  console.log('');
  console.log('3. Se retornar vazio, a migration NÃO foi aplicada.');
  console.log('4. Se retornar "current_user_id", a migration FOI aplicada! ✅');
  console.log('='.repeat(60));
}

checkRLSStatus();
