# ESTRATÉGIA DE MONETIZAÇÃO E IA - COMPIA ENTERPRISE

> Documento consolidado de decisões financeiras e estratégicas
> Elaborado por: O Controller (Agente Financeiro)
> Data: 22/01/2026

---

## 1. ESTRUTURA DE PLANOS

### 1.1 Decisão Final: 2 Planos + Enterprise

```
ESSENCIAL         R$ 199/mês
INTELIGENTE       R$ 397/mês
ENTERPRISE        R$ 1.290+/mês (ou sob consulta)
```

### 1.2 Detalhamento dos Planos

#### COMPIA ESSENCIAL (R$ 199/mês)

**Ideal para:** Consultores autônomos, MEIs, pequenas equipes

| Recurso | Limite |
|---------|--------|
| Usuários | 2 |
| Organizações | Ilimitadas |
| Storage | 5 GB |
| Retenção de mídias | 12 meses |

| IA | Disponível |
|---|------------|
| Chat Assistente | ✅ Ilimitado (Gemini Flash grátis) |
| Gerador Checklist | ✅ Ilimitado (Gemini Flash grátis) |
| Análise de Texto | ✅ Ilimitada (Gemini Flash grátis) |
| Análise Multimodal | ❌ Não incluso |
| Plano 5W2H com IA | ❌ Não incluso (manual) |

---

#### COMPIA INTELIGENTE (R$ 397/mês)

**Ideal para:** Empresas que querem automação real

| Recurso | Limite |
|---------|--------|
| Usuários | 15 (+R$ 29/usuário extra) |
| Organizações | Ilimitadas |
| Storage | 50 GB |
| Retenção de mídias | 12 meses |

| IA | Disponível |
|---|------------|
| Chat Assistente | ✅ Ilimitado |
| Gerador Checklist | ✅ Ilimitado |
| Análise de Texto | ✅ Ilimitada |
| Análise Multimodal | ✅ Ilimitada (foto + áudio + PDF) |
| Plano 5W2H com IA | ✅ Ilimitado |

**Recursos adicionais:**
- Dashboard gerencial
- Auditoria/Logs
- Papéis customizáveis

---

#### COMPIA ENTERPRISE (R$ 1.290+/mês)

**Ideal para:** Grupos empresariais, franqueadoras

| Recurso | Limite |
|---------|--------|
| Usuários | Ilimitados |
| Organizações | Ilimitadas |
| Storage | 500 GB |
| Retenção de mídias | 24 meses |

| IA | Disponível |
|---|------------|
| Todos os recursos | ✅ Ilimitados |
| Modelo Premium | ✅ GPT-4o + Gemini fallback |
| SLA de IA | ✅ Garantido |

**Recursos adicionais:**
- Suporte dedicado
- Gerente de conta
- Onboarding assistido

---

## 2. ESTRATÉGIA DE INTELIGÊNCIA ARTIFICIAL

### 2.1 Modelos Utilizados

| Função | Modelo | Custo |
|--------|--------|-------|
| Chat Assistente | Gemini 1.5 Flash | R$ 0 (tier grátis) |
| Gerador Checklist | Gemini 1.5 Flash | R$ 0 (tier grátis) |
| Análise de Texto | Gemini 1.5 Flash | R$ 0 (tier grátis) |
| Análise Multimodal | Gemini 2.5 Flash | ~R$ 0,02/análise |
| Plano 5W2H | Gemini 2.5 Flash | ~R$ 0,05/plano |
| Premium (Enterprise) | GPT-4o | ~R$ 0,15/chamada |

### 2.2 Cascata de Resiliência (Multimodal)

O sistema tenta modelos em ordem até um funcionar:
1. gemini-2.5-flash
2. gemini-2.5-pro
3. gemini-2.0-flash
4. gemini-pro (fallback texto)

### 2.3 Custo Estimado de IA por Cliente/Mês

