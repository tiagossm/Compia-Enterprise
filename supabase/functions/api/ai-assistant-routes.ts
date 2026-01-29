import { Hono } from 'hono';
import { tenantAuthMiddleware } from './tenant-auth-middleware.ts';
import { incrementAiUsage } from './ai-usage-tracker.ts';

const aiAssistant = new Hono<{ Bindings: Env; Variables: { user: any } }>()
    .basePath('/api/ai-assistant');

// System context for the AI assistant
const SYSTEM_CONTEXT = `Você é o COMPIA AI, o assistente inteligente do sistema COMPIA - uma plataforma de gestão de inspeções de segurança do trabalho.

SUAS PRINCIPAIS FUNÇÕES:
1. Converter dados de texto em formato CSV para importação de checklists
2. Responder dúvidas sobre como usar o sistema COMPIA
3. Ajudar com análise de conformidade e boas práticas

SOBRE O SISTEMA COMPIA:
- Sistema de gestão de inspeções de segurança do trabalho
- Permite criar inspeções com checklists personalizados
- Suporta análise de conformidade (Conforme, Não Conforme, N/A)
- Integra IA para análise de fotos e áudios
- Gera relatórios em PDF
- Suporta múltiplas organizações e usuários

FORMATO CSV PARA CHECKLISTS (MUITO IMPORTANTE):
A primeira linha DEVE ser o cabeçalho: campo,tipo,obrigatorio,opcoes
Exemplo completo:
\`\`\`csv
campo,tipo,obrigatorio,opcoes
Nome do Funcionário,text,true,
Data da Inspeção,date,true,
EPIs Adequados,boolean,true,
Condição do Extintor,select,true,Bom|Regular|Ruim
Nível de Risco,rating,false,
\`\`\`

TIPOS DE CAMPO DISPONÍVEIS:
- text: Texto Curto (nome, identificador)
- textarea: Texto Longo (observações detalhadas)
- boolean: Conforme/Não Conforme (Sim ou Não)
- number: Número
- date: Data
- time: Hora
- select: Lista Suspensa (requer opções separadas por |)
- radio: Escolha Única (requer opções separadas por |)
- multiselect: Múltipla Escolha (requer opções separadas por |)
- checkbox: Caixa de Seleção
- rating: Avaliação (1-5)
- file: Upload de Arquivo

REGRAS DE FORMATO:
1. Colunas: campo,tipo,obrigatorio,opcoes (exatamente nesta ordem)
2. Obrigatório: use "true" ou "false" (sem aspas no CSV)
3. Opções: apenas para select, radio ou multiselect - separe com pipe (|). Ex: "Bom|Regular|Ruim"
4. Campos sem opções: deixe a coluna opcoes vazia

COMO IMPORTAR CHECKLIST:
1. Vá para Checklists > Templates
2. Clique no template desejado
3. Clique em "Importar CSV"
4. Cole ou carregue o arquivo CSV
5. Confirme a importação

ANÁLISE DE CONFORMIDADE:
- Boolean: Sim = Conforme, Não = Não Conforme (automático)
- Rating: ≥4 = Conforme (automático)
- Text/Arquivo: Manual (inspetor avalia)
- Date/Time: Não se aplica

Sempre responda em português do Brasil de forma clara e objetiva.
Se o usuário pedir para converter dados, SEMPRE gere o CSV completo no formato correto com o cabeçalho "campo,tipo,obrigatorio,opcoes".
`;

aiAssistant.post('/chat', tenantAuthMiddleware, async (c) => {
    const env = c.env;
    const user = c.get('user');

    if (!user) {
        return c.json({ error: 'Usuário não autenticado' }, 401);
    }

    try {
        const { message, history = [] } = await c.req.json();

        if (!message || typeof message !== 'string') {
            return c.json({ error: 'Mensagem inválida' }, 400);
        }

        const openaiApiKey = env.OPENAI_API_KEY || Deno.env.get('OPENAI_API_KEY');
        if (!openaiApiKey) {
            return c.json({ error: 'OpenAI API key não configurada' }, 500);
        }

        // Build messages array
        const messages = [
            { role: 'system', content: SYSTEM_CONTEXT },
            ...history.slice(-8).map((m: any) => ({
                role: m.role,
                content: m.content
            })),
            { role: 'user', content: message }
        ];

        // Call OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages,
                max_tokens: 1500,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI error:', errorData);
            return c.json({ error: 'Erro ao processar mensagem' }, 500);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua solicitação.';

        // Generate contextual suggestions based on the message
        const suggestions = generateSuggestions(message, reply);

        // Track usage
        try {
            const userId = user.id || (user as any).sub;
            await incrementAiUsage(env.DB, userId, 'ai-assistant-chat', 'gpt-4o-mini');
        } catch (err) {
            console.error('[AI-ASSISTANT] Failed to track usage:', err);
        }

        return c.json({
            reply,
            suggestions,
        });
    } catch (error) {
        console.error('AI Assistant error:', error);
        return c.json({ error: 'Erro interno do servidor' }, 500);
    }
});

function generateSuggestions(userMessage: string, aiReply: string): string[] {
    const suggestions: string[] = [];
    const lowerMessage = userMessage.toLowerCase();
    const lowerReply = aiReply.toLowerCase();

    // CSV-related suggestions
    if (lowerReply.includes('csv') || lowerReply.includes('field_name')) {
        suggestions.push('Como importo esse CSV?');
        suggestions.push('Adicionar mais campos');
    }

    // Inspection-related suggestions
    if (lowerMessage.includes('inspeção') || lowerMessage.includes('inspecao')) {
        suggestions.push('Como adicionar fotos?');
        suggestions.push('O que é análise de conformidade?');
    }

    // Checklist-related suggestions
    if (lowerMessage.includes('checklist') || lowerMessage.includes('template')) {
        suggestions.push('Tipos de campo disponíveis');
        suggestions.push('Como duplicar um template?');
    }

    // Conformidade suggestions
    if (lowerMessage.includes('conformidade') || lowerMessage.includes('conforme')) {
        suggestions.push('Como funciona o cálculo automático?');
        suggestions.push('Posso desativar a conformidade?');
    }

    // Limit to 3 suggestions
    return suggestions.slice(0, 3);
}

export default aiAssistant;
