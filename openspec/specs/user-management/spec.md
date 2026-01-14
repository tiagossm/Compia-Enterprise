# Capability: User Management & RBAC

Gestão completa do ciclo de vida de usuários, papéis e permissões.

## Purpose
Controlar quem acessa o sistema e o que podem fazer, garantindo segurança e hierarquia corporativa.

## Requirements

### Requirement: Role-Based Access Control (RBAC)
O sistema MUST restringir ações baseadas no papel (Role).

#### Scenario: Atualizar Permissões
- **WHEN** System Admin acessa `/role-permissions`
- **THEN** pode ativar/desativar capacidades específicas (ex: `users:delete`) para cada Role
- **AND** essas mudanças refletem imediatamente para todos os usuários daquele papel

### Requirement: User Lifecycle
O sistema MUST gerenciar convites e desligamentos.

#### Scenario: Revogar Convite
- **WHEN** Admin cancela um convite pendente
- **THEN** o token de convite é invalidado (`accepted_at = NOW()`)
- **AND** log de auditoria registra a revogação

### Requirement: System Protection
O sistema MUST proteger contas críticas contra exclusão acidental ou maliciosa.

#### Scenario: Proteção SysAdmin
- **WHEN** alguém tenta excluir ou bloquear o usuário `eng.tiagosm@gmail.com`
- **THEN** o sistema retorna `403 Forbidden` (Proteção Hardcoded)
