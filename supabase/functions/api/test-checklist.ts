
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

console.log("Testing AI Checklist Generation...");

try {
    const response = await fetch("https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/checklist-templates/generate-ai-simple", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
            industry: "Construção",
            location_type: "Canteiro",
            template_name: "Teste AI",
            category: "Segurança",
            num_questions: 5,
            detail_level: "basico",
            regulation: "NR-18"
        })
    });

    const status = response.status;
    const text = await response.text();

    console.log(`Status: ${status}`);
    console.log(`Response: ${text.substring(0, 500)}...`);

} catch (error) {
    console.error("Error:", error);
}
