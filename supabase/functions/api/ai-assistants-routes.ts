import { Hono } from 'hono';
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";


type Env = {
  DB: any;
  OPENAI_API_KEY?: string;
};

type Variables = {
  user: any;
};

const aiAssistantsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get all AI assistants
// Get all AI assistants
aiAssistantsRoutes.get('/', async (c) => {
  try {
    const env = c.env;

    // Check DB availability
    if (!env.DB) {
      console.error('[AI-ASSISTANTS] DB connection not initialized');
      return c.json({
        success: false,
        error: 'Database connection error',
        assistants: [],
        total_count: 0
      }, 500);
    }

    const assistants = await env.DB.prepare(`
      SELECT * FROM ai_assistants 
      WHERE is_active = TRUE 
      ORDER BY created_at DESC
    `).all();

    return c.json({
      success: true,
      assistants: assistants.results || [],
      total_count: (assistants.results || []).length
    });
  } catch (error) {
    console.error('[AI-ASSISTANTS] Error fetching assistants:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    return c.json({
      success: false,
      error: 'Erro ao buscar assistentes de IA',
      details: errorMessage,
      stack: errorStack,
      assistants: [],
      total_count: 0
    }, 500);
  }
});

// Get single AI assistant
aiAssistantsRoutes.get('/:id', async (c) => {
  const env = c.env;
  const assistantId = parseInt(c.req.param('id'));

  try {
    const assistant = await env.DB.prepare(`
      SELECT * FROM ai_assistants 
      WHERE id = ? AND is_active = true
    `).bind(assistantId).first();

    if (!assistant) {
      return c.json({
        success: false,
        error: 'Assistente não encontrado'
      }, 404);
    }

    return c.json({
      success: true,
      assistant
    });
  } catch (error) {
    console.error('Error fetching AI assistant:', error);
    return c.json({
      success: false,
      error: 'Erro ao buscar assistente de IA'
    }, 500);
  }
});

// Create AI assistant (admin only)
aiAssistantsRoutes.post('/', tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  try {
    const body = await c.req.json();
    const { name, description, specialization, instructions } = body;

    if (!name || !specialization || !instructions) {
      return c.json({
        success: false,
        error: 'Nome, especialização e instruções são obrigatórios'
      }, 400);
    }

    const result = await env.DB.prepare(`
      INSERT INTO ai_assistants (
        name, description, specialization, instructions, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `).bind(
      name,
      description || null,
      specialization,
      instructions,
      true
    ).run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      message: 'Assistente de IA criado com sucesso'
    });
  } catch (error) {
    console.error('Error creating AI assistant:', error);
    return c.json({
      success: false,
      error: 'Erro ao criar assistente de IA'
    }, 500);
  }
});

// Update AI assistant (admin only)
aiAssistantsRoutes.put('/:id', tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const user = c.get('user');
  const assistantId = parseInt(c.req.param('id'));

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  try {
    const body = await c.req.json();

    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['name', 'description', 'specialization', 'instructions', 'is_active'];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(body[field]);
      }
    }

    if (updateFields.length === 0) {
      return c.json({
        success: false,
        error: 'Nenhum campo para atualizar'
      }, 400);
    }

    updateFields.push('updated_at = datetime(\'now\')');

    await env.DB.prepare(`
      UPDATE ai_assistants 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `).bind(...updateValues, assistantId).run();

    return c.json({
      success: true,
      message: 'Assistente de IA atualizado com sucesso'
    });
  } catch (error) {
    console.error('Error updating AI assistant:', error);
    return c.json({
      success: false,
      error: 'Erro ao atualizar assistente de IA'
    }, 500);
  }
});

