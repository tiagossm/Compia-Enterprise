# POP-COM-001: Procedimento de Checkout PLG

> **Código:** POP-COM-001 | **Versão:** 2.0 | **Data:** 2026-01-28

## 1. Objetivo
Fluxo de checkout COMPIA com rastreabilidade ISO 9001, captura de leads, e conformidade LGPD.

## 2. Fluxograma
```
Rate Limit → checkout_attempts → Lead CRM → Auth User → Org → Asaas
     ↓              ↓               ↓           ↓        ↓      ↓
   429?         audit trail      always    rollback  rollback  success/fail
                                 saved     on error  on error
```

## 3. Registros
| Tabela | Retenção |
|--------|----------|
| `checkout_attempts` | 5 anos |
| `leads` | 30 dias (não convertido) |
| `webhook_events` | 5 anos |

## 4. KPIs
- Taxa Conversão: > 70%
- Taxa Recusa: < 15%
- Taxa Erro Técnico: < 2%

## 5. Arquivos
- [checkout-flow.ts](file:///c:/Users/engti/Downloads/COMPIA%2006092520/supabase/functions/api/checkout-flow.ts)
- [implementation_plan.md](file:///c:/Users/engti/.gemini/antigravity/brain/6c522acc-d2a9-4ab4-9702-95b54a92fc70/implementation_plan.md)
