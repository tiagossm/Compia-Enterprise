// OpenAI Assistants Service for NR compliance analysis
import OpenAI from "openai";

// Assistant configurations for different NR standards
export const ASSISTANTS = {
  'NR-01': {
    id: 'asst_nr01',
    name: 'Assistente NR-01',
    description: 'Disposições Gerais e Gerenciamento de Riscos Ocupacionais',
    instructions: `Você é um especialista em NR-01 - Disposições Gerais e Gerenciamento de Riscos Ocupacionais. 
    Analise situações de trabalho e forneça orientações sobre:
    - Programa de Gerenciamento de Riscos (PGR)
    - Inventário de riscos
    - Plano de ação
    - Medidas de prevenção
    - Treinamentos obrigatórios
    Sempre cite os itens específicos da norma e forneça recomendações práticas.`
  },
  'NR-05': {
    id: 'asst_nr05', 
    name: 'Assistente NR-05',
    description: 'Comissão Interna de Prevenção de Acidentes e Assédio (CIPA)',
    instructions: `Você é um especialista em NR-05 - CIPA. Analise e oriente sobre:
    - Dimensionamento da CIPA
    - Processo eleitoral
    - Atribuições e responsabilidades
    - Treinamento de cipeiros
    - Mapa de riscos
    - SIPAT
    Forneça orientações práticas e conformidade normativa.`
  },
  'NR-06': {
    id: 'asst_nr06',
    name: 'Assistente NR-06',
    description: 'Equipamento de Proteção Individual (EPI)',
    instructions: `Você é um especialista em NR-06 - EPIs. Analise e oriente sobre:
    - Seleção adequada de EPIs
    - Certificado de Aprovação (CA)
    - Responsabilidades do empregador e empregado
    - Treinamento e uso correto
    - Guarda e conservação
    - Substituição e higienização
    Forneça recomendações específicas para cada situação.`
  },
  'NR-07': {
    id: 'asst_nr07',
    name: 'Assistente NR-07',
    description: 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)',
    instructions: `Você é um especialista em NR-07 - PCMSO. Analise e oriente sobre:
    - Estruturação do PCMSO
    - Exames médicos obrigatórios
    - ASO (Atestado de Saúde Ocupacional)
    - Periodicidade de exames
    - Relatório analítico
    - Prontuário médico
    Forneça orientações médicas ocupacionais adequadas.`
  },
  'NR-09': {
    id: 'asst_nr09',
    name: 'Assistente NR-09',
    description: 'Avaliação e Controle das Exposições Ocupacionais',
    instructions: `Você é um especialista em NR-09 - Exposições Ocupacionais. Analise e oriente sobre:
    - Agentes físicos, químicos e biológicos
    - Limites de tolerância
    - Medidas de controle
    - Monitoramento de exposição
    - EPCs e EPIs adequados
    - Laudos técnicos
    Forneça análises técnicas detalhadas.`
  },
  'NR-10': {
    id: 'asst_nr10',
    name: 'Assistente NR-10',
    description: 'Segurança em Instalações e Serviços em Eletricidade',
    instructions: `Você é um especialista em NR-10 - Eletricidade. Analise e oriente sobre:
    - Prontuário de instalações elétricas
    - Medidas de controle do risco elétrico
    - Medidas de proteção coletiva e individual
    - Segurança em projetos
    - Procedimentos de trabalho
    - Situação de emergência
    - Qualificação, habilitação e autorização
    Forneça orientações técnicas de segurança elétrica.`
  },
  'NR-11': {
    id: 'asst_nr11',
    name: 'Assistente NR-11',
    description: 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais',
    instructions: `Você é um especialista em NR-11. Analise e oriente sobre:
    - Operação de equipamentos de transporte
    - Movimentação de cargas
    - Armazenamento seguro
    - Capacitação de operadores
    - Sinalização e demarcação
    - Inspeção de equipamentos
    Forneça orientações práticas de segurança.`
  },
  'NR-12': {
    id: 'asst_nr12',
    name: 'Assistente NR-12',
    description: 'Segurança no Trabalho em Máquinas e Equipamentos',
    instructions: `Você é um especialista em NR-12 - Máquinas. Analise e oriente sobre:
    - Proteções de máquinas
    - Dispositivos de segurança
    - Sistemas de segurança
    - Manutenção e inspeção
    - Manual de instruções
    - Capacitação
    - Inventário de máquinas
    Forneça análises técnicas detalhadas de segurança.`
  },
  'NR-15': {
    id: 'asst_nr15',
    name: 'Assistente NR-15',
    description: 'Atividades e Operações Insalubres',
    instructions: `Você é um especialista em NR-15 - Insalubridade. Analise e oriente sobre:
    - Agentes insalubres
    - Limites de tolerância
    - Graus de insalubridade (10%, 20%, 40%)
    - Laudos de insalubridade
    - Medidas de eliminação ou neutralização
    - Adicional de insalubridade
    Forneça análises técnicas e orientações legais.`
  },
  'NR-16': {
    id: 'asst_nr16',
    name: 'Assistente NR-16',
    description: 'Atividades e Operações Perigosas',
    instructions: `Você é um especialista em NR-16 - Periculosidade. Analise e oriente sobre:
    - Atividades com explosivos
    - Atividades com inflamáveis
    - Trabalho com energia elétrica
    - Atividades com radiações ionizantes
    - Segurança pessoal e patrimonial
    - Adicional de periculosidade (30%)
    Forneça análises técnicas e orientações legais.`
  },
  'NR-17': {
    id: 'asst_nr17',
    name: 'Assistente NR-17',
    description: 'Ergonomia',
    instructions: `Você é um especialista em NR-17 - Ergonomia. Analise e oriente sobre:
    - Análise Ergonômica do Trabalho (AET)
    - Mobiliário dos postos de trabalho
    - Equipamentos dos postos de trabalho
    - Condições ambientais de trabalho
    - Organização do trabalho
    - Pausas e descansos
    Forneça recomendações ergonômicas específicas.`
  },
  'NR-18': {
    id: 'asst_nr18',
    name: 'Assistente NR-18',
    description: 'Segurança e Saúde na Indústria da Construção',
    instructions: `Você é um especialista em NR-18 - Construção Civil. Analise e oriente sobre:
    - PCMAT (Programa de Condições e Meio Ambiente de Trabalho)
    - Áreas de vivência
    - Demolição e escavações
    - Trabalho em altura
    - Andaimes e plataformas
    - Instalações elétricas temporárias
    - Proteções coletivas
    Forneça orientações específicas para canteiros de obras.`
  },
  'NR-23': {
    id: 'asst_nr23',
    name: 'Assistente NR-23',
    description: 'Proteção Contra Incêndios',
    instructions: `Você é um especialista em NR-23 - Proteção Contra Incêndios. Analise e oriente sobre:
    - Saídas de emergência
    - Combate ao fogo
    - Exercício de alerta
    - Classes de fogo
    - Extintores adequados
    - Sistemas de alarme
    - Iluminação de emergência
    Forneça orientações de prevenção e combate a incêndios.`
  },
  'NR-24': {
    id: 'asst_nr24',
    name: 'Assistente NR-24',
    description: 'Condições Sanitárias e de Conforto',
    instructions: `Você é um especialista em NR-24. Analise e oriente sobre:
    - Instalações sanitárias
    - Vestiários
    - Refeitórios
    - Cozinhas
    - Alojamentos
    - Condições de higiene e conforto
    Forneça orientações sobre condições adequadas.`
  },
  'NR-35': {
    id: 'asst_nr35',
    name: 'Assistente NR-35',
    description: 'Trabalho em Altura',
    instructions: `Você é um especialista em NR-35 - Trabalho em Altura. Analise e oriente sobre:
    - Análise de Risco (AR)
    - Permissão de Trabalho (PT)
    - Equipamentos de proteção individual
    - Sistemas de ancoragem
    - Procedimentos de emergência
    - Capacitação e treinamento
    - Aptidão para trabalho em altura
    Forneça orientações detalhadas de segurança.`
  },
  'GENERAL': {
    id: 'asst_general',
    name: 'Assistente Geral SST',
    description: 'Assistente geral para questões de Segurança e Saúde do Trabalho',
    instructions: `Você é um especialista em Segurança e Saúde do Trabalho (SST) com conhecimento em todas as NRs.
    Analise situações e forneça orientações sobre:
    - Identificação de riscos
    - Medidas de prevenção
    - Conformidade com NRs
    - Boas práticas de SST
    - Gestão de segurança
    Sempre identifique qual NR se aplica e forneça orientações práticas.`
  },
  'CHATBOT': {
    id: 'asst_chatbot',
    name: 'Chatbot COMPIA',
    description: 'Assistente virtual para ajuda geral do sistema',
    instructions: `Você é o assistente virtual do sistema COMPIA - Inteligência em Segurança do Trabalho.
    Ajude os usuários com:
    - Navegação no sistema
    - Criação de inspeções e checklists
    - Interpretação de normas de SST
    - Geração de relatórios
    - Planos de ação
    - Dúvidas sobre funcionalidades
    Seja amigável, claro e objetivo. Sempre forneça exemplos práticos.`
  }
};

