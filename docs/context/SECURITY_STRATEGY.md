# 🔐 Estratégia de Segurança - Compia Enterprise

> **Documento de Contexto para o Agente "O Gatekeeper"**

---

## 1. Arquitetura de Autenticação (Multi-Tenancy)

### 1.1 Princípio Fundamental

> **"Sua Org, Seus Dados"** - RLS como primeira linha de defesa.

O Compia é um sistema **multi-tenant** onde cada organização (cliente) tem seus dados completamente isolados. Um usuário da Organização A **NUNCA** deve ver dados da Organização B.

### 1.2 Fluxo de Autenticação

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Cliente   │────>│ tenantAuthMiddleware │────>│  RLS no Banco   │
│  (JWT/Cookie)│     │  (Valida + Contexto) │     │  (Filtra Dados) │
└─────────────┘     └─────────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │    TenantContext    │
                    │  - organizationId   │
                    │  - allowedOrgIds    │
                    │  - isSystemAdmin    │
                    └─────────────────────┘
```

### 1.3 Contexto de Tenant Seguro

**Arquivo:** `supabase/functions/api/tenant-auth-middleware.ts`

```typescript
interface TenantContext {
  organizationId: number;        // Org principal do usuário
  allowedOrganizationIds: number[]; // Orgs que pode acessar (subsidiárias)
  isSystemAdmin: boolean;        // Acesso total ao sistema
}
```

> ⚠️ **REGRA CRÍTICA:** O `organizationId` NUNCA vem do body/params da requisição. SEMPRE vem do token JWT ou do banco de dados.

---

## 2. Hierarquia de Roles (3 Perfis Oficiais)

> **IMPORTANTE:** O sistema utiliza apenas 3 perfis ativos. Os demais (`manager`, `client`) estão deprecados.

### 2.1 Roles Oficiais do Sistema

| Role | Código | Descrição | Permissões Principais |
|------|--------|-----------|----------------------|
| **System Admin** | `sys_admin` | Super-admin global (único: Tiago) | Acesso TOTAL, gerencia todas as orgs, CRM, faturamento |
| **Org Admin** | `org_admin` | Dono da organização | Gerencia usuários da org, deleta inspeções, configura org |
| **Inspector** | `inspector` | Técnico de campo | Cria/edita inspeções, tira fotos, gera PDFs |

> ⚠️ **Legado:** O código ainda referencia `system_admin`, `admin` e `sys_admin` de forma inconsistente. O padrão oficial é `sys_admin`.

### 2.2 Matriz de Permissões Completa (RBAC)

**Arquivo:** `supabase/functions/api/rbac-middleware.ts`

#### Escopos por Role

| Escopo | sys_admin | org_admin | inspector |
|--------|-----------|-----------|-----------|
| `users:read` | ✅ | ✅ | ❌ |
| `users:write` | ✅ | ✅ | ❌ |
| `users:delete` | ✅ | ❌ | ❌ |
| `users:invitations:read` | ✅ | ✅ | ❌ |
| `users:invitations:write` | ✅ | ✅ | ❌ |
| `checklist:folders:read` | ✅ | ✅ | ✅ |
| `checklist:folders:write` | ✅ | ✅ | ❌ |
| `checklist:folders:delete` | ✅ | ❌ | ❌ |
| `checklist:templates:read` | ✅ | ✅ | ✅ |
| `checklist:templates:write` | ✅ | ✅ | ❌ |
| `organizations:read` | ✅ | ✅ | ❌ |
| `organizations:write` | ✅ | ✅ | ❌ |
| `inspections:read` | ✅ | ✅ | ✅ |
| `inspections:write` | ✅ | ✅ | ✅ |
| `system:admin` | ✅ | ❌ | ❌ |

#### Operações por Módulo

| Módulo | Operação | sys_admin | org_admin | inspector |
|--------|----------|-----------|-----------|-----------|
| **Usuários** | Listar usuários | Todos | Sua org | ❌ |
| | Criar convite | ✅ | ✅ (mesma org) | ❌ |
| | Editar usuário | ✅ | Sua org | ❌ |
| | Excluir usuário | ✅ | ❌ | ❌ |
| | Promover a admin | ✅ | ❌ | ❌ |
| **Inspeções** | Listar | Todas | Sua org | Sua org |
| | Criar | ✅ | ✅ | ✅ |
| | Editar | ✅ | ✅ | ✅ (próprias) |
| | Excluir | ✅ | ✅ | ❌ |
| **Checklists** | Listar templates | Todos | Públicos + org | Públicos + org |
| | Criar template | ✅ | ✅ | ❌ |
| | Editar template | ✅ | ✅ (próprios) | ❌ |
| | Excluir template | ✅ | ❌ | ❌ |
| **Organização** | Ver configurações | ✅ | ✅ | ❌ |
| | Editar configurações | ✅ | ✅ | ❌ |
| | Ver faturamento | ✅ | ✅ | ❌ |
| **CRM** | Acesso completo | ✅ | ❌ | ❌ |
| **Dashboard Admin** | Métricas globais | ✅ | ❌ | ❌ |

### 2.3 Validação de Role no Código

**Padrão CORRETO:**
```typescript
import { USER_ROLES } from "./user-types.ts";

