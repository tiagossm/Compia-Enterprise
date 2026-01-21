# 🧪 Checklists de Testes por Fase

> **Sistema:** COMPIA Enterprise  
> **Versão:** 1.0.0  
> **Atualizado:** 21/01/2026

---

## 📋 Como Usar Este Documento

1. **Antes de testar:** Certifique-se de estar no ambiente correto (staging/produção)
2. **Durante os testes:** Marque `[x]` para cada item que passou
3. **Falhou?** Anote no campo "Observações" e abra issue
4. **Critérios de Aprovação:** 100% dos itens obrigatórios ✅

---

# 🔐 FASE 1: Multi-Tenant N:N + Role Fixes

**Status:** ✅ COMPLETO | **Data:** 21/01/2026

## 1.1 Correções de Roles

### Teste de Perfis de Usuário

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 1.1.1 | Login como System Admin | Vê todas as organizações | ✅ | |
| 1.1.2 | Login como Org Admin | Vê apenas sua org + subsidiárias | ✅ | |
| 1.1.3 | Login como Inspector | Não tem acesso ao módulo Organizações | ✅ | |
| 1.1.4 | Login como Viewer | Não tem acesso ao módulo Organizações | ✅ | |

### Teste de Labels de Roles

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 1.1.5 | Dropdown de roles em Users.tsx | Mostra "Administrador da Organização", não "admin" | ✅ | |
| 1.1.6 | Dropdown em UserAssignmentModal | Mostra "Cliente", não "client_viewer" | ✅ | |
| 1.1.7 | Labels em PT-BR | Todos os roles traduzidos corretamente | ✅ | |

## 1.2 Multi-Tenant Backend

### Teste de API Organizations

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 1.2.1 | `GET /api/users/me/organizations` como SysAdmin | Retorna todas orgs | ✅ | |
| 1.2.2 | `GET /api/users/me/organizations` como OrgAdmin | Retorna apenas orgs gerenciadas | ✅ | |
| 1.2.3 | `GET /api/organizations/stats?organization_id=X` | Stats filtradas pela org | ✅ | |
| 1.2.4 | Header `X-Organization-Id` é respeitado | Dados filtrados pelo tenant | ✅ | |

### Teste de Isolamento de Dados

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 1.2.5 | OrgAdmin da Org A tenta ver inspeções da Org B | Retorna vazio ou 403 | ✅ | |
| 1.2.6 | Inspector tenta acessar `/api/organizations` | Retorna apenas sua org | ✅ | |

## 1.3 Multi-Tenant Frontend

### Teste do OrganizationSelector

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 1.3.1 | Clicar no seletor de org no header | Abre dropdown com orgs disponíveis | ✅ | |
| 1.3.2 | Selecionar outra organização | Dados da página recarregam | ✅ | |
| 1.3.3 | Recarregar página após trocar org | Org selecionada persiste | ✅ | |
| 1.3.4 | SysAdmin: opção "Todas as Empresas" | Aparece no dropdown | ✅ | |
| 1.3.5 | OrgAdmin: NÃO vê "Todas as Empresas" | Opção não aparece | ✅ | |

### Teste de Contexto nas Páginas

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 1.3.6 | Dashboard: trocar org | Cards de stats atualizam | ✅ | |
| 1.3.7 | Inspeções: trocar org | Lista filtra pela org | ✅ | |
| 1.3.8 | Planos de Ação: trocar org | Lista filtra pela org | ✅ | |
| 1.3.9 | Organizações: trocar org | Stats filtram pela org | ✅ | |

---

# 💰 FASE 2: Financeiro

**Status:** ⬜ Pendente | **Previsão:** Fev 2026

## 2.1 Integração de Pagamento (Asaas/Stripe)

### Teste de Webhooks

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 2.1.1 | Webhook `payment_confirmed` | Atualiza status do plano | ⬜ | |
| 2.1.2 | Webhook `payment_overdue` | Marca org como inadimplente | ⬜ | |
| 2.1.3 | Webhook `subscription_cancelled` | Downgrade para plano free | ⬜ | |
| 2.1.4 | Validação de assinatura do webhook | Rejeita webhooks não autenticados | ⬜ | |

### Teste de Dunning (Cobrança)

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 2.1.5 | 1 dia de atraso | Email de lembrete enviado | ⬜ | |
| 2.1.6 | 7 dias de atraso | Notificação de suspensão iminente | ⬜ | |
| 2.1.7 | 15 dias de atraso | Funcionalidades bloqueadas | ⬜ | |
| 2.1.8 | Pagamento regularizado | Acesso restaurado | ⬜ | |

