# Capability: User Authentication

Módulo responsável pela autenticação de usuários via email/senha e validação de sessão.

## Purpose
Garantir que apenas usuários aprovados e com credenciais válidas possam acessar o sistema.

## Requirements

### Requirement: Email Login
O sistema MUST permitir login via email e senha.

#### Scenario: Login com sucesso
- **WHEN** usuário envia email e senha corretos
- **AND** o status de aprovação é 'approved'
- **THEN** o sistema retorna status 200
- **AND** define o cookie `mocha-session-token`
- **AND** atualiza o `last_login_at`

#### Scenario: Falha por credenciais inválidas
- **WHEN** usuário envia email não cadastrado ou senha incorreta
- **THEN** o sistema retorna erro 401 "Credenciais inválidas"

#### Scenario: Login Social (Google)
- **WHEN** o usuário tenta login com email que não possui senha (criado via Google)
- **THEN** o sistema retorna erro 401 com mensagem instruindo login via Google

### Requirement: Account Approval Check
O sistema MUST impedir acesso de usuários com cadastro pendente ou recusado.

#### Scenario: Conta Pendente
- **WHEN** usuário tenta fazer login ou acessar `/me`
- **AND** `approval_status` é 'pending'
- **THEN** retorna erro 403 `APPROVAL_PENDING`
- **AND** mensagem "Conta em análise"

#### Scenario: Conta Recusada
- **WHEN** usuário tenta fazer login
- **AND** `approval_status` é 'rejected'
- **THEN** retorna erro 403 `APPROVAL_REJECTED`
- **AND** mensagem "Conta recusada"

### Requirement: Session Persistence
O sistema MUST manter a autenticação através de cookies HTTP-only.

#### Scenario: Validação de Cookie
- **WHEN** requisição contém cookie `mocha-session-token` válido
- **THEN** endpoint `/me` retorna os dados do usuário

#### Scenario: Logout
- **WHEN** requisição POST para `/logout`
- **THEN** o cookie de sessão é removido
