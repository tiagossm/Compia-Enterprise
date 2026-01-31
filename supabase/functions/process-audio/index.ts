
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
Abaixo estão os itens que precisam ser verificados nesta inspeção. Use estes IDs para mapear suas respostas.
${JSON.stringify(simplifiedItems, null, 2)}

INSTRUÇÃO IMPORTANTE:
Para cada item do checklist mencionado ou implícito no áudio, determine:
1. Status: "C" (Conforme), "NC" (Não Conforme) ou "NA" (Não Aplicável).
2. Observação: Transcreva a justificativa técnica dita no áudio.
Se o áudio não mencionar um item, ignore-o (não invente).
`;
            } catch (e) {
                console.error('Error parsing items context:', e);
            }
        }

        // Call Gemini Flash API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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