| Plano | Uso Típico | Custo IA |
|-------|-----------|----------|
| ESSENCIAL | Chat + Texto | ~R$ 0 |
| INTELIGENTE | + 20 análises + 10 planos | ~R$ 0,90 |
| ENTERPRISE | + 100 análises + 50 planos | ~R$ 10 |

---

## 3. ESTRATÉGIA DE STORAGE

### 3.1 Limites por Plano

| Plano | Storage | Retenção |
|-------|---------|----------|
| ESSENCIAL | 5 GB | 12 meses |
| INTELIGENTE | 50 GB | 12 meses |
| ENTERPRISE | 500 GB | 24 meses |

### 3.2 Política de Retenção

- Mídias expiram automaticamente após período de retenção
- Avisos enviados 30 dias e 7 dias antes
- PDF é o "arquivo final" (cliente deve baixar)
- Add-on de storage: R$ 19/10 GB/mês

### 3.3 Posicionamento

> "O Compia é sua ferramenta de TRABALHO, não seu HD virtual.
> Faça a inspeção, gere o relatório, arquive o PDF."

---

## 4. GATEWAY DE PAGAMENTO

### 4.1 Recomendação: Asaas

| Método | Taxa |
|--------|------|
| Pix | 1,49% |
| Boleto | R$ 2,50-4,00/boleto |
| Cartão | 2,5%-4% |

**Motivos:**
- Foco B2B Brasil
- NF-e integrada
- Boleto corporativo avançado
- Suporte PT-BR

### 4.2 Fallback: Stripe

Para expansão internacional futura.

---

## 5. CONTABILIDADE OPERACIONAL

### 5.1 Custos por Fase

| Fase | Clientes | Custo Fixo/Mês |
|------|----------|----------------|
| Zero (desenvolvimento) | 0 | R$ 0 |
| Validação | 1-3 teste | R$ 0 |
| Primeiro cliente | 1 pagante | R$ 150 (Supabase Pro) |
| Crescimento | 5-20 | R$ 150-180 |
| Escala | 50+ | R$ 180-300 |

### 5.2 Cenário: 50 Clientes

```
RECEITA:
  25 ESSENCIAL x R$ 199:     R$ 4.975
  25 INTELIGENTE x R$ 397:   R$ 9.925
  TOTAL:                     R$ 14.900/mês

CUSTOS:
  Supabase Pro + Storage:    R$ 180
  Vercel (grátis):           R$ 0
  IA:                        R$ 22
  Gateway (Asaas):           R$ 208
  TOTAL:                     R$ 410/mês

LUCRO BRUTO:                 R$ 14.490/mês
MARGEM:                      97%
```

### 5.3 Breakdown de Custos por Cliente

| Componente | Custo/Cliente/Mês |
|------------|-------------------|
| Storage | R$ 0,62 |
| Supabase (rateio) | R$ 3,00 |
| IA (Inteligente) | R$ 0,90 |
| Gateway | R$ 4,50 |
| **TOTAL** | **~R$ 9** |

---

## 6. AS TRÊS LEIS ABSOLUTAS (Controller)

### Lei dos Centavos
> NUNCA usar float para dinheiro. R$ 10,00 = 1000 centavos.

### Lei da Idempotência
> Se o gateway enviar webhook 2x, processar apenas 1x.

### Lei da Segregação
> Dados de cartão ficam no Gateway. DB guarda apenas tokens.

---

## 7. GAPS: O QUE FALTA IMPLEMENTAR

### 7.1 Funcionalidades Parciais (Cuidado ao Prometer)

| Funcionalidade | Status Real | O que Falta |
|----------------|-------------|-------------|
| **Gamificação (XP/Ranking)** | Frontend + Backend existem | Tabelas `user_gamification` e `user_achievements` não criadas |
| **Agenda/Calendário** | ✅ Funciona | Integração Google parcial |
| Workflow de aprovação | Básico (apenas status de inspeção) | Não é um BPM completo |
| Notificações automáticas | Apenas in-app | Falta push/email recorrente |
| Exportação Word/Excel | CSV existe, Word não | Implementar docx |
| Biblioteca de templates | Existe compartilhamento | Falta marketplace |
| Dashboard comparativo | Parcial em OrgAdminDashboard.tsx | Melhorar comparação entre unidades |

