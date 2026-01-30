# 🧠 Base de Conhecimento (KNOWN ISSUES)
> "Aqueles que não aprendem com o passado estão condenados a repeti-lo." - Sentinela

## 🛡️ Protocolo de Resolução
1. Identificar o bug.
2. Corrigir na raiz.
3. Documentar aqui com a tag `[RESOLVIDO]`.

---

| Data | O Erro (Sintoma) | A Solução Definitiva (Causa Raiz) |
| :--- | :--- | :--- |
| 12/01/2026 | **Race Condition no ID de Inspeção:** Fallback usando `MAX(id)` poderia vincular dados incorretos em alta concorrência. | **[RESOLVIDO]** Removido fallback inseguro. O sistema agora aborta se `RETURNING id` falhar (Fail Secure). Lógica movida para `inspection-routes.ts`. |
| 12/01/2026 | **N+1 Query em Checklist:** Criação de inspeção fazia um loop de INSERT para cada item. | **[RESOLVIDO]** Implementado Batch Insert (INSERT único com múltiplos VALUES). Otimização em `inspection-routes.ts`. |
| 12/01/2026 | **Information Disclosure:** Stack traces vazando para o cliente em erros não tratados. | **[RESOLVIDO]** Implementado `app.onError` global em `index.ts`. Stack traces ocultos em produção. |
| 12/01/2026 | **Fail Open em Auth:** Variável de ambiente `ENVIRONMENT` assumia DEV se ausente. | **[RESOLVIDO]** Invertido para "Fail Secure". Requer `ENVIRONMENT='development'` explícito para liberar bypass. |
| 12/01/2026 | **Monolito de UI (`InspectionDetail.tsx`):** Componente com 1200+ linhas, difícil manutenção e risco de bugs. | **[RESOLVIDO]** Refatorado em 6 sub-componentes tipados (`Header`, `Cards`, `Items`, `Media`, `Actions`, `Plan`). Lógica isolada em `useInspectionLogic`. |
| 12/01/2026 | **Bug Exportação CSV:** Exportação limitava-se aos registros visíveis na página atual (ex: 10), ignorando filtros globais. | **[RESOLVIDO]** Implementado fetch completo (até 10k registros) com filtros ativos antes da exportação em `Inspections.tsx`. |
| 12/01/2026 | **Hardcoded Prompts (AI):** Prompts de segurança misturados com lógica de código em `inspection-item-routes.ts`. | **[RESOLVIDO]** Centralização em `ai-prompts.ts` com constantes tipadas para cada Persona (Auditor/Engenheiro). |
| 12/01/2026 | **Violação DRY (Telemetry):** Lógica de consumo de consumo de tokens duplicada 3x, dificultando manutenção. | **[RESOLVIDO]** Refatorado para usar função única `incrementAiUsage` importada de `ai-usage-tracker.ts`. |
| 12/01/2026 | **Erro MIME Type / Chunk Load Error:** Erro ao carregar módulos JS após deploy (`Expected JavaScript but got text/html`). | **[RESOLVIDO]** Caching agressivo do navegador mantinha `index.html` antigo apontando para chunks deletados. Adicionado headers `Cache-Control: no-cache` em `vercel.json` para arquivos HTML e longa duração para `/assets`. |
| 12/01/2026 | **Erro Sintaxe PDF (Template Literal):** Erro "Unterminated template literal" e falha de build ao renderizar Plano de Ação Inline complexo. | **[RESOLVIDO]** Refatorado bloco lógico complexo para função helper `renderActionPlanSection` fora do template JSX principal. Eliminado uso frágil de IIFEs aninhadas. |
| 12/01/2026 | **TypeError: toFixed is not a function:** Erro ao renderizar coordenadas GPS (`latitude.toFixed`) vindas como string da API/DB. | **[RESOLVIDO]** Adicionado cast explícito `Number()` antes de chamar `.toFixed()` em `InspectionItem`, `Summary`, `InfoCards` e `PDFGenerator` para garantir tratamento numérico seguro. |
| 13/01/2026 | **API ReceitaWS Rate Limit:** A busca de CNPJ usa a API pública `receitaws.com.br/v1/cnpj/{cnpj}` que tem limite estrito de 3 requisições por minuto por IP. | **[BY DESIGN]** Tratamento de erro 429 implementado no Backend. Frontend alerta o usuário sobre "Muitas consultas" e sugere aguardar. Para uso intensivo, considerar plano pago ou cache local. |
| 13/01/2026 | **CRM Access Control:** O módulo CRM está atualmente restrito hardcoded para `role='system_admin'`. | **[KNOWN ISSUE]** Futuramente, quando houver vendedores ou gerentes de vendas, o RBAC precisará ser ajustado em `crm-routes.ts` e `SystemAdminDashboard.tsx` para permitir acesso granular. |
| 13/01/2026 | **CRM Leads 500 Error:** Acesso a `undefined` (role) no middleware `requireSysAdmin` em `crm-routes.ts`. | **[RESOLVIDO]** Corrigido acesso para `user?.role || user?.profile?.role`, suportando diferentes estruturas de objeto User. |

