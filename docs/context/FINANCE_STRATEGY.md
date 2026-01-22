# 💰 Estratégia Financeira - Compia Enterprise

> **Documento de Contexto para o Agente "O Controller"**

---

## 1. Modelo de Cobrança (SaaS B2B)

### 1.1 Recorrência
- **Mensal:** Cobrança no mesmo dia de cada mês
- **Anual:** Desconto de ~20% sobre o valor mensal (2 meses grátis)

### 1.2 Precificação por Tiers

| Tier | Nome | Preço (R$) | Recursos |
|------|------|------------|----------|
| **Base** | Starter | 19900 (R$ 199,00) | 1 Org, 5 Inspetores, 100 Inspeções/mês |
| **Pro** | Professional | 49900 (R$ 499,00) | 3 Orgs, 15 Inspetores, 500 Inspeções/mês, IA Avançada |
| **Enterprise** | Enterprise | Sob consulta | Ilimitado, SLA, Suporte Dedicado |

> ⚠️ **ATENÇÃO (Lei dos Centavos):** Todos os valores são armazenados em **CENTAVOS** (inteiros).
> R$ 199,00 = 19900 centavos

### 1.3 Modelo de Cobrança Adicional (Usage-Based)

- **Inspeções Extras:** R$ 5,00 (500 centavos) por inspeção além do limite do plano
- **Minutos de IA:** R$ 0,10 (10 centavos) por minuto de processamento de IA além do incluso
- **Armazenamento:** R$ 2,00 (200 centavos) por GB adicional/mês

---

## 2. Gateway de Pagamento

### 2.1 Contexto do Mercado B2B Brasil

O Compia é um SaaS **B2B** focado no mercado brasileiro. Isso significa:
- Clientes preferem **Pix** e **Boleto Bancário Corporativo**
- Cartão de crédito é secundário
- Necessidade de emissão de **NF-e** (Nota Fiscal Eletrônica)

### 2.2 Análise Comparativa: Asaas vs Stripe

| Critério | Asaas 🇧🇷 | Stripe 🌐 |
|----------|-----------|-----------|
| **Pix** | ✅ Nativo, taxa baixa | ✅ Disponível, taxa maior |
| **Boleto Corporativo** | ✅ Especialista | ⚠️ Funciona, menos opções |
| **SDKs** | ✅ REST API simples | ✅ SDKs excelentes |
| **Webhooks** | ✅ Bons | ✅ Excelentes |
| **Documentação** | ✅ PT-BR | ⚠️ Inglês (bom, mas não local) |
| **NF-e Integrada** | ✅ Sim | ❌ Não (requer integração) |
| **Taxas Pix** | ~1% | ~1.5% |
| **Taxas Boleto** | R$ 2,50-4,00 | R$ 3,50-5,00 |
| **Taxas Cartão** | 2.5%-4% | 2.9% + 30¢ |
| **Suporte** | PT-BR, horário comercial | EN, 24/7 |

### 2.3 Recomendação do Controller

> **🏆 RECOMENDADO: Asaas**

**Justificativa Técnica:**
1. **Foco B2B Brasil:** Asaas foi construído para empresas brasileiras
2. **NF-e Integrada:** Crítico para compliance fiscal no Brasil
3. **Boleto Corporativo:** Opções avançadas (vencimento, multa, juros)
4. **Suporte Local:** Atendimento em PT-BR, conhece legislação brasileira
5. **Webhooks Robustos:** Suporte a retentativas e assinaturas de segurança

**Stripe como Fallback:**
- Se no futuro houver expansão internacional
- Se empresa for contratada por multinacional que exige Stripe

---

## 3. Fluxo de Faturamento

### 3.1 Ciclo de Vida da Assinatura

