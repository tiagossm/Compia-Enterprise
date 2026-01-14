# Capability: Organizations Management

Gerenciamento da estrutura multi-tenant de organizações e subsidiárias, incluindo relacionamentos N-para-N com usuários e filtragem global.

## Purpose
Permitir a criação e gestão hierárquica de empresas, controlar permissões, e gerenciar o acesso de usuários a múltiplas organizações contextualmente.

## Definitions

### Hierarquia de Organização
A entidade `organizations` possui níveis hierárquicos definidos:
1.  **MASTER (Consultoria)**: Organização raiz, prestadora de serviços (ex: Inspetores).
2.  **CUSTOMER (Empresa Cliente)**: Empresa contratante que possui dados próprios.
3.  **SUBSIDIARY (Subsidiária/Filial)**: Unidade vinculada a uma Empresa Cliente.

### Relacionamento Usuário-Organização
O sistema suporta vínculos N-para-N (Muitos-para-Muitos) via tabela `user_organizations`.
-   Um usuário possui uma organização "Empregadora" (`is_primary`).
-   Um usuário pode ter acesso a múltiplas organizações secundárias (ex: Inspetor acessando vários Clientes).

## Global Context Behavior
O frontend opera com um **Contexto Global de Organização** (`OrganizationContext`).
-   **Seleção**: O usuário seleciona a organização ativa no Header.
-   **Persistência**: A seleção é salva localmente (`localStorage`).
-   **Filtragem**: Todas as visualizações (Dashboard, Inspeções, Agenda) filtram dados automaticamente pelo ID da organização selecionada.

## Requirements

### Requirement: Organization Hierarchy
O sistema MUST suportar níveis hierárquicos de organizações.

#### Scenario: Visualização de Subsidiárias
- **WHEN** um 'org_admin' solicita a lista de organizações
- **THEN** o sistema retorna a organização gerenciada
- **AND** todas as suas subsidiárias (`parent_organization_id`)

### Requirement: N-to-N Access
O sistema MUST permitir que usuários acessem dados de múltiplas organizações às quais estão vinculados.

#### Scenario: Visualização Multi-tenant
- **WHEN** um usuário acessa o endpoint `/me` ou `/me/organizations`
- **THEN** o sistema retorna todas as organizações onde o usuário tem vínculo
- **AND** o frontend disponibiliza estas opções no seletor global

### Requirement: Organization Creation
O sistema MUST restringir a criação de novas organizações.

#### Scenario: Permissão de Criação
- **WHEN** usuário tem flag `can_create_organizations` ou é System Admin
- **THEN** pode criar novas empresas
- **AND** define o nível (Company/Subsidiary) automaticamente baseado no pai

### Requirement: Safe Deletion
O sistema MUST impedir a exclusão de organizações com dados ativos.

#### Scenario: Bloqueio por Usuários Ativos
- **WHEN** tenta excluir uma organização que possui usuários ativos
- **THEN** retorna erro 400
- **AND** mensagem "Não é possível excluir... possui usuários"

#### Scenario: Bloqueio por Inspeções
- **WHEN** tenta excluir uma organização com inspeções vinculadas
- **THEN** retorna erro 400

#### Scenario: Soft Delete
- **WHEN** exclusão é permitida (sem dependências)
- **THEN** `is_active` é definido como false
- **AND** os dados são preservados no banco

### Requirement: Usage Tracking
O sistema MUST contabilizar o uso de recursos (IA).

#### Scenario: Incremento de Uso
- **WHEN** endpoint `/increment-ai-usage` é chamado
- **THEN** incrementa `ai_usage_count` da organização
- **AND** registra log de uso
