# FAQ e Troubleshooting - Sistema de Convites

**Documento de Suporte Interno**  
**Versão:** 1.0

---

## Problemas Comuns

### 1. "Usuário diz que não recebeu o email"

**Causa provável:** Email em spam ou bloqueado pelo servidor corporativo.

**Solução:**
1. Verificar se convite existe: **Configurações → Usuários → Convites Pendentes**
2. Se existir, usar **"Copiar Link"** e enviar manualmente via WhatsApp
3. Se não existir, verificar se email foi digitado corretamente

**Prevenção:** Orientar usuários a adicionar `noreply@compia.tech` aos contatos.

---

### 2. "Convite expirado"

**Causa:** Convites expiram automaticamente após 7 dias.

**Solução:**
1. Admin acessa **Convites Pendentes**
2. Localiza o convite (status: Expirado)
3. Clica em **"Reenviar"**

---

### 3. "Limite de usuários atingido"

**Erro:** `403 - plan_limit_reached`

**Causa:** Organização atingiu o limite de usuários do plano.

**Solução:**
1. Verificar **vagas disponíveis** na tela de usuários
2. **Revogar** convites pendentes não utilizados
3. **Desativar** usuários que não usam mais o sistema
4. Se necessário, orientar **upgrade de plano**

---

### 4. "Usuário logou com email diferente"

**Erro:** "O convite foi enviado para outro email"

**Causa:** Usuário tentou aceitar convite logado com email diferente do convidado.

**Solução:**
1. Orientar usuário a **sair** da conta atual
2. Fazer login com o **email correto** (o que recebeu o convite)
3. Tentar aceitar novamente

---

### 5. "Convite já existe para este email"

**Erro:** `409 - Conflict`

**Causa:** Admin tentou convidar email que já tem convite pendente.

**Solução:**
1. Verificar convites pendentes
2. **Reenviar** o convite existente (não criar novo)

---

## Verificações de Banco de Dados

### Consultar convites de um email
```sql
SELECT * FROM organization_invitations 
WHERE LOWER(email) = LOWER('usuario@email.com')
ORDER BY created_at DESC;
```

### Verificar limite da organização
```sql
SELECT 
  o.name,
  o.max_users,
  COUNT(DISTINCT u.id) as usuarios_ativos,
  COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'pending') as convites_pendentes
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id AND u.is_active = true
LEFT JOIN organization_invitations i ON i.organization_id = o.id
WHERE o.id = ?
GROUP BY o.id;
```

### Expirar convites manualmente
```sql
UPDATE organization_invitations
SET status = 'expired'
WHERE status = 'pending' AND expires_at < NOW();
```

---

## Escalonamento

Se o problema não for resolvido:
1. Verificar logs: **Supabase Dashboard → Logs → Edge Functions**
2. Escalar para equipe de desenvolvimento com:
   - ID do convite
   - Email do usuário
   - Mensagem de erro exata
   - Screenshot (se aplicável)

---

## Contatos

- **Suporte N1:** suporte@compia.tech
- **Desenvolvimento:** dev@compia.tech
