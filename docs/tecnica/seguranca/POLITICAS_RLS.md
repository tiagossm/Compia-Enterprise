# Arquitetura de Segurança e RLS (Row Level Security)

> **Versão:** 1.0
> **Contexto:** Supabase PostgreSQL

---

## 1. Princípio Fundamental

A segurança do COMPIA baseia-se no princípio **"Zero Trust"** no nível do banco de dados. O Frontend (React) não possui privilégios de superusuário. Cada query é filtrada automaticamente pelo Postgres usando RLS (Row Level Security) baseada na identidade do usuário autenticado.

---

## 2. Helper Functions

Para suportar tanto chamadas diretas do Frontend (onde `auth.uid()` é usado) quanto chamadas via Edge Functions/Backend (onde o ID pode vir de um claim customizado), utilizamos uma função auxiliar:

```sql
current_user_id()
```
Retorna: `auth.uid()` (se disponível) OU `request.jwt.claim.sub` (definido por middleware).

---

## 3. Hierarquia de Acesso

### A. System Admin (Super Admin)
Permissão global.
*   **Regra RLS:** `EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('sys_admin', 'system_admin'))`
*   **Acesso:** Vê todos os tenants (organizações).

### B. Organization Admin
Admin do Tenant.
*   **Regra RLS:** `organization_id IN (SELECT organization_id FROM user_organizations WHERE user_id = auth.uid())`
*   **Acesso:** Vê todos os dados (inspeções, membros, financeiro) DA SUA organização.

### C. Inspector / Member
Usuário final.
*   **Regra RLS:** Vê dados da organização onde é membro, mas com restrições de escrita dependendo da tabela.

---

## 4. Políticas por Tabela (Resumo)

### `organizations`
*   **Select:** Usuário só vê a organização à qual pertence.
*   **Update:** Apenas `org_admin` ou `sys_admin`.

### `inspections`
*   **Select:** Visível para todos os membros da Organização da inspeção.
*   **Insert/Update:** Membros da Organização.
*   **Delete:** Apenas Admins (`org_admin` e `sys_admin`).

### `users` (Public Profile)
*   **Select (Own):** Usuário vê seu próprio perfil.
*   **Select (Org):** Admin vê usuários da sua própria organização.
*   **Update:** Usuário atualiza apenas seu próprio perfil.

### CRM (`leads`, `activities`)
*   **Owner-based:** Leads são visíveis pelo seu `owner_id` (Dono do Lead) ou por Admins.

---

## 5. Middleware e Contexto

No Backend (Edge Functions), para garantir que o RLS funcione, injetamos o contexto do usuário:

```typescript
// Exemplo em Hono / Deno
await client.rpc('set_claim', { 
  claim: 'sub', 
  value: user.id 
});
```

Isso garante que mesmo queries executadas pelo servidor respeitem as regras de isolamento de dados do Tenant.