// ✅ CORRETO: Usar constantes
if (userRole === USER_ROLES.SYS_ADMIN) { ... }

// ❌ ERRADO: Strings hardcoded
if (userRole === 'admin') { ... }
if (userRole === 'system_admin') { ... }
```

### 2.4 Roles Deprecados (NÃO USAR)

| Role | Status | Motivo |
|------|--------|--------|
| `system_admin` | Legado | Substituído por `sys_admin` |
| `admin` | Legado | Ambíguo, substituído por `sys_admin` |
| `manager` | Deprecado | Funcionalidade absorvida por `org_admin` |
| `client` | Deprecado | Funcionalidade futura (viewer) |

---

## 3. Regras de RLS (Row Level Security)

### 3.1 Padrão de Implementação

> **SEMPRE usar `auth.uid()` para comparação nas policies.**

```sql
-- PADRÃO CORRETO
CREATE POLICY "Users can view own org data" ON inspections
FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
        UNION
        SELECT managed_organization_id FROM public.users WHERE id = auth.uid()
    )
);
```

### 3.2 Policies por Tabela Crítica

#### `inspections`
- **SELECT:** Usuário vê inspeções da sua org + subsidiárias
- **INSERT:** Usuário pode criar apenas na sua org
- **UPDATE:** Usuário pode editar apenas da sua org
- **DELETE:** Apenas org_admin ou system_admin

#### `users`
- **SELECT:** Próprio perfil OU admin vê usuários da mesma org
- **UPDATE:** Próprio perfil OU admin edita da mesma org
- **DELETE:** Apenas system_admin

#### `user_organizations`
- **SELECT:** Usuário vê apenas suas próprias memberships

#### `checklist_templates`
- **SELECT:** Templates públicos OU templates da org do usuário
- **DELETE:** Apenas system_admin

### 3.3 Checklist de Validação RLS

Para cada nova tabela:
- [ ] RLS está HABILITADO (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] Existe policy para SELECT
- [ ] Existe policy para INSERT (se aplicável)
- [ ] Existe policy para UPDATE (se aplicável)
- [ ] Existe policy para DELETE (se aplicável)
- [ ] Nenhuma policy usa `USING (true)` sem justificativa
- [ ] Testado com usuário de OUTRA organização

---

## 4. Gestão de Usuários (Admin)

### 4.1 Fluxo de Convite de Novo Usuário

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Org Admin      │     │  Sistema cria   │     │  Email enviado  │
│  clica "Convidar"│────>│  registro em    │────>│  com Magic Link │
│                 │     │  invitations    │     │  (7 dias válido)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Usuário ativo  │<────│  Registro em    │<────│  Novo usuário   │
│  na organização │     │  user_orgs      │     │  clica no link  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 4.2 Permissões por Operação

| Operação | system_admin | org_admin | manager | inspector |
|----------|--------------|-----------|---------|-----------|
| Listar usuários | Todos | Sua org + subsidiárias | Sua org | - |
| Criar convite | Sim | Sim (mesma org) | - | - |
| Editar usuário | Todos | Sua org (exceto admins) | - | - |
| Desativar usuário | Sim | Sua org (exceto admins) | - | - |
| Promover a admin | Sim | - | - | - |

### 4.3 Proteções de Segurança

**Arquivo:** `supabase/functions/api/security-protection.ts`

- Usuário principal (`eng.tiagosm@gmail.com`) é **INTOCÁVEL**
- Não é possível criar novos `system_admin` (exceto pelo principal)
- Tentativas de modificação são logadas em `security_audit_log`
- Auto-verificação de integridade via `autoIntegrityCheck()`

---

## 5. Vulnerabilidades Conhecidas (Backlog de Segurança)

> **Status Geral:** ✅ 11 de 12 vulnerabilidades RESOLVIDAS (30/01/2026)

### 5.1 Vulnerabilidades de RLS (Banco de Dados)

| ID | Severidade | Tabela/Componente | Descrição | Status |
|----|------------|-------------------|-----------|--------|
| **SEC-001** | 🔴 CRÍTICO | `crm_activities` | RLS policy usa `USING (true)` | ✅ **RESOLVIDO** - Migration 20260130000001 |
| **SEC-002** | 🟠 ALTO | `activity_log` | INSERT sem validar user_id | ✅ **RESOLVIDO** - Migration 20260130000001 |
| **SEC-003** | 🟠 ALTO | RLS Geral | Inconsistência auth.uid() vs current_setting | ✅ **RESOLVIDO** - Migration 20260130000002 |
| **SEC-004** | 🟡 MÉDIO | `crm_activities` | Sem FK para organization | ✅ **RESOLVIDO** - Migration 20260130000001 |
| **SEC-005** | 🟡 MÉDIO | Tabelas Críticas | Falta soft-delete | ⏳ **FUTURO** |

### 5.2 Vulnerabilidades de Backend (API)

| ID | Severidade | Arquivo | Descrição | Status |
|----|------------|---------|-----------|--------|
| **SEC-006** | 🔴 CRÍTICO | `index.ts` | Debug endpoint público | ✅ **RESOLVIDO** - Endpoint removido |
| **SEC-007** | 🔴 CRÍTICO | `calendar-routes.ts` | Debug endpoint público | ✅ **RESOLVIDO** - Endpoint removido |
| **SEC-008** | 🔴 CRÍTICO | `test-orgs.ts` | Debug endpoint público | ✅ **RESOLVIDO** - Endpoint removido |
| **SEC-009** | 🔴 CRÍTICO | `organizations-routes.ts` | SQL Injection | ✅ **RESOLVIDO** - Prepared statements |
| **SEC-010** | 🟠 ALTO | `asaas-webhook.ts` | Token opcional | ✅ **RESOLVIDO** - Validação obrigatória |
| **SEC-011** | 🟠 ALTO | Múltiplos arquivos | Roles hardcoded | ✅ **RESOLVIDO** - isSystemAdmin() |
| **SEC-012** | 🟠 ALTO | `inspection-routes.ts` | Validação de org | ✅ **RESOLVIDO** - Tenant validation |

### 5.3 Migrations de Segurança Aplicadas

```sql
-- Migrations criadas pelo Gatekeeper em 30/01/2026
supabase/migrations/
├── 20260130000001_fix_rls_security_gatekeeper.sql  # SEC-001, SEC-002, SEC-004
└── 20260130000002_standardize_rls_auth_uid.sql     # SEC-003
```

---

## 6. Próximos Passos

1. [ ] **URGENTE:** Corrigir RLS de `crm_activities` (SEC-001)
2. [ ] Auditar `activity_log` INSERT policy (SEC-002)
3. [ ] Padronizar uso de `auth.uid()` em todas policies (SEC-003)
4. [ ] Documentar fluxo completo de "Convidar Usuário" com código
5. [ ] Implementar soft-delete em tabelas críticas (SEC-005)

---

**Documento mantido por:** O Gatekeeper
**Última atualização:** 30/01/2026
