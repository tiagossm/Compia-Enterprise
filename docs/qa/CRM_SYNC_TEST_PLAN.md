# Roteiro de Testes: Integração Financeiro <-> CRM

Este documento descreve os passos para validar se a "Sincronização de Inteligência de Receita" está funcionando conforme esperado.

## 🎯 Objetivo
Verificar se o sistema detecta automaticamente oportunidades de Upsell e Riscos de Churn e cria registros correspondentes no CRM.

## 📋 Pré-requisitos
- Estar logado como `System Admin` (eng.tiagosm@gmail.com).
- Banco de dados inicializado.

---

## 🧪 Casos de Teste

### Caso 1: Detecção de Oportunidade de Upsell (Uso Alto)

**Cenário:** Uma organização está usando mais de 80% do limite de usuários.

1. **Preparação de Dados (Manual ou via Banco):**
   - Tenha uma organização criada (ex: "Empresa Teste A").
   - Defina `max_users` = 5.
   - Adicione 4 ou 5 usuários a essa organização (80% ou 100%).
   - *Alternativa:* Se não puder adicionar usuários reais, edite o banco:
     ```sql
     UPDATE organizations SET max_users = 2 WHERE name = 'Empresa Teste A';
     -- Garanta que user_organizations tenha pelo menos 2 registros para esse ID
     ```

2. **Ação:**
   - Vá para o menu **Admin > Financeiro & Receita**.
   - Clique no botão **"Rodar Análise IA"** (botão laranja no cabeçalho).
   - Aguarde o alerta de confirmação: "Sincronização concluída. X oportunidades identificadas."

3. **Validação:**
   - Vá para o menu **Admin > CRM**.
   - Verifique a lista de Leads/Pipeline.
   - **Resultado Esperado:** Deve aparecer um novo Lead chamado "Empresa Teste A" com status "Novo" e nota "ALERTA DE IA: Uso de usuários em X%...".

### Caso 2: Idempotência (Não Duplicação)

**Cenário:** Rodar a análise duas vezes não deve criar Leads duplicados.

1. **Ação:**
   - Logo após o Caso 1 (com o Lead já criado), clique novamente em **"Rodar Análise IA"**.

2. **Validação:**
   - O sistema deve processar, mas informar "0 oportunidades identificadas" (ou o número de novas, sem contar a anterior).
   - Vá ao CRM e confirme que **não** existem dois Leads iguais para a "Empresa Teste A".

### Caso 3: Navegação do Botão de Planos

1. **Ação:**
   - No Dashboard Financeiro, clique em "Gerenciar Planos".
   - **Resultado Esperado:** Deve redirecionar para a tela de `/billing`.

---

## 🐞 Troubleshooting

Se o botão "Rodar Análise IA" retornar erro:
1. Verifique se o backend está rodando (`npm run dev` ou similar).
2. Verifique os logs do backend para ver se o endpoint `/usage` ou `/run-intelligence-sync` retornou exceção.

Se o Lead não aparecer:
1. Confirme se a organização realmente tem > 80% de uso na tabela `organizations` vs `user_organizations`.
2. Verifique se já existia um lead com o mesmo nome que foi marcado como 'won' ou 'lost' (a lógica atual ignora duplicatas apenas se status != won/lost, ajuste conforme necessidade).
