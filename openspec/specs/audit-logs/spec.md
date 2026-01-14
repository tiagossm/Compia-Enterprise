# Capability: Audit Logs & Traceability

Sistema de rastreabilidade completa para conformidade e segurança (LGPD).

## Purpose
Registrar e disponibilizar histórico de todas as ações críticas no sistema para auditoria e controle.

## Requirements

### Requirement: Access Control
O sistema MUST restringir o acesso aos logs.

#### Scenario: Permissão de Acesso
- **WHEN** usuário tenta acessar `/api/audit/logs`
- **THEN** o sistema verifica se o role é `sys_admin` ou `org_admin`
- **AND** retorna 403 Forbidden se não for

### Requirement: Data Isolation
O sistema MUST garantir isolamento de dados entre inquilinos.

#### Scenario: Filtro por Organização
- **WHEN** `org_admin` acessa os logs
- **THEN** o sistema força o filtro `organization_id` igual ao do usuário
- **AND** ele vê apenas ações de sua empresa e usuários

### Requirement: Export Capabilities
O sistema MUST permitir a extração de dados.

#### Scenario: Exportar CSV
- **WHEN** usuário solicita `/export`
- **THEN** o sistema gera um arquivo CSV com os logs filtrados
- **AND** inclui campos: Data, Usuário, Ação, Recurso, Organização

### Requirement: Security Events
O sistema MUST destacar eventos de segurança.

#### Scenario: Monitoramento de Falhas
- **WHEN** endpoint `/stats` é chamado
- **THEN** o sistema conta eventos do tipo `FAILED`, `DENIED`, ou `UNAUTHORIZED`
- **AND** retorna contagem separada como `security_alerts`
