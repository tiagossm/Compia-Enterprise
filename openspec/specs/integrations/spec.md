# Capability: Integrations & Notifications

Conectividade externa e sistema de alertas.

## Purpose
Manter o usuário informado e sincronizado com ferramentas externas (Google Calendar/Gmail).

## Requirements

### Requirement: Google OAuth
O sistema MUST integrar com conta Google do usuário.

#### Scenario: Sincronização de Agenda
- **WHEN** usuário autoriza via `/google/authorize-url`
- **THEN** sistema armazena token seguro
- **AND** eventos criados na plataforma são espelhados no Google Calendar

### Requirement: Notifications
O sistema MUST notificar ações importantes internamente.

#### Scenario: Leitura de Notificação
- **WHEN** usuário marca notificação como lida
- **THEN** contador de não-lidas decrementa
- **AND** estado persiste no banco (`read = true`)

### Requirement: Security
O sistema MUST gerenciar o ciclo de vida dos tokens.

#### Scenario: Desconexão
- **WHEN** usuário desconecta integração ou revoga acesso no Google
- **THEN** sistema remove tokens do banco local (`DELETE FROM integrations`)