---

## 📊 Decisões de Processo

| Data | Processo | Decisão | Motivo |
| :--- | :--- | :--- | :--- |
| 13/01/2026 | **Estratégia de BI "Data-First"** | Nunca iniciar a construção de dashboards sem antes validar a viabilidade dos dados no Schema (Data Discovery). | Evitar prometer métricas impossíveis de calcular ou que exijam "gambiarras" no frontend. Sempre rodar Data Discovery Scan antes de implementar relatórios. |
| 22/01/2026 | **Criação do Agente "O Controller"** | Agente especializado em Engenharia Financeira, Gateways de Pagamento e Lógica de Assinaturas SaaS. | Módulo financeiro requer expertise específica; generalistas podem cometer erros custosos. |
| 22/01/2026 | **Lei dos Centavos (Padrão Financeiro)** | PROIBIDO usar `float` ou `double` para valores monetários. SEMPRE usar `INTEGER` em centavos. | JavaScript: `0.1 + 0.2 = 0.30000000000000004`. Erros de arredondamento em produção custam dinheiro real. |
| 22/01/2026 | **Lei da Idempotência (Webhooks)** | Todo webhook de pagamento DEVE verificar se já foi processado antes de executar. Usar tabela `webhook_events` com UNIQUE constraint. | Gateways podem reenviar webhooks; processar duas vezes = duplicar créditos/cobranças. |
| 22/01/2026 | **Lei da Segregação (PCI-DSS)** | NUNCA salvar dados de cartão no Supabase. Apenas tokens/referências do gateway (`customer_id`, `subscription_id`). | Compliance PCI-DSS. Violações = multas milionárias e risco legal. |
| 22/01/2026 | **Gateway Preferencial: Asaas** | Recomendado Asaas para integração de pagamentos B2B no Brasil, com Stripe como fallback para internacionalização. | Asaas: foco B2B Brasil, NF-e integrada, boleto corporativo avançado, suporte PT-BR. |
| 30/01/2026 | **Criação do Agente "O Gatekeeper"** | Agente especializado em Backend, Segurança e RLS. Responsável por auditorias de acesso, revisão de policies e gestão de usuários. | Módulo de segurança requer expertise específica; erros podem expor o banco inteiro. |

---

## 🔐 Vulnerabilidades de Segurança Pendentes

> **Responsável:** O Gatekeeper
> **Última Auditoria:** 30/01/2026