## 2.2 Upgrade/Downgrade de Plano

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 2.2.1 | Upgrade Basic → Pro | Limites aumentados imediatamente | ⬜ | |
| 2.2.2 | Downgrade Pro → Basic | Funciona se dentro dos limites | ⬜ | |
| 2.2.3 | Downgrade com excesso de usuários | Bloqueado com mensagem clara | ⬜ | |
| 2.2.4 | Proration (prorata) | Valor calculado corretamente | ⬜ | |

## 2.3 Página /billing

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 2.3.1 | Acessar `/billing` como OrgAdmin | Vê informações do plano | ⬜ | |
| 2.3.2 | Acessar `/billing` como Inspector | Acesso negado | ⬜ | |
| 2.3.3 | Histórico de faturas | Lista faturas anteriores | ⬜ | |
| 2.3.4 | Download de NF | Link funcional | ⬜ | |
| 2.3.5 | Atualizar cartão | Fluxo de atualização funciona | ⬜ | |

---

# 🛡️ FASE 3: Segurança

**Status:** ⬜ Pendente | **Previsão:** Fev 2026

## 3.1 Rate Limiting

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 3.1.1 | 100 requests em 1 min (API normal) | Passa | ⬜ | |
| 3.1.2 | 101+ requests em 1 min | Retorna 429 Too Many Requests | ⬜ | |
| 3.1.3 | 5 tentativas de login errado | Aguardar 5 min para tentar | ⬜ | |
| 3.1.4 | Rate limit por IP | Funciona por IP, não global | ⬜ | |

## 3.2 Session Fail-Secure

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 3.2.1 | Token expirado | Redirect para login | ⬜ | |
| 3.2.2 | Token manipulado | 401 Unauthorized | ⬜ | |
| 3.2.3 | Logout | Invalida sessão server-side | ⬜ | |
| 3.2.4 | Múltiplas sessões ativas | Permitido ou limitado (config) | ⬜ | |

## 3.3 API Versioning

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 3.3.1 | `GET /api/v1/inspections` | Retorna v1 format | ⬜ | |
| 3.3.2 | `GET /api/inspections` (sem versão) | Assume v1 ou latest | ⬜ | |
| 3.3.3 | Header `Accept-Version: v2` | Responde com v2 se disponível | ⬜ | |

## 3.4 Outras Validações de Segurança

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 3.4.1 | SQL Injection em busca | Query escapada, sem erro | ⬜ | |
| 3.4.2 | XSS em campos de texto | HTML é escapado | ⬜ | |
| 3.4.3 | CORS configurado | Apenas origens permitidas | ⬜ | |
| 3.4.4 | Headers de segurança | X-Frame-Options, CSP, etc | ⬜ | |

---

# 🔍 FASE 4: QA & Observabilidade

**Status:** ⬜ Pendente | **Previsão:** Mar 2026

## 4.1 Testes E2E

### Fluxo de Inspeção Completo

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 4.1.1 | Criar inspeção | Salva no banco | ⬜ | |
| 4.1.2 | Preencher checklist | Respostas salvas | ⬜ | |
| 4.1.3 | Adicionar fotos | Upload funciona | ⬜ | |
| 4.1.4 | Gerar 5W2H com IA | Ação gerada corretamente | ⬜ | |
| 4.1.5 | Finalizar inspeção | Status muda para "Concluída" | ⬜ | |
| 4.1.6 | Gerar PDF | Arquivo gerado com dados | ⬜ | |

### Offline Sync

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 4.1.7 | Modo offline no PWA | Notificação aparece | ⬜ | |
| 4.1.8 | Salvar inspeção offline | Armazena em IndexedDB | ⬜ | |
| 4.1.9 | Sync ao reconectar | Dados enviados ao servidor | ⬜ | |
| 4.1.10 | Conflito de sync | Tratado sem perda de dados | ⬜ | |

### Assinatura Digital

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 4.1.11 | Assinar com stylus | Captura assinatura | ⬜ | |
| 4.1.12 | Assinar com dedo (mobile) | Funciona no touch | ⬜ | |
| 4.1.13 | Assinatura no PDF | Aparece no relatório | ⬜ | |

## 4.2 Sentry/Observabilidade

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 4.2.1 | Erro no frontend | Capturado no Sentry | ⬜ | |
| 4.2.2 | Erro em Edge Function | Capturado no Sentry | ⬜ | |
| 4.2.3 | Breadcrumbs | Contexto do erro capturado | ⬜ | |
| 4.2.4 | Performance tracing | Métricas de latência | ⬜ | |

