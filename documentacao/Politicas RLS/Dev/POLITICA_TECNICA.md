# Política Técnica de RLS (Compia)

**Público:** Desenvolvedores Backend & Database Architects
**Versão:** 1.1.0 (Atualizada com Migration 20260123)
**Contexto:** Segurança Multi-Tenant Específica do Compia

---

## 🔒 Visão Geral da Implementação

O Compia implementa isolamento de dados via **Row Level Security (RLS)** no driver nativo do Supabase. As regras são aplicadas automaticamente em todas as queries feitas pelo cliente (`anon` key).

### Roles do Sistema
As policies dependem dos valores na coluna `role` da tabela `public.users`:
- `sys_admin`: Super-administrador (acesso global ou restrito a logs de sistema).
- `org_admin`: Administrador da Organização (pode gerenciar usuários e deletar inspeções da sua org).
- `inspector`: Usuário operacional (pode criar/ler/editar inspeções, mas **NÃO pode deletar**).

---

## 🛠️ Regras Específicas por Tabela

### 1. `inspections` (Dados Core)
- **Select/Insert/Update:** Permitido para todos os usuários da mesma `organization_id`.
- **Delete:** RESTRITO. Apenas `sys_admin` ou `org_admin` podem deletar.
  ```sql
  -- Policy Real: rls_inspections_delete
  USING (
      organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
      AND EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() 
          AND role IN ('sys_admin', 'org_admin') -- Apenas Admins deletam
      )
  );
  ```

### 2. `users` (Dados de Perfil)
- **Visibilidade:** Você vê seu próprio perfil OU, se for Admin, vê todos da sua organização.
- **Edição:** Você edita seu próprio perfil. Admin pode editar perfis de outros membros da mesma organização.

### 3. `user_sessions` (Sessões & Tokens)
- **Isolamento Total:** Usuário só tem acesso às linhas onde `user_id = auth.uid()`.
- **Uso:** Usado para validar tokens UUID no login seguro.

### 4. `session_log` (Auditoria)
- **Acesso Exclusivo:** Apenas usuários com role `sys_admin` podem consultar esta tabela.
- **Motivo:** Contém metadados sensíveis de acesso global.

---

## 🚫 Checklist de Desenvolvimento (Do's & Don'ts)

1.  **Sempre injete `organization_id`:** Ao criar registros (INSERT), o backend deve garantir que o `organization_id` corresponda ao do usuário logado.
    - *Risco:* Se tentar inserir com ID de outra org, a policy `WITH CHECK` bloqueará com erro 403.
2.  **Tratamento de Erro 403:** Se a UI receber um erro de permissão ao tentar deletar uma inspeção, verifique se o usuário é `org_admin`. Se for `inspector`, o erro é esperado (Feature, não Bug).
3.  **Bypass de RLS:** Use `supabaseAdmin` (Service Role) APENAS em Edge Functions para tarefas de manutenção (ex: limpeza de logs antigos). Nunca use para queries de usuário.

---

## 🧪 Como Testar Policies (SQL Editor)

Para verificar se um usuário vê o que deveria:

```sql
-- 1. Pegue o ID de um usuário inspetor
-- 2. Impersone ele no banco
SET request.jwt.claim.sub = 'uuid-do-inspetor';
SET ROLE authenticated;

-- 3. Tente deletar uma inspeção (Deve falhar/retornar 0 linhas)
DELETE FROM inspections WHERE id = 'uuid-da-inspecao';

-- 4. Tente ver logs (Deve retornar vazio)
SELECT * FROM session_log;
```
