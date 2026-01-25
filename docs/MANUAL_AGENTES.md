# Guia: Como Usar Seus Agentes

Agora que os seus agentes estão organizados, você tem um time de elite pronto para ajudar.

---

## 🤖 Especialistas Disponíveis

Você tem um time de elite pronto para ajudar em diferentes áreas. Aqui estão os principais:

| Agente | Especialidade | Quando Chamar? |
| :--- | :--- | :--- |
| **`orchestrator`** | Gestão de Time | Para tarefas que tocam várias áreas ao mesmo tempo. |
| **`project-planner`** | Planejamento | Para criar checklists, planos de implementação e roteiros. |
| **`frontend-specialist`** | UI/UX (Web) | Criar componentes, telas em React e estilos CSS impecáveis. |
| **`backend-specialist`** | Lógica e APIs | Rotas Node.js/Hono, lógica de negócios e integrações. |
| **`database-architect`** | SQL e Banco | Criar tabelas, migrations e otimizar queries no Supabase. |
| **`security-auditor`** | Segurança | Auditar autenticação, RLS e vulnerabilidades. |
| **`debugger`** | Correção de Erros | Investigar e resolver bugs complexos e erros 500. |
| **`test-engineer`** | Testes | Criar testes unitários, E2E e garantir qualidade. |
| **`devops-engineer`** | Deploy e Infra | Configurar Vercel, CI/CD e monitoramento. |
| **`mobile-developer`** | App Mobile | Se precisar de React Native ou Flutter no futuro. |
| **`documentation-writer`**| Manuais | Para escrever guias de uso (ISO 9001) e documentação técnica. |
| **`seo-specialist`** | Google/SEO | Para otimizar a visibilidade do Compia. |
| **`designer-visual`** | Design System | Chame para gerar sistemas de design completos com a skill `ui-ux-pro-max`. |

*Existem outros especialistas como `performance-optimizer`, `game-developer`, `qa-automation-engineer` e `code-archaeologist` também disponíveis.*

---

## 🚀 1. Durante o Desenvolvimento (Modo "Parcer")

Como você está usando o kit `ag-kit`, você pode me pedir para assumir "personas" específicas para resolver problemas complexos.

### Como invocar:
Basta me chamar usando comandos ou pedindo uma especialidade:
- `/plan`: "Crie um plano para um novo sistema de filtros na tela de inspeções."
- `/debug`: "O erro 500 está voltando nesse endpoint, use o agente `debugger` para investigar."
- `/create`: "Crie um novo componente de gráfico usando o `frontend-specialist`."
- `/design`: "Use o `designer-visual` para desenhar a nova tela de CRM."

**Vantagem**: Eu usarei as regras, checklists e conhecimentos específicos que estão guardados na pasta `.agent`.

---

## 💻 2. No Código do Compia (Modo "App")

Você pode criar lógica de inteligência artificial na pasta de agentes e chamá-la de dentro do seu aplicativo.

### Passo 1: Defina o Agente
Abra o arquivo `compia-agents/index.ts` (se existir). Lá, você pode criar a lógica do seu agente.

### Passo 2: Use no Compia
Em qualquer parte do projeto Compia (React ou Edge Functions):

```typescript
// Exemplo conceitual
import { AnalisadorRelatorio } from "@compia/agents";
// const res = await AnalisadorRelatorio.run(meusDados);
```
