import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-organization-id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ATARequest {
    ata_id: number;
    inspection_id: number;
    inspection_context: {
        items: Array<{ id: number; title: string; description?: string }>;
        info: {
            project_name?: string;
            location?: string;
            inspector_name?: string;
            scheduled_date?: string;
        };
    };
}

interface ATAResult {
    transcript: string;
    summary: string;
    identified_items: Array<{
        item_id: number;
        /** Optional: helps validate mapping */
        item_title?: string;
        status: 'C' | 'NC' | 'NA';
        observation: string;
        /** Optional: model confidence (0-1) */
        confidence?: number;
    }>;
    non_conformities: Array<{
        title: string;
        description: string;
        suggested_action: string;
        suggested_deadline: string;
    }>;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set');
        }
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Supabase credentials not configured');
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const body: ATARequest = await req.json();
        const { ata_id, inspection_id, inspection_context } = body;

        if (!ata_id) {
            throw new Error('ata_id is required');
        }

        // Update ATA status to processing
        await supabase
            .from('inspection_atas')
            .update({ status: 'processing' })
            .eq('id', ata_id);

        // Fetch all audio segments for this ATA
        const { data: segments, error: segmentsError } = await supabase
            .from('inspection_ata_segments')
            .select('*')
            .eq('ata_id', ata_id)
            .eq('uploaded', true)
            .order('segment_number', { ascending: true });

        if (segmentsError) {
            throw new Error(`Failed to fetch segments: ${segmentsError.message}`);
        }

        if (!segments || segments.length === 0) {
            throw new Error('No audio segments found for this ATA');
        }

        // Download and concatenate audio files
        const audioBuffers: Uint8Array[] = [];
        let totalDuration = 0;

        for (const segment of segments) {
            if (segment.audio_url) {
                // Download audio from storage
                const { data: audioData, error: downloadError } = await supabase
                    .storage
                    .from('ata-audio')
                    .download(segment.audio_url.replace(/^.*\/ata-audio\//, ''));

                if (downloadError) {
                    console.error(`Failed to download segment ${segment.segment_number}:`, downloadError);
                    continue;
                }

                const buffer = new Uint8Array(await audioData.arrayBuffer());
                audioBuffers.push(buffer);
                totalDuration += segment.duration_seconds || 0;
            }
        }

        if (audioBuffers.length === 0) {
            throw new Error('Could not download any audio segments');
        }

        // Concatenate all audio into single buffer
        const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.length, 0);
        const combinedAudio = new Uint8Array(totalLength);
        let offset = 0;
        for (const buffer of audioBuffers) {
            combinedAudio.set(buffer, offset);
            offset += buffer.length;
        }

        // Convert to base64 for Gemini
        const base64Audio = btoa(
            combinedAudio.reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Prepare context for ATA generation
        const contextInfo = inspection_context?.info || {};
        const checklistItems = inspection_context?.items || [];

        const prompt = `
Você é um assistente especializado em gerar Atas de Inspeção técnica.
Sua tarefa é transcrever o áudio e gerar um documento formal de ATA.

INFORMAÇÕES DA INSPEÇÃO:
- Projeto: ${contextInfo.project_name || 'Não informado'}
- Local: ${contextInfo.location || 'Não informado'}
- Inspetor: ${contextInfo.inspector_name || 'Não informado'}
- Data: ${contextInfo.scheduled_date || new Date().toLocaleDateString('pt-BR')}
- Duração do áudio: ${Math.floor(totalDuration / 60)}min ${totalDuration % 60}s

ITENS DO CHECKLIST (para referência):
${JSON.stringify(checklistItems.slice(0, 50), null, 2)}

INSTRUÇÕES:

1. **TRANSCRIÇÃO**: Transcreva TODO o áudio com timestamps no formato [MM:SS].
   - Mantenha a fala original do inspetor
   - Adicione timestamps a cada mudança de assunto ou pausa significativa

2. **RESUMO EXECUTIVO**: Gere um resumo de 2-3 parágrafos sobre:
   - O que foi inspecionado
   - Principais conclusões
   - Número de conformidades e não conformidades identificadas

3. **ITENS IDENTIFICADOS**: Para cada item do checklist mencionado no áudio:
   - Associe ao **item_id correto, escolhendo SOMENTE entre os IDs presentes em ITENS DO CHECKLIST**
   - Inclua também o **item_title** exatamente como no checklist (para auditoria)
   - Determine o status: "C" (Conforme), "NC" (Não Conforme), "NA" (Não Aplicável)
   - Inclua a observação do inspetor
   - Inclua confidence (0 a 1). Se confidence < 0.75, evite marcar como NC sem deixar claro na observação

4. **NÃO CONFORMIDADES**: Liste cada não conformidade com:
   - Título descritivo
   - Descrição do problema
   - Ação sugerida
   - Prazo sugerido (ex: "48 horas", "7 dias", "30 dias")

FORMATO DE SAÍDA (JSON):
{
  "transcript": "[00:00] Início da inspeção...\n[00:45] Verificando extintor...\n...",
  "summary": "Resumo executivo da inspeção...",
  "identified_items": [
    { "item_id": 123, "item_title": "<título do item no checklist>", "status": "NC", "observation": "Extintor vencido", "confidence": 0.9 }
  ],
  "non_conformities": [
    {
      "title": "Extintor Vencido",
      "description": "Extintor do corredor A com validade expirada em janeiro/2024",
      "suggested_action": "Substituição imediata do equipamento",
      "suggested_deadline": "48 horas"
    }
  ]
}

Retorne APENAS o JSON válido, sem texto adicional.
`;

        // Call Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [
                            { text: prompt },
                            {
                                inlineData: {
                                    mimeType: 'audio/webm',
                                    data: base64Audio
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.3
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API Error: ${geminiResponse.status} - ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!resultText) {
            throw new Error('Gemini returned empty response');
        }

        // Parse the result
        let ataResult: ATAResult;
        try {
            ataResult = JSON.parse(resultText);
        } catch (e) {
            // Try to extract JSON from response
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                ataResult = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Failed to parse ATA result from AI response');
            }
        }

        // Validate + sanitize identified items so we never store invalid ids.
        const allowedItems = checklistItems;
        const allowedIdSet = new Set<number>(allowedItems.map(i => i.id));
        const allowedTitleById = new Map<number, string>(allowedItems.map(i => [i.id, i.title]));

        const normalize = (s: string) =>
            (s || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .replace(/\s+/g, ' ')
                .trim();

        const findBestIdByTitle = (title?: string): number | null => {
            if (!title) return null;
            const t = normalize(title);
            if (!t) return null;

            // exact match
            for (const item of allowedItems) {
                if (normalize(item.title) === t) return item.id;
            }
            // contains match (best-effort)
            for (const item of allowedItems) {
                const it = normalize(item.title);
                if (it && (it.includes(t) || t.includes(it))) return item.id;
            }
            return null;
        };

        const sanitizedIdentified = (ataResult.identified_items || [])
            .map((it) => {
                let item_id = Number(it.item_id);
                if (!allowedIdSet.has(item_id)) {
                    const mapped = findBestIdByTitle(it.item_title);
                    if (mapped !== null) item_id = mapped;
                }
                if (!allowedIdSet.has(item_id)) return null;

                return {
                    item_id,
                    status: it.status,
                    observation: it.observation,
                    item_title: it.item_title || allowedTitleById.get(item_id) || undefined,
                    confidence: typeof it.confidence === 'number' ? it.confidence : undefined
                };
            })
            .filter(Boolean);

        // Update ATA in database
        const { error: updateError } = await supabase
            .from('inspection_atas')
            .update({
                status: 'draft',
                transcript: ataResult.transcript,
                summary: ataResult.summary,
                identified_items: sanitizedIdentified,
                total_duration_seconds: totalDuration,
                updated_at: new Date().toISOString()
            })
            .eq('id', ata_id);

        if (updateError) {
            throw new Error(`Failed to update ATA: ${updateError.message}`);
        }

        return new Response(
            JSON.stringify({
                success: true,
                ata_id,
                transcript: ataResult.transcript,
                summary: ataResult.summary,
                identified_items: ataResult.identified_items,
                non_conformities: ataResult.non_conformities
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Error generating ATA:', error);

        // Try to update ATA status to draft with error
        try {
            const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
            const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
            if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
                const body = await req.clone().json().catch(() => ({}));
                if (body.ata_id) {
                    await supabase
                        .from('inspection_atas')
                        .update({ status: 'draft' })
                        .eq('id', body.ata_id);
                }
            }
        } catch (e) {
            console.error('Failed to reset ATA status:', e);
        }

        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
