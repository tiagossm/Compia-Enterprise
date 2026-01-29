# Perfil Estratégico Compia: Edição Antigravity (IDX)

Este documento define a visão de negócio, o público-alvo e as funcionalidades críticas que diferenciam o Compia do mercado legado (Checklist Fácil).

## 1. O Mercado e o Cliente (Quem paga a conta?)

**Cliente Ideal (ICP):** Empresas e consultorias que operam em setores de alta regulação e risco operacional.

*   **Indústria & Qualidade:** Auditorias ISO, 5S e processos produtivos.
*   **Agronegócio:** Agrónomos e produtores rurais (monitorização de pragas, aplicação de insumos, manutenção de frota pesada).
*   **Construção Civil:** Engenheiros e técnicos de segurança (diário de obra, conformidade de andaimes e EPIs).
*   **SST & Ambiental:** Consultorias de segurança do trabalho e gestão de resíduos/licenciamento.

**Quem usa vs. Quem compra:**

*   **Usuário (O Herói de Campo):** Técnicos, agrônomos e inspetores que precisam de agilidade total ("mãos livres") para não interromper o fluxo de trabalho.
*   **Comprador (O Tomador de Decisão):** Gestores de Compliance, Diretores de Operações ou Donos de Fazendas/Empresas que necessitam de integridade jurídica e dados para redução de custos.

**A "Dor" Principal:**
O "apagão de dados" entre o campo e o escritório. Substituímos o papel, o Excel e softwares caros/complexos por uma ferramenta que transforma a conversa do técnico em dados estruturados automaticamente.

## 2. O Produto e Diferenciação

*   **The Killer Feature: "Ata IA de Inspeção" (Mãos Livres).**
    O uso do Gemini 1.5 Flash/Pro permite que o usuário grave áudio enquanto trabalha. A IA não apenas transcreve, mas interpreta o contexto técnico e sugere o preenchimento do checklist em silêncio.

*   **Diferencial de Integridade: "GPS Atómico".**
    Cada interação (foto, áudio, resposta) gera um log georreferenciado (PostGIS). Isso cria uma prova inatacável de que o auditor estava no local exato do risco.

*   **Visualização Estratégica: "Mapa de Calor de Riscos".**
    Em vez de tabelas chatas, o gestor vê "manchas de perigo" geográficas na planta ou na fazenda, permitindo intervenções cirúrgicas.

**Estágio Atual:**
MVP Robusto com infraestrutura 100% Supabase. Pronto para a implementação da camada de inteligência e automação de agenda.

## 3. Modelo de Negócio (Dinheiro)

*   **Ideia de Preço:** SaaS B2B com camadas (Tiers).
*   **Base:** Valor por licença mensal/empresa.
*   **Variable:** Taxa por volume de processamento de IA/Mídia ou número de unidades monitorizadas.
*   **Estratégia de Venda:** Validação regional (Dracena/SP) via venda direta e prova de conceito (PoC). Expansão nacional através de consultorias que utilizam o Compia como sua plataforma oficial de entrega de serviços.

## 4. Capacidade Operacional (Realidade)

*   **Recursos Humanos:** Solo Dev (Tiago). Foco total em engenharia de software e integração de IA.
*   **Tempo Disponível:** Desenvolvimento em regime parcial (horas vagas, noites e fins de semana).
*   **Pressa:** Foco na Excelência Técnica. O objetivo é lançar uma ferramenta que seja "inevitável" pela sua superioridade tecnológica (Antigravity/IDX).

## 5. Restrições e Stack Técnica

*   **Stack:** 100% Supabase (Edge Functions para IA, Realtime para colaboração "estilo Sheets", Storage e Postgres/PostGIS).
*   **Ambiente:** Project IDX (Antigravity) para desenvolvimento ágil assistido.
*   **Integridade:** Rigor total na imutabilidade dos logs de auditoria.
*   **Mobilidade:** O sistema deve estar preparado para coleta offline e sincronização inteligente.

## 🚀 Próximos Passos de Engenharia (Backlog)

1.  **Fase de Agenda:** Implementar o motor de agendamento recorrente via Supabase Cron.
2.  **Fase de Modelos:** Criar a biblioteca de templates (NRs, ISOs, Agro) gerada por IA.
3.  **Fase de Inteligência:** Integrar a Edge Function do Gemini para processamento multimodal de áudio.
4.  **Fase Geoespacial:** Ativar o Mapa de Calor baseado nos logs de GPS atómico.
