# Capability: Gamification

Sistema de engajamento via XP, níveis e rankings.

## Purpose
Incentivar o uso da plataforma através de recompensas gamificadas por ações completadas.

## Requirements

### Requirement: XP Calculations
O sistema MUST calcular nível baseado em XP acumulado.

#### Scenario: Progressão de Nível
- **WHEN** usuário ganha XP (ex: completar inspeção, plano de ação)
- **THEN** sistema recalcula nível usando fórmula quadrática `floor(sqrt(XP / 50)) + 1`
- **AND** atualiza tabela `user_gamification`

### Requirement: Leaderboards
O sistema MUST exibir ranking segregado por organização.

#### Scenario: Visualização do Ranking
- **WHEN** usuário acessa leaderboard
- **THEN** sistema filtra apenas usuários da **mesma organização**
- **AND** ordena por XP total decrescente (Top 10)