```
┌──────────────────────────────────────────────────────────────────┐
│                    CICLO DE VIDA DA ASSINATURA                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   [TRIAL]  ──── 7 dias ────►  [ACTIVE]  ───── mensal ────►      │
│      │                            │                              │
│      ▼                            ▼                              │
│  (não pagou)                  [PAST_DUE]  ── 5 dias ──►         │
│      │                            │              │               │
│      ▼                            ▼              ▼               │
│  [CANCELED]                  [GRACE_PERIOD]  (pagou)             │
│                                   │              │               │
│                                   ▼              ▼               │
│                              [SUSPENDED]    [ACTIVE]             │
│                               (soft lock)                        │
│                                   │                              │
│                                   ▼                              │
│                              [CANCELED]                          │
│                            (após 30 dias)                        │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Regras de Faturamento

| Evento | Ação Automática |
|--------|-----------------|
| **D-5** (5 dias antes do vencimento) | Gerar fatura e enviar link de pagamento |
| **D-0** (dia do vencimento) | Se não pago, status → `past_due` |
| **D+3** (3 dias após vencimento) | Primeiro lembrete por e-mail |
| **D+7** (7 dias após vencimento) | Segundo lembrete + alerta no dashboard |
| **D+15** (15 dias após vencimento) | **SOFT LOCK:** Tenant bloqueado (read-only) |
| **D+30** (30 dias após vencimento) | Cancelamento automático |

### 3.3 Soft Lock (Bloqueio Suave)

Quando em Soft Lock:
- ❌ Não pode criar novas inspeções
- ❌ Não pode gerar relatórios
- ❌ Não pode adicionar usuários
- ✅ Pode visualizar dados existentes
- ✅ Pode fazer pagamento pendente

---

## 4. Segurança Financeira (PCI-DSS)

### 4.1 O Que NUNCA Salvamos

| Dado | Onde Fica | Nosso DB |
|------|-----------|----------|
| Número do Cartão | Gateway (Asaas) | ❌ NUNCA |
| CVV | Gateway (Asaas) | ❌ NUNCA |
| Data Expiração | Gateway (Asaas) | ❌ NUNCA |
| Dados Boleto Completo | Gateway (Asaas) | ❌ NUNCA |

### 4.2 O Que Salvamos (Tokens/Referências)

| Dado | Nosso DB | Exemplo |
|------|----------|---------|
| `customer_id` | ✅ Sim | `cus_abc123xyz` |
| `subscription_id` | ✅ Sim | `sub_def456uvw` |
| `invoice_id` | ✅ Sim | `inv_ghi789rst` |
| `payment_link` | ✅ Sim | `https://asaas.com/pay/xyz` |
| Status | ✅ Sim | `active`, `past_due`, etc. |
| Valor (centavos) | ✅ Sim | `19900` |

---

## 5. Schema de Dados (Proposta)

### 5.1 Tabela `plans`
```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,           -- 'starter', 'professional', 'enterprise'
  display_name TEXT NOT NULL,   -- 'Starter', 'Professional', 'Enterprise'
  price_cents INTEGER NOT NULL, -- 19900 (R$ 199,00)
  billing_period TEXT NOT NULL, -- 'monthly', 'yearly'
  max_organizations INTEGER,
  max_inspectors INTEGER,
  max_inspections_month INTEGER,
  features JSONB,               -- {"ai_advanced": true, "sla": false}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Tabela `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  
  -- Referências do Gateway (Lei da Segregação)
  gateway_customer_id TEXT,      -- cus_abc123 (Asaas)
  gateway_subscription_id TEXT,  -- sub_def456 (Asaas)
  
  status TEXT NOT NULL DEFAULT 'trial',
  -- Valores: 'trial', 'active', 'past_due', 'grace_period', 'suspended', 'canceled'
  
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Tabela `invoices`
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Referência do Gateway
  gateway_invoice_id TEXT,
  gateway_payment_link TEXT,
  
  amount_cents INTEGER NOT NULL,  -- Lei dos Centavos
  status TEXT NOT NULL DEFAULT 'pending',
  -- Valores: 'pending', 'paid', 'overdue', 'canceled', 'refunded'
  
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.4 Tabela `webhook_events` (Lei da Idempotência)
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway TEXT NOT NULL,           -- 'asaas', 'stripe'
  external_event_id TEXT NOT NULL, -- ID único do gateway
  event_type TEXT NOT NULL,        -- 'payment.confirmed', 'subscription.canceled'
  payload JSONB,                   -- Payload completo (para debug)
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(gateway, external_event_id)  -- Garante idempotência
);
```

---

## 6. Próximos Passos

1. ⬜ Validar modelo de preços com stakeholders
2. ⬜ Criar conta sandbox no Asaas
3. ⬜ Implementar migrations das tabelas financeiras
4. ⬜ Desenvolver Edge Functions para webhooks
5. ⬜ Integrar fluxo de checkout no frontend
6. ⬜ Implementar dashboard financeiro (Admin)
7. ⬜ Testar fluxo completo em sandbox

---

**Documento mantido por:** O Controller  
**Última atualização:** 22/01/2026
