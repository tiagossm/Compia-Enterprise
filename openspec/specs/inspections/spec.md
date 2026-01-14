# Capability: Inspections

Gerenciamento do ciclo de vida das inspeções de segurança e conformidade.

## Purpose
Permitir que inspetores criem, executem e entreguem relatórios de inspeção, garantindo rastreabilidade e controle de acesso por organização.

## Requirements

### Requirement: Inspection Access Control
O sistema MUST restringir o acesso às inspeções com base no papel do usuário e sua organização.

#### Scenario: System Admin Access
- **WHEN** o usuário é 'sys_admin'
- **THEN** ele pode visualizar TODAS as inspeções do sistema

#### Scenario: Org Admin Access
- **WHEN** o usuário é 'org_admin'
- **THEN** ele pode visualizar inspeções da sua organização
- **AND** inspeções de organizações subsidiárias

#### Scenario: Inspector Access
- **WHEN** o usuário é 'inspector'
- **THEN** ele pode visualizar inspeções criadas por ele
- **OR** inspeções vinculadas à sua organização

### Requirement: Inspection Creation
O sistema MUST permitir a criação de inspeções apenas para usuários autorizados.

#### Scenario: Criação Autorizada
- **WHEN** usuário tem papel 'inspector' ou superior
- **AND** pertence a uma organização válida
- **THEN** a inspeção é criada com status 'pendente'
- **AND** o `organization_id` é forçado pelo contexto seguro (não aceita injeção)

### Requirement: Inspection Updates
O sistema MUST registrar auditoria detalhada de todas as alterações.

#### Scenario: Atualização de Campos
- **WHEN** um usuário edita uma inspeção
- **THEN** o sistema registra logs de auditoria para cada campo alterado (LGPD)
- **AND** registra IP e User-Agent da alteração

### Requirement: Workflow Status Transitions
O sistema MUST validar as transições de status da inspeção.

#### Scenario: Iniciar Inspeção
- **WHEN** status muda para 'in_progress'
- **THEN** o sistema pode registrar geolocalização de início (lat/lng)
- **AND** registra data de início do servidor

#### Scenario: Entregar Relatório
- **WHEN** endpoint `/deliver` é chamado
- **THEN** status muda para 'delivered'
- **AND** `pdf_report_url` é atualizado
- **AND** data de entrega é registrada

### Requirement: Security Logic
O sistema MUST prevenir a alteração de propriedade da inspeção.

#### Scenario: Bloqueio de Troca de Organização
- **WHEN** usuário tenta alterar `organization_id` via API
- **THEN** o sistema bloqueia a requisição (Erro 403)
- **AND** emite alerta de segurança nos logs
