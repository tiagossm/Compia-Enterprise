# Capability: Calendar & Scheduling

Gestão unificada de eventos, agendamentos de inspeção e prazos de planos de ação.

## Purpose
Prover uma visão temporal única de todas as atividades críticas da organização, permitindo agendamento e sincronização de equipes.

## Requirements

### Requirement: Unified Timeline
O sistema MUST agregar múltiplas fontes de dados na visualização de calendário.

#### Scenario: Agregação de Eventos
- **WHEN** usuário solicita a agenda (/api/calendar)
- **THEN** retorna eventos manuais (`calendar_events`)
- **AND** inspeções agendadas (`inspections`)
- **AND** prazos de planos de ação (`action_plans`)

### Requirement: Cross-Organization Visibility
O sistema MUST respeitar a visibilidade hierárquica e participativa.

#### Scenario: Eventos de Outras Organizações
- **WHEN** o evento pertence a uma organização diferente da gerenciada pelo usuário
- **THEN** o evento é marcado como `readonly: true`
- **AND** o usuário não pode editá-lo

### Requirement: Inspection Integration
O sistema MUST permitir criar e editar inspeções diretamente via calendário.

#### Scenario: Criar Inspeção via Agenda
- **WHEN** cria evento com `event_type: 'inspection'`
- **THEN** o sistema cria um registro na tabela `inspections`
- **AND** define status inicial como 'scheduled'

#### Scenario: Editar Inspeção via Agenda
- **WHEN** atualiza um evento com ID virtual (ex: `inspection-123`)
- **THEN** o sistema atualiza a inspeção correspondente
- **AND** mapeia campos de agenda (start_time) para campos de inspeção (scheduled_date)

### Requirement: RSVP
O sistema MUST permitir que convidados aceitem ou recusem convites.

#### Scenario: Responder Convite
- **WHEN** usuário envia resposta (accepted/declined) para `/respond`
- **THEN** o sistema atualiza as listas `accepted_by` e `declined_by` do evento ou inspeção