| ID | Severidade | Tabela/Componente | Descrição | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-001 | 🔴 **CRÍTICO** | `crm_activities` | RLS policy usa `USING (true)` permitindo qualquer usuário autenticado ver todas as atividades de CRM. | **[RESOLVIDO]** Migration `20260130000001` restringe acesso a System Admins. Gatekeeper 30/01/2026. |
| SEC-002 | 🟠 **ALTO** | `activity_log` | Policy de INSERT permite qualquer authenticated user inserir sem validar organization_id. | **[RESOLVIDO]** Migration `20260130000001` valida user_id = auth.uid(). Gatekeeper 30/01/2026. |
| SEC-003 | 🟠 **ALTO** | RLS Geral | Inconsistência no uso de `auth.uid()` vs `current_setting('app.current_user_id')`. Algumas policies usam um, outras usam outro. | **[RESOLVIDO]** Migration `20260130000002` padroniza para auth.uid(). Gatekeeper 30/01/2026. |
| SEC-004 | 🟡 **MÉDIO** | `crm_activities` | Tabela não tem FK direta para organization. Depende de JOIN com leads para filtrar por org. | **[RESOLVIDO]** Migration `20260130000001` adiciona coluna organization_id. Gatekeeper 30/01/2026. |
| SEC-005 | 🟡 **MÉDIO** | Tabelas Críticas | Falta implementação de soft-delete (`deleted_at`) em tabelas como users, organizations. | **[FUTURO]** Priorizar em versão futura. |
| SEC-006 | 🔴 **CRÍTICO** | `index.ts` | `/api/debug-usage/:orgId` - Endpoint público expõe uso de IA sem autenticação. | **[RESOLVIDO]** Endpoint removido. Gatekeeper 30/01/2026. |
| SEC-007 | 🔴 **CRÍTICO** | `calendar-routes.ts` | `/debug` - Endpoint de diagnóstico público acessa dados sensíveis de banco. | **[RESOLVIDO]** Endpoint removido. Gatekeeper 30/01/2026. |
| SEC-008 | 🔴 **CRÍTICO** | `test-orgs.ts` | `/debug/addresses` - Expõe endereços e emails de todas as organizações sem auth. | **[RESOLVIDO]** Endpoint removido. Gatekeeper 30/01/2026. |
| SEC-009 | 🔴 **CRÍTICO** | `organizations-routes.ts` | SQL Injection potencial via string interpolation em query. | **[RESOLVIDO]** Corrigido para usar prepared statements. Gatekeeper 30/01/2026. |
| SEC-010 | 🟠 **ALTO** | `asaas-webhook.ts` | Validação de token webhook é opcional - se vazio, aceita qualquer request. | **[RESOLVIDO]** Validação agora é obrigatória. Gatekeeper 30/01/2026. |
| SEC-011 | 🟠 **ALTO** | Múltiplos arquivos | Roles hardcoded inconsistentes (`'admin'`, `'system_admin'`, `'sys_admin'`). | **[RESOLVIDO]** Padronizado via `isSystemAdmin()`. Gatekeeper 30/01/2026. |
| SEC-012 | 🟠 **ALTO** | `inspection-routes.ts` | TODO não implementado: validação de acesso à organização em `/simple-list`. | **[RESOLVIDO]** Validação de tenant implementada. Gatekeeper 30/01/2026. |

---

## 📋 Matriz de Permissões (3 Perfis Oficiais)

> **Atualizado:** 30/01/2026 | **Responsável:** O Gatekeeper

### Perfis Ativos

| Role | Código | Quem Usa |
|------|--------|----------|
| **System Admin** | `sys_admin` | Administrador global (único: Tiago) |
| **Org Admin** | `org_admin` | Dono da organização cliente |
| **Inspector** | `inspector` | Técnico de campo |

### Escopos por Perfil

| Escopo | sys_admin | org_admin | inspector |
|--------|-----------|-----------|-----------|
| `users:read` | ✅ | ✅ | ❌ |
| `users:write` | ✅ | ✅ | ❌ |
| `users:delete` | ✅ | ❌ | ❌ |
| `users:invitations:read` | ✅ | ✅ | ❌ |
| `users:invitations:write` | ✅ | ✅ | ❌ |
| `checklist:folders:read` | ✅ | ✅ | ✅ |
| `checklist:folders:write` | ✅ | ✅ | ❌ |
| `checklist:folders:delete` | ✅ | ❌ | ❌ |
| `checklist:templates:read` | ✅ | ✅ | ✅ |
| `checklist:templates:write` | ✅ | ✅ | ❌ |
| `organizations:read` | ✅ | ✅ | ❌ |
| `organizations:write` | ✅ | ✅ | ❌ |
| `inspections:read` | ✅ | ✅ | ✅ |
| `inspections:write` | ✅ | ✅ | ✅ |
| `system:admin` | ✅ | ❌ | ❌ |

### Operações por Módulo

| Módulo | Operação | sys_admin | org_admin | inspector |
|--------|----------|-----------|-----------|-----------|
| **Usuários** | Listar | Todos | Sua org | ❌ |
| | Convidar | ✅ | ✅ | ❌ |
| | Editar | ✅ | Sua org | ❌ |
| | Excluir | ✅ | ❌ | ❌ |
| **Inspeções** | Listar | Todas | Sua org | Sua org |
| | Criar | ✅ | ✅ | ✅ |
| | Editar | ✅ | ✅ | ✅ |
| | Excluir | ✅ | ✅ | ❌ |
| **Checklists** | Listar | Todos | Org + públicos | Org + públicos |
| | Criar | ✅ | ✅ | ❌ |
| | Editar | ✅ | ✅ | ❌ |
| | Excluir | ✅ | ❌ | ❌ |
| **CRM** | Acesso | ✅ | ❌ | ❌ |
| **Faturamento** | Ver | ✅ | ✅ | ❌ |