export class OpenAIAssistantsService {
  private client: OpenAI;
  private assistants: Map<string, any> = new Map();

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async initializeAssistants() {
    try {
      console.log('[OPENAI-ASSISTANTS] Initializing assistants...');
      // Create or retrieve assistants
      for (const [key, config] of Object.entries(ASSISTANTS)) {
        try {
          // Try to retrieve existing assistant
          let assistant;
          const assistantsList = await this.client.beta.assistants.list();
          const existing = assistantsList.data.find(a => a.name === config.name);
          
          if (existing) {
            assistant = existing;
            console.log(`[OPENAI-ASSISTANTS] Found existing assistant: ${key} (${assistant.id})`);
          } else {
            // Create new assistant
            console.log(`[OPENAI-ASSISTANTS] Creating new assistant: ${key}`);
            assistant = await this.client.beta.assistants.create({
              name: config.name,
              instructions: config.instructions,
              model: "gpt-4o", // Using gpt-4o for assistants API compatibility
              tools: [{ type: "code_interpreter" }, { type: "file_search" }]
            });
            console.log(`[OPENAI-ASSISTANTS] Created assistant: ${key} (${assistant.id})`);
          }
          
          this.assistants.set(key, assistant);
        } catch (error) {
          console.error(`[OPENAI-ASSISTANTS] Failed to initialize assistant ${key}:`, error);
        }
      }
      console.log(`[OPENAI-ASSISTANTS] Initialized ${this.assistants.size} assistants`);
    } catch (error) {
      console.error('[OPENAI-ASSISTANTS] Failed to initialize assistants:', error);
    }
  }

