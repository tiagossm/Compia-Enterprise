import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://vjlvvmriqerfmztwtewa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbHZ2bXJpcWVyZm16dHd0ZXdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MjYzMCwiZXhwIjoyMDgwNjU4NjMwfQ.ekNa9E9I42taMqG6EFjAJlhdtWaSmBYU6o-KTzIW4RM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('🔧 Lendo arquivo de migration...');
    const sql = readFileSync('./supabase/migrations/20260129000000_consolidate_rls_policies.sql', 'utf8');

    console.log('📤 Aplicando migration RLS no Supabase...');

    // O Supabase REST API não suporta execução de SQL arbitrário diretamente
    // Vamos usar o endpoint de SQL via rpc
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro ao aplicar migration:', error);
      console.log('\n⚠️  A API REST do Supabase não permite execução direta de DDL.');
      console.log('📋 Você precisa aplicar a migration de uma das seguintes formas:\n');
      console.log('1. Via Supabase Dashboard > SQL Editor:');
      console.log('   - Copie o conteúdo de: supabase/migrations/20260129000000_consolidate_rls_policies.sql');
      console.log('   - Cole no SQL Editor');
      console.log('   - Execute\n');
      console.log('2. Via psql (linha de comando do PostgreSQL):');
      console.log('   psql "postgresql://postgres:[password]@db.vjlvvmriqerfmztwtewa.supabase.co:5432/postgres" -f supabase/migrations/20260129000000_consolidate_rls_policies.sql\n');
      process.exit(1);
    }

    console.log('✅ Migration aplicada com sucesso!');
    console.log('📊 Resultado:', data);

  } catch (err) {
    console.error('💥 Erro inesperado:', err);
    process.exit(1);
  }
}

applyMigration();
