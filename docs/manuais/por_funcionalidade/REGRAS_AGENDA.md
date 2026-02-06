# AGENDA_RULES.md

## 1. Visão Geral
Este documento define as regras de negócio, arquitetura e implementação do módulo de Agenda (Calendário) do sistema COMPIA.
O objetivo é garantir consistência (Lei de Chronos), evitar conflitos e oferecer alta performance.

## 2. As 3 Leis de Chronos (Imutáveis)

### Lei 1: UTC First (Timezone)
- **Backend/Banco**: Todas as datas DEVEM ser salvas em **UTC** (ISO 8601, ex: `2023-10-27T14:30:00Z`).
- **Frontend**: O frontend é responsável por converter UTC para o horário local do usuário ao exibir.
- **Transmissão**: APIs recebem e retornam sempre UTC.
- **Proibido**: Salvar horários como "2023-10-27 10:30" sem timezone explícito.

### Lei 2: Anti-Colisão (No Double Booking)
- **Bloqueio**: O sistema NÃO deve permitir criar dois eventos no mesmo horário para o mesmo recurso (usuário/sala), a menos que explicitamente forçado via flag `force_conflict`.
- **Verificação**: A verificação de conflito deve ocorrer no **Backend** antes de qualquer INSERT/UPDATE.
- **Scope**: Conflitos incluem:
  - Eventos de Calendário (reuniões, foco) versus Eventos de Calendário.
  - Eventos de Calendário versus Inspeções.
  - Inspeções versus Inspeções.
  - **Novo**: Eventos versus Feriados (Configuração da Organização).

### Lei 3: Performance de Renderização
- **Virtualização**: Ao renderizar listas longas ou meses com muitos eventos, usar virtualização.
- **Cache**: Evitar re-fetch desnecessário ao navegar entre visualizações (Mês/Semana/Dia) se os dados já estiverem carregados.
- **Lazy Loading**: Carregar detalhes de eventos pesados (anexos, logs) apenas sob demanda.

---

## 3. Arquitetura de Dados

### Tabelas Principais

#### `calendar_events`
Tabela primária para eventos gerais.
- `id`: PK
- `organization_id`: FK
- `title`: String
- `start_time`: Timestamp (UTC)
- `end_time`: Timestamp (UTC)
- `event_type`: Enum ('meeting', 'focus', 'block', 'other')
- `participants`: JSONB (Array de emails/IDs)

#### `inspections` (Integração)
Inspeções agendadas aparecem no calendário como eventos de leitura/escrita restrita.
- `id`: PK
- `scheduled_date`: Timestamp (UTC) -> Mapeado como `start_time`
- `status`: Enum
- `inspector_email`: Usado para verificar conflitos de participante.

#### `calendar_settings` (Nova - Configurações)
Armazena configurações globais da agenda por organização.
- `id`: PK
- `organization_id`: FK (Unique)
- `business_hours`: JSON (`{ start: "08:00", end: "18:00", days: [1,2,3,4,5] }`)
- `holidays`: JSON (`[{ date: "2026-12-25", name: "Natal" }]`)
- `timezone`: String (`America/Sao_Paulo`) - Default para cálculos backend

---

## 4. Integrações de Backend

### Rotas de API (`/api/calendar`)
- `GET /`: Retorna eventos combinados (`calendar_events` + `inspections`).
- `POST /`: Cria novo evento (com validação de conflito).
- `PUT /:id`: Atualiza evento (com validação de conflito).
- `DELETE /:id`: Remove evento.

### Rotas de Configuração (`/api/calendar-settings`)
- `GET /`: Retorna configurações da organização.
- `PUT /`: Atualiza configurações (Requer permissão de Admin).

### Rota de Teste (`/api/calendar/seed-test`)
- `GET /seed-test`: Gera 50 eventos aleatórios para o usuário atual para testes de performance.

---

## 5. Regras de Negócio Detalhadas

### 5.1. Detecção de Conflitos
A função `checkConflict` no backend verifica:
1. **Feriados**: Se a data coincide com um feriado configurado em `calendar_settings`.
2. **Sobreposição**: Se `(StartA < EndB) AND (EndA > StartB)`.
3. **Participantes**: Se o principal participante já tem compromisso.

Retorno de Conflito (HTTP 409):
```json
{
  "error": "Conflito de horário detectado",
  "conflicting_events": [ ... ],
  "violationType": "overlap" | "holiday" | "business_hours"
}
```

### 5.2. Tratamento de Inspeções
- Inspeções são cidadãos de primeira classe na agenda.
- Editar uma inspeção na agenda (arrastar/soltar) deve atualizar a data na tabela `inspections`.
- **Bug Conhecido Corrigido**: Título duplicado "Inspeção: Inspeção: ...". O sistema agora verifica prefixos antes de concatenar.

---

## 6. Checklist de Desenvolvimento

Verificar `task.md` para status atualizado.

### Pendências Futuras (Wishlist)
- [ ] Interface visual para editar Feriados e Horário Comercial (Frontend).
- [ ] Suporte a fusos horários múltiplos por participante.
- [ ] Integração bidirecional com Google Calendar (Sync).