---

# 📧 FASE 5: Notificações + Onboarding

**Status:** ⬜ Pendente | **Previsão:** Mar 2026

## 5.1 Email Transacional (Resend)

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 5.1.1 | Email de boas-vindas | Enviado ao criar conta | ⬜ | |
| 5.1.2 | Email de reset de senha | Link funciona por 24h | ⬜ | |
| 5.1.3 | Email de convite para org | Destinatário recebe | ⬜ | |
| 5.1.4 | Notificação de inspeção agendada | Inspetor recebe 1 dia antes | ⬜ | |
| 5.1.5 | Template em PT-BR | Textos corretos | ⬜ | |
| 5.1.6 | Unsubscribe link | Funciona | ⬜ | |

## 5.2 Onboarding Guiado

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 5.2.1 | Primeiro login: Welcome tour | Modal ou wizard aparece | ⬜ | |
| 5.2.2 | Step 1: Perfil completo | Pede nome e foto | ⬜ | |
| 5.2.3 | Step 2: Criar org (se OrgAdmin) | Wizard de organização | ⬜ | |
| 5.2.4 | Step 3: Primeira inspeção | Guia para criar inspeção | ⬜ | |
| 5.2.5 | Skip onboarding | Pode pular e voltar depois | ⬜ | |
| 5.2.6 | Onboarding não reaparece | Só aparece 1x por usuário | ⬜ | |

---

# 🔒 FASE 6: LGPD

**Status:** ⬜ Pendente | **Previsão:** Mar 2026

## 6.1 Direito ao Esquecimento

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 6.1.1 | `DELETE /api/me` | Usuário pode excluir conta | ⬜ | |
| 6.1.2 | Confirmação por email | Requer confirmação | ⬜ | |
| 6.1.3 | Cascade delete: inspeções | Anonimizadas (não excluídas) | ⬜ | |
| 6.1.4 | Cascade delete: comentários | Anonimizados | ⬜ | |
| 6.1.5 | Log de exclusão mantido | Para auditoria | ⬜ | |

## 6.2 Portabilidade de Dados

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 6.2.1 | `GET /api/me/export` | Retorna JSON com todos dados | ⬜ | |
| 6.2.2 | Formato documentado | Schema acessível ao usuário | ⬜ | |
| 6.2.3 | Download inclui: perfil | Nome, email, role | ⬜ | |
| 6.2.4 | Download inclui: inspeções | Dados das inspeções criadas | ⬜ | |
| 6.2.5 | Prazo de 15 dias | Resposta dentro do prazo legal | ⬜ | |

## 6.3 Consentimento

| # | Teste | Esperado | Status | Observações |
|---|-------|----------|--------|-------------|
| 6.3.1 | Termos de uso aceitos | Registrado no banco | ⬜ | |
| 6.3.2 | Política de privacidade | Link acessível | ⬜ | |
| 6.3.3 | Opt-in para marketing | Checkbox separado | ⬜ | |
| 6.3.4 | Revogação de consentimento | Funciona nas configurações | ⬜ | |

---

# 📊 Resumo de Aprovação

| Fase | Total Testes | Passou | Falhou | % Aprovação |
|------|-------------|--------|--------|-------------|
| **1. Multi-Tenant** | 22 | 22 | 0 | ✅ 100% |
| **2. Financeiro** | 17 | 0 | 0 | ⬜ 0% |
| **3. Segurança** | 15 | 0 | 0 | ⬜ 0% |
| **4. QA** | 17 | 0 | 0 | ⬜ 0% |
| **5. Notificações** | 12 | 0 | 0 | ⬜ 0% |
| **6. LGPD** | 14 | 0 | 0 | ⬜ 0% |
| **TOTAL** | 97 | 22 | 0 | 23% |

---

# 🔧 Template de Issue para Falha

```markdown
## 🐛 Bug: [FASE X] [Nome do Teste]

**Teste ID:** X.X.X
**Fase:** (Nome da fase)
**Severidade:** Alta / Média / Baixa

### Comportamento Esperado
(O que deveria acontecer)

### Comportamento Atual
(O que está acontecendo)

### Passos para Reproduzir
1. 
2. 
3. 

### Evidências
(Screenshots, logs, etc)

### Ambiente
- Browser: 
- OS: 
- Versão do Sistema: 
```

---

> **Última atualização:** 21/01/2026  
> **Responsável:** Equipe QA  
> **Próxima revisão:** Após conclusão de cada fase
