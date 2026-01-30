import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vjlvvmriqerfmztwtewa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbHZ2bXJpcWVyZm16dHd0ZXdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODI2MzAsImV4cCI6MjA4MDY1ODYzMH0.ZdjJp5o6MR2fF-EIc04BGAE6C_iGlJNtLIaMhKk47A8';

console.log('🧪 Testando Edge Function RLS...\n');

// Teste 1: Sem autenticação (deve falhar)
console.log('1️⃣ Teste sem autenticação...');
try {
  const response1 = await fetch(`${SUPABASE_URL}/functions/v1/api/test/rls-context`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const result1 = await response1.json();
  console.log('   Status:', response1.status);
  console.log('   Resposta:', JSON.stringify(result1, null, 2));
} catch (error) {
  console.log('   ❌ Erro:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('⚠️ IMPORTANTE:');
console.log('='.repeat(60));
console.log('Este endpoint requer autenticação.');
console.log('Para testar completamente, você precisa:');
console.log('');
console.log('1. Fazer login na aplicação');
console.log('2. Abrir o DevTools (F12)');
console.log('3. Executar no Console:');
console.log('');
console.log('   fetch("/api/test/rls-context")');
console.log('     .then(r => r.json())');
console.log('     .then(console.log)');
console.log('');
console.log('OU testar diretamente:');
console.log(`${SUPABASE_URL}/functions/v1/api/test/rls-context`);
console.log('='.repeat(60));
