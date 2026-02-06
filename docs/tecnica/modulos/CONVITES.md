# Módulo de Convites - Especificação Técnica

**Versão:** 1.0  
**Data:** 2026-02-05  
**Autor:** Equipe Compia  
**Classificação:** Interno - Desenvolvimento

---

## 1. Visão Geral

Sistema de onboarding por convite que substitui o cadastro aberto. Permite que administradores convidem usuários para suas organizações via email.

### Características
- ✅ Um email pode receber convites de múltiplas organizações
- ✅ Controle de limite de usuários por plano
- ✅ Expiração automática (7 dias)
- ✅ Auditoria completa de ações

---

## 2. Arquitetura

```mermaid
flowchart TD
    A[OrgAdmin] -->|POST /invitations| B[API Edge Function]
    B -->|Verifica Limite| C[(Supabase DB)]
    B -->|Envia Email| D[Email Worker]
    D -->|Resend API| E[Usuário]
    E -->|Clica Link| F[/invite/accept?token=xxx]
    F -->|POST /accept| B
    B -->|Vincula| C
```

---

## 3. Modelo de Dados

### Tabela: `organization_invitations`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | PK |
| organization_id | BIGINT | FK → organizations |
| email | TEXT | Email do convidado (lowercase) |
| role | TEXT | Função atribuída |
| token | TEXT | Token seguro (nunca exposto) |
| status | TEXT | pending/accepted/expired/revoked |
| expires_at | TIMESTAMPTZ | Data de expiração |
| created_by | UUID | FK → users (quem convidou) |
| created_at | TIMESTAMPTZ | Data de criação |
| accepted_at | TIMESTAMPTZ | Quando aceito |
| accepted_by | UUID | FK → users |
| revoked_by | UUID | FK → users |
| resend_count | INT | Quantidade de reenvios |

### Relacionamentos
- `organization_invitations` → `organizations` (N:1)
- `organization_invitations` → `users` (N:1, created_by)
- Ao aceitar: `user_organizations` (N:N)

---

## 4. API Endpoints

### POST /api/invitations
**Enviar convite(s)**
```typescript
// Request
{ emails: ["a@b.com", "c@d.com"], role: "inspector" }

// Response 201
{ 
  success: true, 
  invitations: [{ id, email, expires_at }],
  failed: [] 
}

// Response 403 (limite)
{ error: "plan_limit_reached", available: 0, required: 2 }
```

### POST /api/invitations/:id/revoke
**Revogar convite**
```typescript
// Response 200
{ success: true, freed_slot: true }
```

### POST /api/invitations/:id/resend
**Reenviar email**
```typescript
// Response 200
{ success: true, new_expires_at: "2026-02-12T..." }
```

### GET /api/invitations/validate
**Validar token (frontend)**
```typescript
// Request
?token=abc123

// Response 200 (válido)
{ valid: true, organization_name: "Empresa X", role: "inspector" }

// Response 400 (inválido)
{ valid: false, reason: "expired" }
```

### POST /api/invitations/accept
**Aceitar convite**
```typescript
// Request (usuário autenticado)
{ token: "abc123" }

// Response 200
{ success: true, organization_id: 1, redirectTo: "/dashboard" }
```

---

## 5. Segurança

### RLS (Row Level Security)
- OrgAdmin: CRUD apenas na sua organização
- SysAdmin: Acesso total
- Token: Nunca exposto via SELECT

### Validação de Token
- Função `SECURITY DEFINER` no PostgreSQL
- Token validado apenas server-side
- Hash comparado, não exposto em logs

### Auditoria
- Todas ações registradas com `created_by`, `revoked_by`
- Timestamps de cada operação

---

## 6. Integrações

### Email Worker
Novo tipo de email: `invitation`
```typescript
case 'invitation':
  subject = `Convite para ${data.organizationName}`;
  html = getInvitationTemplate(data.inviterName, data.organizationName, data.inviteUrl);
```

### Dashboard
Nova métrica BI:
```sql
SELECT status, COUNT(*) FROM organization_invitations
WHERE organization_id = ? GROUP BY status;
```

### Users.tsx
- Modal de envio em massa
- Indicador "Vagas: 3/5"
- Ações: Revogar, Reenviar, Copiar Link

---

## 7. Tratamento de Erros

| Código | Cenário | Ação |
|--------|---------|------|
| 400 | Token expirado | Mostrar "Solicite novo convite" |
| 403 | Limite do plano | Mostrar "Faça upgrade" |
| 409 | Email já convidado | Mostrar "Convite já existe" |
| 500 | Falha email | Marcar `email_failed`, permitir copiar link |

---

## 8. Cronograma de Deployment

1. **Migration SQL** → Criar tabela + RLS
2. **Email Worker** → Template de convite
3. **API** → Rotas de convite
4. **Frontend** → Página de aceitação
5. **Testes** → Validação E2E

---

## 9. Referências

- [ISO 27001 - Controle de Acesso](https://www.iso.org/standard/27001)
- [LGPD - Art. 7º (Consentimento)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
