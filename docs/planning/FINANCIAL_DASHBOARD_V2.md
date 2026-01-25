# Planejamento: Refinamento do Painel Financeiro (Dashboard v2)

## ❌ Problemas Identificados
1. **Dados Zerados/Falsos:** O dashboard mostra R$ 0,00 e gráficos quebrados quando não há histórico.
2. **Falta de Clareza:** Usuário não sabe como o "MRR" ou "Risco de Churn" são calculados.
3. **Falta de Metas:** O gráfico perde contexto sem uma linha de meta comparativa.
4. **UX:** Queda abrupta no gráfico de receita (Dezembro -> Atual).

## 🚀 Solução Proposta

### 1. "Explicabilidade" (Educational UI)
Adicionar ícones `( i )` (Tooltips) ao lado de cada KPI com explicações claras e a fórmula usada.

| KPI | Explicação / Fórmula |
|-----|----------------------|
| **MRR Atual** | Soma do valor mensal de todas as assinaturas ativas (`status = active | past_due`). |
| **ARPU** | (Average Revenue Per User) = MRR Total / Número de Clientes Pagantes. |
| **Risco de Churn** | Clientes com fatura em atraso (`past_due`) ou sem atividade há > 7 dias. |
| **Upsell** | Clientes utilizando > 80% dos limites do plano contratado. |

### 2. Dados Reais & Gráfico
* **Backend (`bi-analytics`):**
    * Melhorar a query para buscar o histórico real de pagamentos (`invoices`) dos últimos 6 meses para montar o gráfico, em vez de dados hardcoded.
    * Se não houver dados históricos (SaaS novo), projetar uma linha pontilhada "Projeção" ou manter vazio com aviso claro "Aguardando primeirro fechamento".
* **Correção do "Drop":** Garantir que o mês atual some o MRR contratado e não apenas o "pago", para evitar que o gráfico despenque no dia 1 do mês.

### 3. Sistema Global de Metas (Goals Engine)
* **Novo Schema:** Tabela `system_goals` para armazenar metas de qualquer KPI.
    ```sql
    CREATE TABLE system_goals (
        metric_key TEXT PRIMARY KEY, -- 'mrr', 'churn_rate', 'upsell_leads', 'arpu'
        target_value NUMERIC,
        period TEXT DEFAULT 'monthly'
    );
    ```
* **UI de Metas:** Botão "Definir Metas" abre um modal para configurar:
    * Meta de MRR (R$)
    * Teto de Churn (Max Clientes)
    * Meta de Leads de Upsell (Min)
    * Meta de Ticket Médio (ARPU)
* **Visualização:**
    * **KPI Cards:** Barra de progresso ou indicador "vs Meta" (ex: "85% da meta").
    * **Gráfico:** Linha de referência no gráfico de evolução.

### 4. Simulação (Seed Data)
* Criar um script/botão de "Demo Mode" que preenche o banco com dados fictícios passados (faturas de meses anteriores) para que o admin possa visualizar o dashboard "vivo" antes de ter clientes reais.

---

## 📅 Plano de Execução

1. **[Backend] Histórico Real:** Ajustar `system-admin-routes.ts` para agrupar `invoices` por mês (`GROUP BY date_trunc('month', due_date)`).
2. **[Frontend] Tooltips:** Implementar o componente `InfoTooltip` e adicionar aos cards.
3. **[Fullstack] Metas:** Criar tabela/store simples para salvar a Meta de Receita e plotar no gráfico.
4. **[UX] Empty States:** Melhorar a exibição quando os dados são zero (ex: "Ainda não há dados suficientes para este gráfico").

---

**Autor:** O Controller  
**Status:** Planejamento  
