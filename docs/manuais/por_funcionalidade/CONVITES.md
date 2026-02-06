# Sistema de Convites - Manual do Usuário

**Versão:** 1.0  
**Última Atualização:** 2026-02-05

---

## O que é o Sistema de Convites?

O Sistema de Convites permite que administradores adicionem novos usuários à sua organização de forma segura e controlada.

---

## Para Administradores (OrgAdmin)

### Como Convidar Usuários

1. Acesse **Configurações → Usuários**
2. Clique em **"Convidar Usuários"**
3. Digite os emails (um por linha ou separados por vírgula)
4. Selecione a função: **Inspetor** ou **Administrador**
5. Clique em **Enviar Convites**

> 💡 **Dica:** Você pode colar uma lista de emails do Excel!

### Gerenciando Convites

Na aba **"Convites Pendentes"** você pode:

| Ação | Descrição |
|------|-----------|
| 🔄 Reenviar | Envia novo email e renova validade |
| ❌ Revogar | Cancela o convite (libera vaga no plano) |
| 📋 Copiar Link | Copia o link para enviar manualmente |

### Limite de Usuários

Seu plano tem um limite de usuários. O sistema mostra:
> **"Vagas disponíveis: 3 de 5"**

Se atingir o limite, você precisará:
- Revogar convites pendentes não utilizados
- Desativar usuários inativos
- Fazer upgrade do plano

---

## Para Usuários Convidados

### Aceitando um Convite

1. Você receberá um email com o assunto: **"Convite para [Empresa]"**
2. Clique no botão **"Aceitar Convite"**
3. Faça login com Google ou crie uma conta
4. Você será automaticamente vinculado à organização!

### Perguntas Frequentes

**P: Posso pertencer a várias empresas?**  
R: Sim! Se você receber convites de empresas diferentes, pode aceitar todos. Use o seletor de organização no menu para alternar.

**P: O convite expirou, o que faço?**  
R: Solicite ao administrador que reenvie o convite. Convites expiram em 7 dias.

**P: Preciso estar logado com qual email?**  
R: O mesmo email para o qual o convite foi enviado. Se tentar aceitar com outro email, verá uma mensagem de erro.

---

## Diagrama do Fluxo

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Admin      │────▶│   Email     │────▶│  Usuário    │
│  Envia      │     │   Recebido  │     │  Aceita     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│  Vaga       │                         │  Acesso     │
│  Reservada  │                         │  Liberado   │
└─────────────┘                         └─────────────┘
```

---

## Precisa de Ajuda?

Entre em contato com o suporte: **suporte@compia.tech**
