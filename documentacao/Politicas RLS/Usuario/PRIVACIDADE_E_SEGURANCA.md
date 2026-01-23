# Segurança e Privacidade no Compia

**Para:** Usuários e Gestores
**Assunto:** Como seus dados são isolados e protegidos

---

## 🛡️ O que impede meu concorrente de ver meus dados?

No Compia, a segurança não é opcional. Utilizamos uma tecnologia chamada **RLS (Row Level Security)**, que funciona como "paredes digitais" dentro do nosso banco de dados.

### A Regra de Ouro: "Sua Org, Seus Dados"
Toda informação (inspeção, checklist, usuário) leva um "carimbo" com o ID da sua Organização.
- Quando você entra no sistema, você recebe uma chave única.
- O banco de dados só libera informações que tenham o **mesmo carimbo** da sua chave.
- É impossível, mesmo por falha do aplicativo, que você receba dados de outra empresa, pois o banco de dados recusa a entrega.

---

## 👮 Hierarquia de Segurança (Quem pode fazer o quê?)

Para proteger a integridade das auditorias, definimos níveis de acesso:

### 1. Inspetores (Operacional)
- **Pode:** Criar, preencher e editar suas próprias inspeções e da equipe.
- **NÃO Pode:** Apagar inspeções. (Isso evita que evidências ou históricos sejam removidos acidentalmente ou maliciosamente).
- **NÃO Pode:** Ver dados pessoais de outros usuários.

### 2. Administradores da Organização (Gestores)
- **Pode:** Tudo o que o inspetor faz.
- **Privilégio Extra:** Gerenciar a equipe (criar/editar usuários) e excluir inspeções incorretas.
- **Responsabilidade:** Vocês são os guardiões dos dados da empresa.

---

## 🔐 Sessões Seguras

Atualizamos recentemente nosso sistema de login (Janeiro/2026):
- **Tokens Únicos:** Cada vez que você loga, criamos uma credencial digital única (UUID) que expira automaticamente.
- **Proteção de Senha:** Suas senhas são transformadas em códigos matemáticos irreversíveis (PBKDF2) antes de serem salvas.

*Compia - Auditoria séria exige segurança séria.*
