# 🛡️ Políticas de Segurança e RLS (Row Level Security) - Versão 1.0

> **Status**: ✅ Implementado e Validado
> **Data**: 01/02/2026
> **Responsável**: `security-auditor` / `database-architect`
> **Autor**: `documentation-writer`

Este documento detalha o modelo de segurança aplicado ao banco de dados Supabase do Compia, garantindo isolamento de dados entre empresas (Multi-tenancy) e controle de acesso baseado em função (RBAC).

---

## 👥 Perfis de Acesso (Roles)

O sistema utiliza os seguintes perfis hierárquicos, definidos em `USER_ROLES`:

| Perfil | Identificador DB | Descrição | Escopo de Acesso |
| :--- | :--- | :--- | :--- |
| **System Admin** | `system_admin` | Administrador Global | **Total**. Vê todas as empresas, planos e métricas. Pode impersonar. |
| **Organization Admin** | `org_admin` | Dono da Empresa | **Total na Org**. Gerencia filiais, usuários e faturas da *sua* empresa. |
| **Manager** | `manager` | Gerente de Unidade | **Parcial**. Gerencia dados de uma filial ou unidade específica. |
| **Inspector** | `inspector` | Técnico / Auditor | **Operacional**. Cria vistorias, checklists e relatórios. Não deleta dados. |
| **Client** | `client` | Cliente Final | **Leitura**. Visualiza relatórios e dashboards. Não edita nada. |

---

## 🔒 Matriz de Permissões RLS

As políticas abaixo são aplicadas diretamente no banco de dados PostgreSQL via Row Level Security.

### 1. Checklists & Templates
*Recurso Core: Modelos utilizados para inspeções.*

| Ação | System Admin | Org Admin | Inspector | Client |
| :--- | :---: | :---: | :---: | :---: |
| **SELECT (Ver)** | ✅ Tudo | ✅ Tudo da Org | ✅ Tudo da Org | ✅ Tudo da Org |
| **INSERT (Criar)** | ✅ | ✅ | ✅ | ❌ |
| **UPDATE (Editar)** | ✅ | ✅ | ⚠️ Próprios* | ❌ |
| **DELETE (Apagar)** | ✅ | ✅ | ❌ | ❌ |

> **Nota**: Inspectors podem criar seus próprios checklists e editar apenas os que criaram. Apenas Admins podem apagar checklists da organização.

### 2. Inspeções (Audit Logs / Reports)
*Recurso Core: Vistorias realizadas em campo.*

| Ação | System Admin | Org Admin | Inspector | Client |
| :--- | :---: | :---: | :---: | :---: |
| **SELECT (Ver)** | ✅ Tudo | ✅ Tudo da Org | ✅ Tudo da Org | ✅ Tudo da Org |
| **INSERT (Criar)** | ✅ | ✅ | ✅ | ❌ |
| **UPDATE (Editar)** | ✅ | ✅ | ✅ | ❌ |
| **DELETE (Apagar)** | ✅ | ✅ | ❌ | ❌ |

> **Proibição de Delete**: Para garantir a integridade dos dados e rastreabilidade (compliance), inspetores **NÃO** podem deletar inspeções realizadas. Apenas Admins podem realizar essa limpeza se estritamente necessário.

### 3. Action Items (Planos de Ação)
*Tarefas geradas a partir de não-conformidades.*

| Ação | System Admin | Org Admin | Inspector | Client |
| :--- | :---: | :---: | :---: | :---: |
| **SELECT (Ver)** | ✅ Tudo | ✅ Tudo da Org | ✅ Tudo da Org | ✅ Tudo da Org |
| **INSERT (Criar)** | ✅ | ✅ | ✅ | ❌ |
| **UPDATE (Editar)** | ✅ | ✅ | ✅ | ❌ |
| **DELETE (Apagar)** | ✅ | ✅ | ❌ | ❌ |

### 4. Pastas de Checklists
*Organização lógica de templates.*

| Ação | System Admin | Org Admin | Inspector | Client |
| :--- | :---: | :---: | :---: | :---: |
| **SELECT (Ver)** | ✅ Tudo | ✅ Tudo da Org | ✅ Tudo da Org | ✅ Tudo da Org |
| **INSERT (Criar)** | ✅ | ✅ | ✅ | ❌ |
| **UPDATE (Editar)** | ✅ | ✅ | ❌ | ❌ |
| **DELETE (Apagar)** | ✅ | ✅ | ❌ | ❌ |

> **Proteção Estrutural**: Inspectors podem criar novas pastas para se organizar, mas não podem renomear ou apagar pastas existentes para evitar desorganização da estrutura da empresa.

---

## 🛠️ Detalhes Técnicos da Implementação

### Isolamento Multi-Tenant
Todas as tabelas críticas possuem uma coluna `organization_id`.
*   A política `tenant_isolation` garante que: `organization_id` do registro = `organization_id` do usuário logado.
*   Usuários `system_admin` ignoram essa restrição (`BYPASS RLS` simulado via política `true`).

### Segurança de Dados Sensíveis
*   **Integrações e Credenciais**: Tabelas como `integrations`, `api_keys` são visíveis **apenas** para `org_admin` e `system_admin`.
*   **Users**: Usuários comuns só veem perfil público básico (Nome/Avatar) de colegas. Dados como email/telefone/role completo são restritos.

### Validação
Esta política foi validada com testes automatizados cobrindo os cenários de:
1.  Tentativa de acesso cross-tenant (falha esperada).
2.  Tentativa de delete por inspector (falha esperada).
3.  Acesso readonly por client (sucesso leitura / falha escrita).
