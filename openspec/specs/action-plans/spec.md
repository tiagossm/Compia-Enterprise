# Capability: Action Plans Management (5W2H)

Gestão centralizada de planos de ação, tarefas e não-conformidades.

## Purpose
Garantir que não-conformidades identificadas em inspeções sejam tratadas através de tarefas rastreáveis (5W2H).

## Requirements

### Requirement: Centralized Visibility
O sistema MUST consolidar itens de diversas fontes.

#### Scenario: Agregação de Ações
- **WHEN** usuário acessa Central de Atividades
- **THEN** visualiza tarefas manuais
- **AND** planos de ação gerados em inspeções
- **AND** filtros por prioridade e status

### Requirement: Inspection Integration
O sistema MUST manter vínculo com a inspeção de origem.

#### Scenario: Rastreabilidade
- **WHEN** um plano é criado a partir de uma inspeção
- **THEN** o sistema armazena `inspection_id` e `inspection_item_id`
- **AND** permite navegar da tarefa para a inspeção

### Requirement: Gamification Hooks
O sistema MUST recompensar a conclusão de tarefas.

#### Scenario: Recompensa por Conclusão
- **WHEN** o status é alterado para 'completed'
- **THEN** o sistema aciona módulo de Gamification (+20 XP)
- **AND** verifica prazo para bônus extra (Future)

### Requirement: Google Calendar Sync
O sistema MUST sincronizar prazos com Google Calendar se autorizado.

#### Scenario: Sync de Prazo
- **WHEN** criando tarefa com `google_token` e `when_deadline`
- **THEN** cria evento no Google Calendar
- **AND** salva `google_event_id` localmente
