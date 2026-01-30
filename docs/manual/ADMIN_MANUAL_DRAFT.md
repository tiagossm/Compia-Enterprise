# Manual do Administrador - Compia Enterprise

> **Código:** MAN-ADM-001
> **Versão:** 1.0 (Draft)
> **Última Atualização:** 30/01/2026

---

## 1. Gestão de Equipe

### 1.1 Visão Geral

Como administrador da sua organização (`org_admin`), você pode:
- Adicionar novos membros à equipe
- Definir papéis e permissões
- Gerenciar acesso de usuários existentes
- Monitorar atividades da equipe

### 1.2 Papéis Disponíveis

| Papel | Código | Quem Deve Usar | O Que Pode Fazer |
|-------|--------|----------------|------------------|
| **Administrador** | `org_admin` | Dono/Gestor da conta | Gerenciar usuários, deletar inspeções, configurar organização |
| **Gerente** | `manager` | Supervisores | Criar checklists, ver relatórios, gerenciar templates |
| **Inspetor** | `inspector` | Técnicos de campo | Criar e editar inspeções, tirar fotos, gerar PDFs |
| **Visualizador** | `client` | Clientes externos | Apenas visualizar inspeções compartilhadas |

### 1.3 Limites por Plano

| Plano | Máx. Usuários | Máx. Administradores |
|-------|---------------|---------------------|
| Essencial | 5 | 1 |
| Inteligente | 15 | 3 |
| Enterprise | Ilimitado | Ilimitado |

---

## 2. Como Adicionar Novos Inspetores

### Passo a Passo

#### Passo 1: Acesse o Menu de Usuários

- No menu lateral, clique em **Configurações** > **Equipe**
- Ou acesse diretamente: `/dashboard/settings/team`

#### Passo 2: Clique em "Convidar Usuário"

Você verá um botão azul no canto superior direito da lista de usuários.

#### Passo 3: Preencha os Dados do Convite

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **E-mail** | E-mail do novo membro (obrigatório) | joao.silva@empresa.com |
| **Nome** | Nome completo (opcional) | João da Silva |
| **Papel** | Função na equipe (obrigatório) | Inspetor |

#### Passo 4: Envie o Convite

- O sistema gerará um link único de convite (Magic Link)
- O link será enviado automaticamente por e-mail
- **Validade:** 7 dias

#### Passo 5: Acompanhe o Status

| Status | Significado |
|--------|-------------|
| 🟡 **Pendente** | Convite enviado, aguardando aceite |
| 🟢 **Aceito** | Usuário criou a conta e está ativo |
| 🔴 **Expirado** | Convite não foi aceito a tempo (reenvie) |

### Fluxo Visual

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Admin clica    │     │  Sistema envia  │     │  Novo usuário   │
│  "Convidar"     │────>│  e-mail com     │────>│  clica no link  │
│                 │     │  link único     │     │  e cria conta   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Usuário ativo  │
                                                │  na organização │
                                                └─────────────────┘
```

---

## 3. Gerenciando Usuários Existentes

### 3.1 Alterar Papel de um Usuário

1. Na lista de usuários, clique no nome do membro
2. No painel lateral, selecione **"Editar"**
3. Altere o campo **"Papel"** para a nova função
4. Clique em **"Salvar"**

> ⚠️ **Atenção:** Rebaixar um Administrador remove o acesso a funções de gestão imediatamente.

### 3.2 Desativar um Usuário

Se um membro sair da equipe:

1. Acesse o perfil do usuário
2. Clique em **"Desativar Usuário"**
3. Confirme a ação

**O que acontece:**
- ❌ Usuário perde acesso imediatamente
- ✅ Dados históricos são preservados
- ✅ O slot de usuário é liberado para novos convites

### 3.3 Reativar um Usuário

Usuários desativados podem ser reativados:

1. Na lista, ative o filtro **"Mostrar Inativos"**
2. Clique no usuário desativado
3. Selecione **"Reativar"**

---

## 4. Segurança e Boas Práticas

### 4.1 Princípio do Menor Privilégio

> **Regra de Ouro:** Dê a cada usuário apenas as permissões necessárias para seu trabalho.

- Técnicos de campo → **Inspetor** (não Administrador)
- Supervisores que só precisam ver relatórios → **Gerente** (não Administrador)
- Clientes externos → **Visualizador** (apenas leitura)

### 4.2 Auditoria de Acessos

Todas as ações são registradas automaticamente:
- Quem acessou o quê
- Quando acessou
- De qual dispositivo/IP

Para ver o log de atividades: **Configurações** > **Logs de Atividade**

### 4.3 Sessões Ativas

Você pode ver e encerrar sessões ativas de qualquer usuário:

1. Acesse o perfil do usuário
2. Clique em **"Sessões Ativas"**
3. Para encerrar uma sessão suspeita, clique em **"Encerrar"**

---

## 5. Perguntas Frequentes

### ❓ Quantos administradores posso ter?

Depende do seu plano:
- **Essencial:** 1 administrador
- **Inteligente:** 3 administradores
- **Enterprise:** Ilimitado

### ❓ Posso transferir a propriedade da conta?

Sim, mas apenas o administrador principal (owner) pode fazer isso. Contate o suporte se necessário.

### ❓ O que acontece se eu exceder o limite de usuários?

Você não poderá enviar novos convites até liberar slots (desativando usuários ou fazendo upgrade do plano).

### ❓ Os dados de um usuário desativado são apagados?

Não imediatamente. Os dados são anonimizados conforme LGPD, mas o histórico de inspeções é preservado para fins de auditoria.

### ❓ Um usuário pode pertencer a mais de uma organização?

Sim. Usuários podem ser convidados para múltiplas organizações e alternar entre elas no menu de perfil.

### ❓ Como sei se um convite foi aceito?

Na lista de convites, você verá o status:
- 🟡 Pendente = Ainda não clicou no link
- 🟢 Aceito = Conta criada com sucesso

---

## 6. Glossário

| Termo | Significado |
|-------|-------------|
| **org_admin** | Administrador da Organização - pode gerenciar usuários |
| **inspector** | Inspetor - usuário operacional de campo |
| **Magic Link** | Link único e temporário enviado por e-mail para criar conta |
| **Slot** | Vaga de usuário disponível no seu plano |
| **Tenant** | Sua organização isolada dentro do sistema |
| **RLS** | Row Level Security - tecnologia que isola seus dados |

---

**Documento mantido por:** Equipe Compia
**Última atualização:** 30/01/2026
**Versão:** 1.0 (Draft)
