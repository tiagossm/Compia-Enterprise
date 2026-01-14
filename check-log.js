
const https = require('https');

const url = "https://vjlvvmriqerfmztwtewa.supabase.co/rest/v1/ai_usage_log?select=model_used,created_at&order=created_at.desc&limit=1";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; // SEGURANÇA: Chave removida. Use variáveis de ambiente.

const options = {
    headers: {
        "apikey": key,
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json"
    }
};

console.log("Fetching last log...");

https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.length > 0) {
                console.log("\n✅ LAST LOG FOUND:");
                console.log("Model Used:", json[0].model_used);
                console.log("Time:", json[0].created_at);
            } else {
                console.log("No logs found.");
            }
        } catch (e) {
            console.log("Error parsing JSON:", data);
        }
    });
}).on("error", (err) => {
    console.log("Error: " + err.message);
});
