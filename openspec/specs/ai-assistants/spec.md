# Capability: AI Assistants & Auto-Suggest

Configuração de assistentes virtuais especialistas e sistema de autossugestão inteligente.

## Purpose
Prover assistência especializada na inspeção e agilizar o preenchimento de formulários com sugestões contextuais.

## Requirements

### Requirement: Specialist Configuration
O sistema MUST permitir a configuração de assistentes especialistas (NRs).

#### Scenario: Criação de Especialista
- **WHEN** um administrador cria um novo assistente (`/api/ai-assistants`)
- **THEN** define nome, especialização (ex: NR-35) e instruções de prompt
- **AND** o assistente fica disponível para uso em inspeções

### Requirement: Contextual Auto-Suggest
O sistema MUST sugerir dados baseados no histórico e contexto.

#### Scenario: Sugestão de Empresas
- **WHEN** usuário digita no campo de empresa
- **THEN** sistema busca em `organizations` (Admin vê todas, Usuário vê as vinculadas)
- **AND** retorna lista de nomes/CNPJ compatíveis

#### Scenario: Sugestão de Inspetores
- **WHEN** usuário busca inspetor
- **THEN** sistema prioriza usuários cadastrados com role `inspector`
- **AND** depois sugere nomes históricos de inspeções passadas

### Requirement: Seeding
O sistema MUST vir com especialistas padrão pré-populados.

#### Scenario: Inicialização (Seed)
- **WHEN** endpoint `/seed` é chamado
- **THEN** recria os assistentes padrão (NR-35, NR-10, NR-12, etc.)