// Seed AI assistants - popula assistentes especialistas
aiAssistantsRoutes.post('/seed', async (c) => {
  const env = c.env;

  try {
    // Verificar se já existem assistentes
    const existing = await env.DB.prepare("SELECT COUNT(*) as count FROM ai_assistants").first() as any;

    if (existing?.count > 0) {
      // Deletar existentes e recriar
      await env.DB.prepare("DELETE FROM ai_assistants").run();
    }

    const aiAssistants = [
      {
        name: 'Especialista NR-35 Altura',
        description: 'Especialista em trabalho em altura, análise de riscos de queda e conformidade com NR-35',
        specialization: 'Trabalho em Altura - NR-35',
        instructions: 'Você é um especialista em segurança para trabalho em altura. Analise evidências focando em: sistemas de ancoragem, EPIs de altura (cinturão, trava-quedas), condições de acesso, sinalização de áreas elevadas, treinamento dos trabalhadores.'
      },
      {
        name: 'Especialista NR-10 Eletricidade',
        description: 'Especialista em instalações elétricas, análise de riscos elétricos e conformidade com NR-10',
        specialization: 'Segurança Elétrica - NR-10',
        instructions: 'Você é um especialista em segurança elétrica. Analise evidências focando em: painéis elétricos, aterramento, bloqueio/etiquetagem, EPIs isolantes, sinalização de risco elétrico, condições de instalações.'
      },
      {
        name: 'Especialista NR-12 Máquinas',
        description: 'Especialista em segurança de máquinas e equipamentos conforme NR-12',
        specialization: 'Máquinas e Equipamentos - NR-12',
        instructions: 'Você é um especialista em segurança de máquinas. Analise evidências focando em: proteções físicas, sistemas de parada de emergência, sinalização de pontos de risco, condições de manutenção, procedimentos operacionais.'
      },
      {
        name: 'Especialista EPIs',
        description: 'Especialista em Equipamentos de Proteção Individual e conformidade com NR-6',
        specialization: 'EPIs - NR-6',
        instructions: 'Você é um especialista em EPIs. Analise evidências focando em: uso correto de EPIs, condição de conservação, adequação ao risco, CA válido, armazenamento, treinamento de uso.'
      },
      {
        name: 'Especialista Ergonomia',
        description: 'Especialista em ergonomia e análise de postos de trabalho conforme NR-17',
        specialization: 'Ergonomia - NR-17',
        instructions: 'Você é um especialista em ergonomia. Analise evidências focando em: posturas de trabalho, mobiliário, iluminação, organização do posto de trabalho, movimentos repetitivos, levantamento de cargas.'
      },
      {
        name: 'Especialista Incêndio',
        description: 'Especialista em prevenção e combate a incêndio conforme NR-23',
        specialization: 'Prevenção de Incêndio - NR-23',
        instructions: 'Você é um especialista em segurança contra incêndio. Analise evidências focando em: extintores, sinalização de emergência, rotas de fuga, hidrantes, brigada de incêndio, materiais inflamáveis.'
      },
      {
        name: 'Especialista Riscos Psicossociais',
        description: 'Especialista em identificação de fatores de risco psicossocial no ambiente de trabalho e geração de planos de ação preventivos',
        specialization: 'Riscos Psicossociais Ocupacionais',
        instructions: `Você é um especialista em Segurança e Saúde do Trabalho focado em RISCOS PSICOSSOCIAIS OCUPACIONAIS.

SEU PAPEL: Identificar fatores de risco psicossocial no AMBIENTE DE TRABALHO e gerar AÇÕES PREVENTIVAS/CORRETIVAS. NÃO faça diagnósticos clínicos.

FATORES DE RISCO A ANALISAR:
1. ORGANIZAÇÃO: Sobrecarga, ritmo excessivo, metas inatingíveis
2. RELAÇÕES: Conflitos, assédio moral, falta de suporte
3. CONTEÚDO: Monotonia, falta de autonomia, baixo reconhecimento
4. AMBIENTE: Ruído, temperatura, iluminação
5. TRABALHO-VIDA: Dificuldade de conciliação

ANÁLISE DE ÁUDIO: Tom de voz, hesitações, palavras-chave de estresse.

GERE AÇÕES 5W2H: Reorganização de processos, treinamentos, canais de escuta.`
      }
    ];

    for (const assistant of aiAssistants) {
      await env.DB.prepare(`
        INSERT INTO ai_assistants (name, description, specialization, instructions, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, true, NOW(), NOW())
      `).bind(assistant.name, assistant.description, assistant.specialization, assistant.instructions).run();
    }

    return c.json({
      success: true,
      message: `${aiAssistants.length} assistentes de IA criados com sucesso`,
      count: aiAssistants.length
    });
  } catch (error) {
    console.error('Error seeding AI assistants:', error);
    return c.json({
      success: false,
      error: 'Erro ao popular assistentes de IA'
    }, 500);
  }
});

export default aiAssistantsRoutes;