### 7.2 Funcionalidades Não Implementadas

| Funcionalidade | Status | Necessário Para |
|----------------|--------|-----------------|
| Limite de usuários/org | ❌ Não existe | Diferenciar planos |
| Limite de IA por mês | ❌ Não bloqueia | Diferenciar planos |
| Limite de storage | ❌ Não existe | Controlar custos |
| White Label | ❌ Não existe | Enterprise |
| SSO corporativo | ❌ Só OAuth básico | Enterprise |
| API documentada | ❌ Existe mas não doc | Enterprise |
| Relatórios com branding | ❌ Logo fixo | Enterprise |
| Ambiente dedicado | ❌ Não existe | Enterprise |
| Cobrança/Assinaturas | ❌ Não existe | Core financeiro |

### 7.3 Tabelas que Não Existem

| Tabela | Propósito |
|--------|-----------|
| `plans` | Definir planos disponíveis |
| `subscriptions` | Vincular org ao plano |
| `invoices` | Histórico de faturas |
| `webhook_events` | Idempotência de pagamentos |

### 7.4 Chat Assistente Usa OpenAI (Pago)

| Atual | Proposto |
|-------|----------|
| gpt-4o-mini (~R$ 0,05/msg) | Gemini 1.5 Flash (R$ 0 - tier grátis) |

Arquivo: `ai-assistant-routes.ts`

---

---

## 8. VISÃO FUTURA: MARKETPLACE DE SERVIÇOS TÉCNICOS

**Conceito:** O Compia será a ponte entre empresas que precisam de serviços técnicos e profissionais qualificados.

**Modelo de Negócio Futuro:**
1. SaaS (Assinatura): Uso da ferramenta
2. Take Rate (Comissão): % sobre serviços contratados via plataforma

**Implicações para Hoje:**
- **Workflow de Aprovação** é obrigatório em TODOS os planos (base para controle de serviço no marketplace)
- A aprovação serve como gatilho financeiro (Service Done)
- Sistema deve ser "Project-Aware" (inspeções vinculadas a contratos)

---

## 9. PRÓXIMOS PASSOS

### 9.1 Implementação Técnica

**URGENTE (bloqueia operação básica):**
- [ ] Migrar chat assistente para Gemini Flash (custo zero)
- [ ] Criar tabelas financeiras (`plans`, `subscriptions`)
- [ ] Implementar Workflow de Aprovação (Simples) para TODOS
- [ ] Implementar verificação de limites (IA e usuários)

**IMPORTANTE (valor percebido):**
- [ ] Notifications (Email/Push)
- [ ] Exportação Word
- [ ] Gamificação (Backend tables)

**ADIADO (não vender agora):**
- [ ] White Label
- [ ] SSO Corporativo
- [ ] API Documentada

### 9.2 Comercial

- [ ] Criar página de preços (Foco: Essencial e Inteligente)
- [ ] Preparar pitch de "Plataforma Preparada para o Futuro"
- [ ] Definir política de mídias (12 meses)

---

## 10. HISTÓRICO DE DECISÕES

| Data | Decisão | Motivo |
|------|---------|--------|
| 22/01/2026 | 2 planos em vez de 4 | Simplifica decisão do cliente |
| 22/01/2026 | Orgs ilimitadas por usuários | Atende consultorias |
| 22/01/2026 | Gemini Flash para chat | Custo zero |
| 22/01/2026 | Retenção 12 meses | Controla crescimento de storage |
| 22/01/2026 | Asaas como gateway | Melhor para B2B Brasil |

---

**Documento mantido por:** O Controller
**Última atualização:** 22/01/2026
