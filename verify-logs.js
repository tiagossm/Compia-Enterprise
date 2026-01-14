
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://vjlvvmriqerfmztwtewa.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔍 Verificando últimos logs de uso de IA...");

// Hardcode key if env var not picked up (security tradeoff for debugging script, but let's try reading .env file manually if needed, or just rely on manual run with env vars)
// For this environment, I'll try to read from .env.local if available or just use the known values if I have them (I saw them in view_file earlier).
// I saw the key in .env.local view earlier.

const fs = require('fs');
const path = require('path');

function getEnvValue(key) {
    if (process.env[key]) return process.env[key];
    try {
        const envPath = path.resolve(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            const match = content.match(new RegExp(`${key}=(.+)`));
            if (match) return match[1].trim();
        }
    } catch (e) { }
    return null;
}

const key = getEnvValue('SUPABASE_SERVICE_ROLE_KEY') || getEnvValue('VITE_SUPABASE_ANON_KEY'); // Service role preferred for admin
// Note: Anon key might not have permission to read ai_usage_log if RLS is strict. 
// But checking the previous view of .env.local, I saw SUPABASE_SERVICE_ROLE_KEY there.

async function check() {
    const serviceKey = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) {
        console.error("❌ SUPABASE_SERVICE_ROLE_KEY não encontrada em .env.local");
        return;
    }

    try {
        console.log("Connecting to:", supabaseUrl);
        const response = await fetch(`${supabaseUrl}/rest/v1/ai_usage_log?select=*&order=created_at.desc&limit=5`, {
            headers: {
                "apikey": serviceKey,
                "Authorization": `Bearer ${serviceKey}`,
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
            data.forEach((log, index) => {
                console.log(`\n--- Log #${index + 1} ---`);
                console.log(`📅 Data: ${new Date(log.created_at).toLocaleString()}`); // removed pt-BR to avoid cleanup if locale missing
                console.log(`🤖 Modelo: ${log.model_used || 'N/A'}`);
                console.log(`💰 Tokens: ${log.tokens_count}`);
                console.log(`🏢 Org ID: ${log.organization_id}`);
            });
        }
    } catch (error) {
        console.error("❌ Erro:", error.message);
    }
}

check();
