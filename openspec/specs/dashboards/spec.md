# Capability: Dashboards & KPIs

Visualização executiva de indicadores de performance em segurança.

## Purpose
Prover insights rápidos sobre status das inspeções e planos de ação para tomada de decisão.

## Requirements

### Requirement: Organizational Filters
O sistema MUST aplicar filtros hierárquicos de organização.

#### Scenario: Org Admin View
- **WHEN** Org Admin acessa dashboard
- **THEN** visualiza dados agregados da matriz e filiais (subsidiárias)

#### Scenario: Standard User View
- **WHEN** usuário comum acessa dashboard
- **THEN** visualiza apenas dados onde é inspetor ou responsável

### Requirement: Action Plan Summary
O sistema MUST destacar pendências críticas.

#### Scenario: Alerta de Vencidos
- **WHEN** data atual > `deadline` e status != `completed`
- **THEN** incrementa contador `overdue_actions`
- **AND** destaca prioridade alta separadamente
