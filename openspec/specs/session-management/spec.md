# Capability: Session Management

Gerenciamento de sessões de usuário para garantir segurança e prevenir acesso simultâneo não autorizado.

## Requirements

### Requirement: Single Active Session
O sistema DEVE permitir apenas uma sessão ativa por usuário simultaneamente.

#### Scenario: Novo login invalida anterior
- **WHEN** um usuário realiza login com sucesso em um novo dispositivo
- **THEN** a sessão anterior (se existir) é invalidada
- **AND** o novo `session_id` é registrado no banco de dados

### Requirement: Session Validation
O sistema DEVE validar o identificador da sessão em cada requisição protegida.

#### Scenario: Sessão válida
- **WHEN** uma requisição contém um `X-Session-Id` ou cookie correspondente ao `current_session_id` do usuário no banco
- **THEN** a requisição é processada normalmente

#### Scenario: Detecção de Conflito de Sessão
- **WHEN** uma requisição contém um `session_id` diferente do `current_session_id` armazenado (indicando login em outro lugar)
- **THEN** o sistema retorna erro 401
- **AND** o corpo da resposta inclui o código `SESSION_CONFLICT`
- **AND** informa qual dispositivo iniciou a nova sessão

### Requirement: Logout
O sistema DEVE remover a sessão ativa ao realizar logout.

#### Scenario: Logout explícito
- **WHEN** o usuário solicita logout
- **THEN** o campo `current_session_id` é removido (null) no banco de dados
