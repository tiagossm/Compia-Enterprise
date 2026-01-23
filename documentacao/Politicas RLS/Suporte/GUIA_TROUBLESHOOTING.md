# Guia de Suporte: Diagnóstico de Acesso (RLS Compia)

**Público:** Suporte Nível 1 e 2
**Foco:** Resolução de chamados sobre Permissões e Dados "Invisíveis"

---

## 🚨 Top 3 Problemas Reais

### 1. "Sou Inspetor e o botão de Excluir Inspeção sumiu/dá erro!"
**Diagnóstico:** Comportamento Esperado.
**Explicação Técnica:** A política de segurança da tabela `inspections` bloqueia DELETE para usuários com role diferente de `org_admin`.
**Solução:** Explique ao usuário: *"Por segurança, apenas Gerentes (Org Admins) podem excluir inspeções permanentemente. Peça ao seu gestor para realizar a exclusão."*

### 2. "Não consigo ver os usuários da minha equipe"
**Diagnóstico:** Usuário não é Admin da Organização.
**Verificação:**
1.  Verifique a role do usuário na tabela `users`: `SELECT role FROM users WHERE email = '...'`
2.  Se for `inspector`, ele só pode ver o próprio perfil (por design).
3.  Se ele DEVERIA ver a equipe, promova-o para `org_admin`.

### 3. "Erro 403 ao Salvar Nova Inspeção"
**Diagnóstico:** Tentativa de criar dado em Organização incorreta.
**Causa:** O usuário pode estar logado, mas o frontend tentou enviar um `organization_id` diferente do dele (ex: cache antigo ou bug de seleção de org).
**Verificação:** O RLS bloqueia INSERT se o `organization_id` do dado não bater com o `organization_id` do usuário. Peça para o usuário fazer Logout/Login para atualizar a sessão.

---

## 📋 Tabela de Permissões Rápidas

| Ação | Inspetor (`inspector`) | Admin da Org (`org_admin`) | SysAdmin (`sys_admin`) |
|:---|:---:|:---:|:---:|
| **Ver Inspeções** | ✅ (Sua Org) | ✅ (Sua Org) | ✅ (Sua Org) |
| **Criar Inspeções** | ✅ | ✅ | ✅ |
| **Editar Inspeções** | ✅ | ✅ | ✅ |
| **Apagar Inspeções** | ❌ (Bloqueado) | ✅ | ✅ |
| **Ver Logs de Sessão**| ❌ | ❌ | ✅ (Acesso Total) |

---

## 🛠️ Script de Resposta

*"O sistema Compia possui regras estritas de segurança. Identificamos que sua conta tem perfil de **Inspetor**, que não permite a exclusão de registros legais (inspeções). Essa ação é reservada aos Administradores da Organização para garantir a integridade do histórico."*
