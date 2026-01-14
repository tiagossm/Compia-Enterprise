# Capability: Checklists Management

Gestão de templates de verificação, campos personalizados e geração assistida por IA.

## Purpose
Padronizar os critérios de inspeção através de templates reutilizáveis e flexíveis.

## Requirements

### Requirement: Template Visibility
O sistema MUST controlar a visibilidade dos templates.

#### Scenario: Templates Públicos
- **WHEN** um template é marcado como `is_public = true`
- **THEN** ele é visível para todas as organizações do sistema

#### Scenario: Templates Privados
- **WHEN** um template é privado
- **THEN** ele é visível apenas na organização de origem e suas subsidiárias

### Requirement: AI Generation
O sistema MUST permitir a criação automática de checklists via IA.

#### Scenario: Geração com Limites
- **WHEN** usuário solicita geração via `/generate-ai-simple`
- **THEN** o sistema verifica limites de taxa (Rate Limit) da organização
- **AND** retorna estrutura JSON validada com campos sugeridos

### Requirement: Template Lifecycle
O sistema MUST garantir integridade na exclusão.

#### Scenario: Exclusão de Template
- **WHEN** usuário solicita exclusão de template
- **THEN** o sistema remove primeiro todos os campos associados
- **AND** depois remove o template (Cascade Delete manual)

### Requirement: Field Management
O sistema MUST suportar diversos tipos de resposta.

#### Scenario: Tipos de Campo
- **WHEN** criando campos
- **THEN** tipos permitidos são: boolean, text, textarea, select, multiselect, radio, rating, file
- **AND** campos 'select/radio' devem ter opções definidas
