# Relatórios de Uso de Inteligência Artificial

## 1. Visão Geral
Este módulo permite que administradores da organização visualizem e extraiam logs detalhados do consumo de recursos de Inteligência Artificial (IA). O objetivo é fornecer transparência sobre como os créditos de IA estão sendo utilizados, por quem e em quais funcionalidades (análise, checklists, planos de ação, etc.).

## 2. Casos de Uso

### 2.1 Visualizar Histórico de Uso
- **Ator**: Administrador da Organização (Org Admin) ou Admin do Sistema.
- **Descrição**: O usuário acessa uma área de relatórios e visualiza uma tabela com o histórico de chamadas de IA.
- **Filtros**:
  - Período (Data Início / Data Fim)
  - Usuário
  - Tipo de Recurso (ex: 'analysis', 'checklist', 'action_plan')
  - Status (Sucesso/Falha)

### 2.2 Exportar Logs (CSV/Excel)
- **Ator**: Org Admin.
- **Descrição**: O usuário clica em "Exportar" para baixar um arquivo (CSV ou Excel) contendo os dados filtrados para auditoria externa ou análise de custos.

## 3. Modelo de Dados

### Tabela: `ai_usage_log` (Já existente)
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL | Identificador único |
| `organization_id` | INT | Referência à organização |
| `user_id` | UUID | Referência ao usuário que acionou |
| `feature_type` | VARCHAR | Tipo de funcionalidade (analysis, pre_analysis, action_plan, checklist) |
| `model_used` | VARCHAR | Modelo utilizado (gpt-4o, gpt-4o-mini, gemini-flash) |
| `input_tokens` | INT | (Opcional) Tokens de entrada gastos |
| `output_tokens` | INT | (Opcional) Tokens de saída gastos |
| `tokens_total` | INT | (Opcional) Total de tokens |
| `status` | VARCHAR | 'success' ou 'error' |
| `created_at` | TIMESTAMPTZ | Data e hora da requisição |

## 4. Definição da API

### 4.1 Listar Logs de Uso
- **Método**: `GET`
- **Rota**: `/api/organizations/:orgId/ai-usage/logs`
- **Permissão**: `org_admin` ou `sys_admin`
- **Query Params**:
  - `page`: Número da página (default 1)
  - `limit`: Itens por página (default 20, max 100)
  - `start_date`: ISO Date string
  - `end_date`: ISO Date string
  - `feature_type`: Filtro de tipo
  - `user_id`: Filtro de usuário
- **Resposta**:
```json
{
  "logs": [
    {
      "id": 123,
      "user_name": "João Silva",
      "feature_type": "analysis",
      "model_used": "gpt-4o-mini",
      "status": "success",
      "created_at": "2024-03-20T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 500,
    "page": 1,
    "pages": 25
  }
}
```

### 4.2 Exportar Logs
- **Método**: `GET`
- **Rota**: `/api/organizations/:orgId/ai-usage/export`
- **Permissão**: `org_admin` ou `sys_admin`
- **Query Params**: Mesmos de listagem.
- **Headers**:
  - `Accept`: `text/csv` ou `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Resposta**: Arquivo binário para download.

## 5. Interface do Usuário (UI)

### 5.1 Modal ou Página de Relatório
- Adicionar uma aba "Consumo de IA" nas configurações da organização.
- Mostrar:
  - **Resumo**: Total consumido no mês / Limite do plano.
  - **Gráfico** (Opcional v2): Consumo diário.
  - **Tabela**: Logs detalhados com paginação.
  - **Botão Exportar**: Ícone de download para CSV.

## 6. Regras de Negócio e Segurança
- Apenas administradores da própria organização podem ver seus logs.
- SysAdmins podem ver logs de qualquer organização.
- A exportação deve ser limitada a intervalos razoáveis (ex: máximo 90 dias por vez) para não sobrecarregar o banco.
