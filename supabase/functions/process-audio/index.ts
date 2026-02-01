
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-organization-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set');
        }

        // Prepare to read multipart form data
        const contentType = req.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            throw new Error('Content-Type must be multipart/form-data');
        }

        const formData = await req.formData();
        const audioFile = formData.get('file');
        const itemsJson = formData.get('items'); // Context: List of inspection items

        if (!audioFile || !(audioFile instanceof File)) {
            throw new Error('No audio file uploaded');
        }

        // Convert audio to base64
        const arrayBuffer = await audioFile.arrayBuffer();
        const base64Audio = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Prepare Context Prompt
        let contextPrompt = '';
        if (itemsJson && typeof itemsJson === 'string') {
            try {
                const items = JSON.parse(itemsJson);
                const simplifiedItems = items.map((i: any) => ({
                    id: i.id,
                    title: i.title,
                    description: i.description || ''
                }));
                contextPrompt = `
CONTEXTO DO CHECKLIST:
Abaixo estão os itens/campos do formulário de inspeção. Use o "id" de cada item para mapear suas respostas.
${JSON.stringify(simplifiedItems, null, 2)}

REGRAS OBRIGATÓRIAS:
1. Se o áudio menciona um NOME DE PESSOA (ex: "Antônio", "Maria", "João"):
   - Procure um item com título contendo "Nome", "Funcionário", "Responsável", "Inspetor"
   - Retorne: { "item_id": <id_do_item>, "status": "C", "observation": "<nome_mencionado>" }

2. Se o áudio menciona uma DATA ou HORÁRIO:
   - Procure um item com título contendo "Data", "Horário", "Hora"
   - Retorne o valor em observation

3. Se o áudio menciona um LOCAL ou ENDEREÇO:
   - Procure um item com título contendo "Local", "Endereço", "Setor", "Área"
   - Retorne o valor em observation

4. Se o áudio menciona status de itens técnicos (conforme, não conforme, ok, problema):
   - Use status "C", "NC" ou "NA" conforme apropriado
   - Coloque a justificativa em observation

IMPORTANTE:
- SEMPRE gere um update se conseguir identificar informação relevante no áudio
- Use o ID numérico exato do item do checklist
- Não deixe updates vazio se houver informação útil no áudio
`;
            } catch (e) {
                console.error('Error parsing items context:', e);
            }
        }

        // Call Gemini Flash API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [
                            {
                                text: `
Você é um auditor técnico especialista.
Sua tarefa é ouvir o áudio do inspetor em campo e prencher o relatório técnico.

${contextPrompt}

SAÍDA ESPERADA (JSON):
Retorne APENAS um JSON válido com este formato:
{
  "summary": "Resumo geral do que foi dito...",
  "updates": [
    {
      "item_id": 123,
      "status": "NC",
      "observation": "Extintor tipo ABC vencido em jan/2024..."
    }
  ]
}
`
                            },
                            {
                                inlineData: {
                                    mimeType: audioFile.type || 'audio/webm',
                                    data: base64Audio
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.2
                    }
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!resultText) {
            throw new Error('Gemini returned empty response');
        }

        // Parse JSON response
        let parsedResult;
        try {
            parsedResult = JSON.parse(resultText);
        } catch (e) {
            // Fallback if model returns text outside JSON (rare with responseMimeType, but possible)
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse JSON from AI response');
            }
        }

        return new Response(JSON.stringify(parsedResult), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error processing audio:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
