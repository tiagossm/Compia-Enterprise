
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

console.log("🔍 Verificando últimos logs de uso de IA...");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas.");
  Deno.exit(1);
}

try {
  const response = await fetch(`${supabaseUrl}/rest/v1/ai_usage_log?select=*&order=created_at.desc&limit=5`, {
    headers: {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
  }

  const data = await response.json();

  if (data.length === 0) {
    console.log("⚠️ Nenhum log encontrado.");
  } else {
    console.log(`✅ ${data.length} logs encontrados. Últimos:`);
    // @ts-ignore
    data.forEach((log: any, index: number) => {
      console.log(`\n--- Log #${index + 1} ---`);
      console.log(`📅 Data: ${new Date(log.created_at).toLocaleString('pt-BR')}`);
      console.log(`🤖 Modelo: ${log.model_used || 'N/A'}`);
      console.log(`💰 Tokens: ${log.tokens_count}`);
      console.log(`🏢 Org ID: ${log.organization_id}`);
    });
  }

} catch (error) {
  console.error("❌ Erro ao buscar logs:", error);
}
