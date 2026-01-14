# Refatoração de Organizações e Atribuição de Usuários

## Objetivo
Permitir que um usuário esteja vinculado a múltiplas organizações (N-to-N), habilitando cenários onde um Inspetor (pertencente a uma Consultoria Master) possa acessar e realizar inspeções em várias Empresas Clientes. Além disso, definir claramente a hierarquia entre Master, Cliente e Subsidiária.

## Definições de Entidades

### Organização (Organization)
A entidade `organizations` deve possuir um tipo e nível hierárquico claro.

**Tipos (`type` ou `organization_level`):**
1.  **MASTER (Consultoria)**: A organização raiz do sistema ou do tenant principal. É a pagadora da licença. Seus usuários (Inspetores) prestam serviço para outras empresas.
2.  **CUSTOMER (Empresa Cliente)**: Uma empresa contratante ou atendida pela Master. Possui seus próprios dados, mas os inspetores da Master têm acesso.
3.  **SUBSIDIARY (Subsidiária/Filial)**: Uma unidade vinculada a uma Empresa Cliente (ou à Master). Herda regras da matriz.

### Vínculo Usuário-Organização (UserOrganization)
Nova tabela (ou consolidação de tabela existente) para relação N-to-N.
Remove a restrição de que o usuário só "pertence" a uma organização (embora mantenha uma organização "Home" ou "Empregadora").

**Tabela: `user_organizations`**
*   `user_id`: FK para `users`.
*   `organization_id`: FK para `organizations`.
*   `role`: Papel específico naquela organização (opcional, se o papel global `users.role` for suficiente, mas idealmente pode variar).
*   `is_primary`: Booleano para indicar a organização principal (empregadora).

## Mudanças no Fluxo

### 1. Atribuição de Usuários (Admin)
*   **Tela de Usuários**: O Admin (SysAdmin ou OrgAdmin da Master) poderá "Vincular Organização" a um usuário existente.
*   **Ação**: Criar registro na tabela `user_organizations`.
*   **Regra**: Um usuário pode ser `Inspector` na Master e ter acesso de `Inspector` (ou `Viewer`) em múltiplas Empresas Cliente.

### 2. Visualização (Usuário / Inspetor)
*   **Dashboard**: Deve agregar dados de TODAS as organizações vinculadas.
    *   Inspeções onde `organization_id` IN (suas organizações) OU `inspector_email` = seu email.
*   **Lista de Organizações**: O usuário deve ver:
    *   Sua organização principal.
    *   Todas as organizações onde foi vinculado manualmente.
*   **Nova Inspeção**: Ao criar inspeção, o seletor de "Cliente/Empresa" deve listar as organizações vinculadas.

## Plano de Implementação Técnica

### Fase 1: Banco de Dados
1.  Criar tabela `user_organizations` (se não existir).
2.  Migrar dados atuais (`users.organization_id`) para `user_organizations` (marcando como primary).
3.  Atualizar índices e Foreign Keys.

### Fase 2: Backend (API)
1.  **Middleware e Rotas**:
    *   Atualizar Middleware de Auth (`tenant-auth-middleware.ts`) para incluir `accessible_organizations` no contexto.
    *   Criar endpoint `GET /api/me/organizations`: Retorna a lista de todas as organizações acessíveis pelo usuário logado (Master + Clientes Vinculados).
    *   **Importante**: Revisar endpoints críticos (`/inspections`, `/dashboard`, `/action-items`, `/calendar`) para que *sempre* respeitem o `organization_id` passado como *Query Param* ou *Header*, priorizando-o sobre a organização "padrão" do usuário.

### Fase 3: Frontend (Contexto Global)
1.  **OrganizationContext**:
    *   Criar novo Contexto React `OrganizationContext`.
    *   **Estado**:
        *   `selectedOrganization`: Organização atualmente focada (objeto completo).
        *   `availableOrganizations`: Lista de todas as orgs acessíveis.
        *   `isLoading`: Estado de carregamento.
    *   **Persistência**: Ao selecionar uma empresa, salvar o ID no `localStorage` (`compia_selected_org_id`). Ao recarregar a página, restaurar essa seleção. Se não houver, selecionar a Principal.
2.  **Global Header Selector**:
    *   O componente de Dropdown no Header (visto no print "COMPIA") deve consumir `availableOrganizations`.
    *   Ao alterar: Atualiza `selectedOrganization` no contexto -> Dispara atualização em todas as telas.

### Fase 4: Impacto nos Sistemas (Refatoração de Telas)
Todos os módulos devem passar a "ouvir" o `selectedOrganization` do contexto e recarregar dados quando ele mudar:
*   **Dashboard**: Requisitar `/api/dashboard/stats?organization_id=X`.
*   **Inspeções**: Listar apenas inspeções de `organization_id=X`.
*   **Agenda**: Filtrar eventos da organização X.
*   **Relatórios/Planos de Ação**: Contexto específico.

## Plano de Implementação Técnica - Passos Detalhados

### 1. Banco de Dados (Imediato)
*   Criar tabela `user_organizations` (`user_id`, `organization_id`, `role`, `is_primary`).
*   Script de migração para popular tabela com dados existentes de `users`.

### 2. Backend API
*   Novo endpoint `GET /api/users/permissions` ou `/api/me/organizations`.
*   Ajuste em `dashboard-routes.ts` (já iniciado, mas refinar para garantir filtro estrito).

### 3. Frontend Core
*   Implementar `OrganizationProvider` envolvendo a aplicação (em `App.tsx` ou `main.tsx`).
*   Alterar `Header` para usar o Dropdown real.

### 4. Ajuste Fino (Telas)
*   Iterar por `Dashboard`, `CalendarView`, `InspectionList` injetando o filtro.

## Validação
*   Criar usuário na Master.
*   Criar organização Cliente A e Cliente B.
*   Vincular usuário a Cliente A e B.
*   Logar como usuário:
    *   Ver Dashboard consolidado.
    *   Conseguir criar inspeção para Cliente A.
    *   Conseguir ver detalhes do Cliente B.