  async analyzeWithAssistant(
    assistantKey: string, 
    content: string,
    files?: Array<{ url: string; type: string }>
  ) {
    try {
      const assistant = this.assistants.get(assistantKey) || this.assistants.get('GENERAL');
      if (!assistant) {
        throw new Error('Assistant not found');
      }

      console.log(`[OPENAI-ASSISTANTS] Analyzing with ${assistantKey} assistant (${assistant.id})`);

      // Create thread
      const thread = await this.client.beta.threads.create();

      // Add message with file attachments if provided
      const messageData: any = {
        role: "user" as const,
        content
      };

      // Handle file attachments
      if (files && files.length > 0) {
        const fileIds = [];
        for (const file of files) {
          try {
            // Upload file to OpenAI
            const uploadedFile = await this.client.files.create({
              file: await fetch(file.url).then(r => r.blob()),
              purpose: "assistants"
            });
            fileIds.push(uploadedFile.id);
          } catch (fileError) {
            console.error('[OPENAI-ASSISTANTS] Error uploading file:', fileError);
          }
        }
        if (fileIds.length > 0) {
          messageData.file_ids = fileIds;
        }
      }

      await this.client.beta.threads.messages.create(thread.id, messageData);

      // Run assistant
      const run = await this.client.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id
      });

      // Wait for completion
      let runStatus = await this.client.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
      let attempts = 0;
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed' && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.client.beta.threads.runs.retrieve(run.id, { thread_id: thread.id });
        attempts++;
      }

      if (runStatus.status === 'failed') {
        console.error('[OPENAI-ASSISTANTS] Assistant run failed:', runStatus.last_error);
        throw new Error('Assistant run failed');
      }

      // Get messages
      const messages = await this.client.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(m => m.role === 'assistant');
      
      if (assistantMessage && assistantMessage.content[0] && assistantMessage.content[0].type === 'text') {
        const assistantInfo = ASSISTANTS[assistantKey as keyof typeof ASSISTANTS];
        return {
          analysis: assistantMessage.content[0].text.value,
          assistant: assistantInfo?.name || 'Assistant',
          threadId: thread.id
        };
      }

      throw new Error('No response from assistant');
    } catch (error) {
      console.error('[OPENAI-ASSISTANTS] Assistant analysis error:', error);
      throw error;
    }
  }

  async chatbotResponse(message: string) {
    return this.analyzeWithAssistant('CHATBOT', message);
  }

  async analyzeInspection(
    inspectionData: any,
    assistantKey: string = 'GENERAL',
    files?: Array<{ url: string; type: string }>
  ) {
    const prompt = `
    Análise de Inspeção de Segurança do Trabalho:
    
    Local: ${inspectionData.location}
    Data: ${new Date().toLocaleDateString('pt-BR')}
    
    Checklist aplicado:
    ${JSON.stringify(inspectionData.checklist, null, 2)}
    
    Por favor, analise:
    1. Conformidades e não-conformidades identificadas
    2. Riscos potenciais
    3. Recomendações de melhoria
    4. Prioridades de ação
    5. Conformidade com as normas aplicáveis
    
    ${files?.length ? 'Arquivos anexados para análise adicional.' : ''}
    `;

    return this.analyzeWithAssistant(assistantKey, prompt, files);
  }

  async generateActionPlan(nonConformities: any[], assistantKey: string = 'GENERAL') {
    const prompt = `
    Gere um plano de ação detalhado para as seguintes não-conformidades:
    
    ${JSON.stringify(nonConformities, null, 2)}
    
    Para cada não-conformidade, forneça:
    1. O QUE deve ser feito (ação corretiva)
    2. POR QUE é importante (justificativa)
    3. ONDE aplicar a ação
    4. QUANDO deve ser concluído (prazo sugerido)
    5. QUEM deve ser responsável
    6. COMO implementar
    7. QUANTO custará (estimativa se aplicável)
    
    Priorize as ações por criticidade e risco.
    `;

    return this.analyzeWithAssistant(assistantKey, prompt);
  }

  getAvailableAssistants() {
    return Object.entries(ASSISTANTS).map(([key, config]) => ({
      key,
      name: config.name,
      description: config.description,
      openai_id: this.assistants.get(key)?.id || null
    }));
  }
}

