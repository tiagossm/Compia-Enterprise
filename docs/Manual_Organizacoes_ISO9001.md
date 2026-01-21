# 🏢 Manual de Gestão - Módulo de Organizações

> **Código do Documento**: PO-ORG-001  
> **Versão**: 1.0.0  
> **Data de Emissão**: Janeiro 2026  
> **Sistema**: COMPIA - Sistema de Gestão de Inspeções  
> **Módulo**: Gestão Organizacional (Multi-Tenant)  
> **Classificação**: Interno

---

## 📋 Controle de Revisões

| Versão | Data | Autor | Descrição da Alteração |
|--------|------|-------|------------------------|
| 1.0.0 | 21/01/2026 | Equipe Compia | Versão inicial do documento |

---

## 📑 Índice

1. [Objetivo](#1-objetivo)
2. [Escopo](#2-escopo)
3. [Referências Normativas](#3-referências-normativas)
4. [Definições e Abreviações](#4-definições-e-abreviações)
5. [Responsabilidades e Autoridades](#5-responsabilidades-e-autoridades)
6. [Descrição do Processo](#6-descrição-do-processo)
7. [Estrutura Hierárquica Organizacional](#7-estrutura-hierárquica-organizacional)
8. [Procedimentos Operacionais](#8-procedimentos-operacionais)
9. [Controles de Acesso (RBAC)](#9-controles-de-acesso-rbac)
10. [Regras de Negócio](#10-regras-de-negócio)
11. [Registros e Evidências](#11-registros-e-evidências)
12. [Indicadores de Desempenho](#12-indicadores-de-desempenho)
13. [Perguntas Frequentes](#13-perguntas-frequentes)
14. [Erros Comuns e Soluções](#14-erros-comuns-e-soluções)
15. [Anexos](#15-anexos)

---

## 1. Objetivo

Este procedimento tem como objetivo estabelecer as diretrizes, responsabilidades e métodos para a gestão de organizações no sistema COMPIA, garantindo:

- **Segregação adequada de dados** entre diferentes clientes (multi-tenancy)
- **Controle de acesso hierárquico** baseado em perfis (RBAC)
- **Rastreabilidade completa** de ações administrativas
- **Estruturação hierárquica** que reflete a realidade operacional dos clientes

---

## 2. Escopo

Este documento aplica-se a:

- **Todas as operações** de criação, edição, visualização e exclusão de organizações
- **Todos os usuários** com acesso ao módulo de Gestão Organizacional
- **Todas as organizações** cadastradas no sistema, independentemente do tipo ou nível hierárquico

### 2.1. Limites do Escopo

| Incluído | Não Incluído |
|----------|--------------|
| Cadastro de organizações | Gestão de usuários (ver PO-USR-001) |
| Hierarquia organizacional | Gestão de permissões RBAC (ver PO-RBAC-001) |
| Configuração de planos | Faturamento e cobrança |
| Dados cadastrais (CNPJ) | Integrações externas |

---

## 3. Referências Normativas

| Norma/Documento | Descrição |
|-----------------|-----------|
| **ISO 9001:2015** | Sistema de Gestão da Qualidade |
| **LGPD (Lei 13.709/2018)** | Lei Geral de Proteção de Dados |
| **ISO 27001:2022** | Segurança da Informação |
| **ARCHITECTURE.md** | Documentação técnica da arquitetura |
| **user-types.ts** | Definição de perfis e permissões |

---

## 4. Definições e Abreviações

### 4.1. Glossário

| Termo | Definição |
|-------|-----------|
| **Organização** | Entidade legal (empresa, consultoria, unidade) cadastrada no sistema |
| **Tenant** | Contexto isolado de dados de uma organização |
| **Multi-Tenant** | Arquitetura onde múltiplos clientes compartilham a infraestrutura |
| **Hierarquia** | Estrutura pai-filho entre organizações |
| **CNPJ** | Cadastro Nacional de Pessoa Jurídica |
| **RLS** | Row Level Security - segurança em nível de linha no banco |

### 4.2. Abreviações

| Sigla | Significado |
|-------|-------------|
| **RBAC** | Role-Based Access Control |
| **SST** | Segurança e Saúde no Trabalho |
| **5W2H** | What, Why, When, Where, Who, How, How Much |
| **SysAdmin** | System Administrator (Administrador do Sistema) |
| **OrgAdmin** | Organization Administrator (Administrador da Organização) |

---

## 5. Responsabilidades e Autoridades

### 5.1. Matriz RACI

| Atividade | SysAdmin | OrgAdmin | Inspector | Viewer |
|-----------|----------|----------|-----------|--------|
| Criar organização Master | **R/A** | - | - | - |
| Criar subsidiária | R/A | **R** | - | - |
| Editar organização própria | R/A | **R** | - | - |
| Editar outra organização | **R/A** | - | - | - |
| Visualizar hierarquia | **R** | **R** | **C** | **I** |
| Excluir organização | **R/A** | - | - | - |
| Atribuir usuários | R/A | **R** | - | - |
| Acessar módulo | ✅ | ✅ | ❌ | ❌ |

**Legenda**: R = Responsável | A = Aprova | C = Consultado | I = Informado

### 5.2. Detalhamento por Perfil

#### System Administrator (system_admin / sys_admin)
- **Acesso**: Global, todas as organizações
- **Pode**: Criar, editar, excluir qualquer organização
- **Menu**: "Organizações" (visão completa)
- **Stats**: Globais (todas as empresas, usuários, subsidiárias)

#### Organization Administrator (org_admin)
- **Acesso**: Apenas sua organização + subsidiárias
- **Pode**: Criar subsidiárias, editar sua org e filhas
- **Menu**: "Minha Organização"
- **Stats**: Apenas de sua árvore hierárquica

#### Inspector (inspector)
- **Acesso**: ❌ SEM ACESSO ao módulo
- **Justificativa**: Gestão organizacional é função administrativa
- **Alternativa**: Pode ver dados da org em outros módulos (inspeções, relatórios)

#### Viewer (viewer)
- **Acesso**: ❌ SEM ACESSO ao módulo

---

## 6. Descrição do Processo

### 6.1. Fluxograma do Processo

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    PROCESSO DE GESTÃO ORGANIZACIONAL                      │
└──────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │   INÍCIO    │────▶│ Verificar   │────▶│ Usuário é   │
    │             │     │ Autenticação│     │ Autorizado? │
    └─────────────┘     └─────────────┘     └──────┬──────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                           SysAdmin             OrgAdmin              Outros
                              │                    │                    │
                              ▼                    ▼                    ▼
                    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐
                    │ Acesso Global   │  │ Acesso Restrito │  │   ACESSO    │
                    │ Todas as Orgs   │  │ Sua Org + Filhas│  │   NEGADO    │
                    └────────┬────────┘  └────────┬────────┘  └─────────────┘
                             │                    │
                             ▼                    ▼
                    ┌─────────────────────────────────────┐
                    │        OPERAÇÕES DISPONÍVEIS        │
                    ├─────────────────────────────────────┤
                    │ • Visualizar lista/hierarquia       │
                    │ • Criar nova organização            │
                    │ • Editar organização existente      │
                    │ • Excluir organização (SysAdmin)    │
                    │ • Atribuir/remover usuários         │
                    └─────────────────────────────────────┘
```

### 6.2. Ciclo de Vida da Organização

```
  [ CRIAÇÃO ]     [ ATIVA ]     [ INATIVA ]     [ EXCLUÍDA ]
      │               │               │               │
      ▼               ▼               ▼               ▼
   is_active=      is_active=      is_active=      REGISTRO
    true            true            false          REMOVIDO
      │               │               │               
      └───────────────┼───────────────┘               
                      │                               
                  (pode ser reativada)                
```

---

## 7. Estrutura Hierárquica Organizacional

### 7.1. Níveis Hierárquicos

| Nível | organization_level | Descrição | Pode ter filhos? |
|-------|-------------------|-----------|------------------|
| **1** | `master` | Consultoria/Empresa Matriz | ✅ Sim |
| **2** | `company` | Empresa Cliente | ✅ Sim |
| **3** | `subsidiary` | Filial/Unidade | ❌ Não |

### 7.2. Tipos de Organização

| Tipo | type | Descrição | Uso Típico |
|------|------|-----------|------------|
| **Master** | `master` | Organização principal do sistema | Compia, Consultorias |
| **Consultoria** | `consultancy` | Empresa de consultoria SST | Terceiros que auditam |
| **Empresa** | `company` | Empresa cliente | Cliente final |
| **Cliente** | `client` | Cliente de uma consultoria | Sub-cliente |

### 7.3. Exemplo de Hierarquia Real

```
COMPIA (Master - ID: 1)
│
├── GRUPO BPLAN (Company - ID: 5)
│   ├── AOKI BAURU (Subsidiary - ID: 7)
│   ├── AOKI DRACENA (Subsidiary - ID: 6)
│   ├── AOKI LUCÉLIA (Subsidiary - ID: 8)
│   ├── AOKI MARILIA (Subsidiary - ID: 9)
│   ├── AOKI REGENTE FEIJÓ (Subsidiary - ID: 10)
│   ├── AOKI SANTA CRUZ DO RIO PARDO (Subsidiary - ID: 11)
│   └── AOKI TRÊS LAGOAS (Subsidiary - ID: 12)
│
├── CONSULTORIA XYZ (Consultancy - ID: 3)
│   ├── CLIENTE A (Client - ID: 13)
│   └── CLIENTE B (Client - ID: 14)
```

### 7.4. Regras de Hierarquia

| Regra | Descrição |
|-------|-----------|
| **Profundidade Máxima** | 3 níveis (Master → Company → Subsidiary) |
| **Subsidiária sem filhos** | Uma subsidiária NÃO pode ter filhas |
| **Organização Pai** | Apenas orgs do tipo master/company podem ser pais |
| **Herança de Dados** | Subsidiárias herdam configurações da matriz |

---

## 8. Procedimentos Operacionais

### 8.1. Criando uma Nova Organização

#### 8.1.1. Acesso ao Modal de Criação

1. Navegue até **Administração > Organizações**
2. Clique no botão **"+ Nova Organização"** (verde, canto superior direito)
3. O modal de criação será aberto

#### 8.1.2. Preenchimento dos Campos

**Aba "Dados Básicos":**

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Nome | ✅ Sim | Nome da organização (ex: "GRUPO BPLAN") |
| Tipo de Organização (Perfil) | ✅ Sim | Master, Consultoria, Empresa ou Cliente |
| Descrição | ❌ Não | Descrição opcional |
| Email de Contato | ❌ Não | Email principal da organização |
| Telefone de Contato | ❌ Não | Telefone principal |
| Website | ❌ Não | URL do site |
| Endereço | ❌ Não | Endereço completo |

**Seção "Estrutura Hierárquica":**

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Organização Pai | ❌ Não | Selecione se for subsidiária |

> ⚠️ **Importante**: Se você é OrgAdmin, só verá sua própria organização como opção de pai.

**Aba "Dados da Empresa" (CNPJ):**

| Campo | Preenchimento |
|-------|---------------|
| CNPJ | Digite e clique em "Buscar" para auto-preenchimento |
| Razão Social | Automático via consulta CNPJ |
| Nome Fantasia | Automático ou manual |
| CNAE Principal | Código de atividade econômica |
| Natureza Jurídica | Tipo de empresa |
| Data de Abertura | Data de constituição |
| Porte | MEI, ME, EPP, etc. |

**Aba "Plano":**

| Campo | Descrição |
|-------|-----------|
| Plano de Assinatura | Básico, Profissional ou Enterprise |
| Máximo de Usuários | Limite de usuários permitidos |
| Máximo de Subsidiárias | Limite de filiais (0 = ilimitado) |

#### 8.1.3. Salvando

1. Revise todas as informações
2. Clique em **"Criar Organização"**
3. Aguarde a confirmação de sucesso
4. A organização aparecerá na lista/hierarquia

### 8.2. Editando uma Organização

1. Na lista de organizações, localize a organização desejada
2. Clique no botão **"Editar"** (ícone de lápis)
3. Modifique os campos necessários
4. Clique em **"Salvar Alterações"**

### 8.3. Alterando o Tipo/Perfil

> ⚠️ **Atenção**: Alterar o tipo de uma organização pode afetar suas permissões e hierarquia.

1. Edite a organização
2. No campo **"Tipo de Organização (Perfil)"**, selecione o novo tipo
3. Verifique se a nova configuração é compatível com a hierarquia
4. Salve as alterações

### 8.4. Atribuindo Usuários

1. Na linha da organização, clique em **"Atribuir Usuários"** (ícone de pessoas)
2. No modal, selecione os usuários a serem atribuídos
3. Defina para cada usuário:
   - Se é atribuição **primária** ou **secundária**
   - O **papel** do usuário nesta organização
4. Clique em **"Salvar"**

### 8.5. Excluindo uma Organização

> ⚠️ **Cuidado**: Apenas System Administrators podem excluir organizações.

1. Localize a organização na lista
2. Clique no botão **"Excluir"** (ícone de lixeira vermelha)
3. Confirme a exclusão no diálogo

**Validações antes da exclusão:**
- ❌ Organização com usuários ativos não pode ser excluída
- ❌ Organização com subsidiárias ativas não pode ser excluída
- ❌ Organização com inspeções vinculadas requer confirmação especial

---

## 9. Controles de Acesso (RBAC)

### 9.1. Visibilidade de Dados por Perfil

#### System Administrator
```sql
-- Vê todas as organizações ativas
SELECT * FROM organizations WHERE is_active = true
```

#### Organization Administrator
```sql
-- Vê apenas sua org gerenciada + subsidiárias diretas
SELECT * FROM organizations 
WHERE (id = :managed_organization_id 
   OR parent_organization_id = :managed_organization_id)
  AND is_active = true
```

#### Outros Perfis
```sql
-- Vê apenas orgs explicitamente atribuídas
SELECT * FROM organizations 
WHERE id IN (
  SELECT organization_id FROM user_organizations 
  WHERE user_id = :user_id
)
```

### 9.2. Configuração do Usuário (Campos Críticos)

| Campo | Descrição | Quem define |
|-------|-----------|-------------|
| `organization_id` | Organização primária do usuário | Ao criar usuário |
| `managed_organization_id` | Org que o OrgAdmin gerencia | SysAdmin |
| `role` | Perfil de acesso | SysAdmin |

### 9.3. Exemplo: Configuração Correta de OrgAdmin

Para que um usuário seja Org Admin do GRUPO BPLAN:

```json
{
  "email": "eduardo.frazao@grupobplan.com.br",
  "role": "org_admin",
  "organization_id": 5,
  "managed_organization_id": 5
}
```

Com isso, ele verá:
- ✅ GRUPO BPLAN (ID: 5)
- ✅ AOKI BAURU (parent: 5)
- ✅ AOKI DRACENA (parent: 5)
- ✅ ... todas subsidiárias do GRUPO BPLAN

---

## 10. Regras de Negócio

### 10.1. Criação de Organizações

| Regra ID | Descrição |
|----------|-----------|
| **RN-ORG-001** | Nome da organização deve ser único no sistema |
| **RN-ORG-002** | CNPJ, se informado, deve ser único e válido |
| **RN-ORG-003** | Subsidiária deve ter organização pai |
| **RN-ORG-004** | Organização pai deve ser do tipo master ou company |
| **RN-ORG-005** | Máximo de 3 níveis de hierarquia |

### 10.2. Edição de Organizações

| Regra ID | Descrição |
|----------|-----------|
| **RN-ORG-010** | OrgAdmin só pode editar sua org e subsidiárias |
| **RN-ORG-011** | Mudar tipo para "subsidiary" requer definir pai |
| **RN-ORG-012** | Não é possível alterar org pai se houver dados vinculados |

### 10.3. Exclusão de Organizações

| Regra ID | Descrição |
|----------|-----------|
| **RN-ORG-020** | Apenas SysAdmin pode excluir organizações |
| **RN-ORG-021** | Org com usuários ativos: exclusão bloqueada |
| **RN-ORG-022** | Org com subsidiárias: exclusão bloqueada |
| **RN-ORG-023** | Org com inspeções: requer confirmação especial |

### 10.4. Estatísticas (Cards)

| Regra ID | Descrição |
|----------|-----------|
| **RN-ORG-030** | Stats filtradas pela organização selecionada no header |
| **RN-ORG-031** | "Todas as Empresas" (ID 0): stats globais (só SysAdmin) |
| **RN-ORG-032** | Org específica: stats incluem org + subsidiárias |

---

## 11. Registros e Evidências

### 11.1. Logs de Auditoria

Todas as operações são registradas com:

| Campo | Descrição |
|-------|-----------|
| `timestamp` | Data/hora UTC da ação |
| `user_id` | ID do usuário que executou |
| `action` | create, update, delete |
| `entity_type` | "organization" |
| `entity_id` | ID da organização afetada |
| `old_values` | Valores antes da alteração (JSON) |
| `new_values` | Valores depois da alteração (JSON) |
| `ip_address` | IP do usuário |

### 11.2. Período de Retenção

| Tipo de Registro | Retenção |
|------------------|----------|
| Logs de criação | 5 anos |
| Logs de edição | 5 anos |
| Logs de exclusão | 10 anos |
| Dados excluídos (soft delete) | 1 ano |

---

## 12. Indicadores de Desempenho

### 12.1. KPIs do Módulo

| Indicador | Fórmula | Meta |
|-----------|---------|------|
| Taxa de Ativação | Orgs ativas / Total de orgs | ≥ 90% |
| Proporção Subsidiária/Matriz | Subsidiárias / Masters | Referência apenas |
| Tempo Médio de Cadastro | Tempo entre início e conclusão | ≤ 5 min |
| Taxa de Erros de Cadastro | Erros / Tentativas | ≤ 2% |

### 12.2. Dashboard de Estatísticas

Os cards na página de organizações mostram:

| Card | Descrição |
|------|-----------|
| **Organizações Master** | Total de orgs do tipo master |
| **Empresas Cliente** | Total de companies sem pai |
| **Subsidiárias** | Total de orgs com parent_id |
| **Total de Usuários** | Usuários ativos em todas orgs |

---

## 13. Perguntas Frequentes

### 13.1. Por que não consigo criar uma subsidiária?

**Causas possíveis:**
1. Você é OrgAdmin mas não tem `managed_organization_id` configurado
2. A organização pai selecionada já é uma subsidiária
3. O limite de subsidiárias do plano foi atingido

### 13.2. Por que não vejo outras organizações?

**Resposta:** Cada perfil tem visibilidade específica:
- **SysAdmin**: Vê todas
- **OrgAdmin**: Vê apenas sua org + filhas
- **Inspector**: Não tem acesso ao módulo

### 13.3. Como altero o tipo de uma organização para Master?

**Resposta:** Apenas um SysAdmin pode definir o tipo "Master". Na edição da organização, selecione "Master" no campo "Tipo de Organização (Perfil)".

### 13.4. A contagem de usuários está errada, o que fazer?

**Resposta:** A contagem considera apenas usuários com `is_active = true` cuja `organization_id` seja igual à org em questão. Verifique se os usuários estão corretamente vinculados.

### 13.5. Posso mudar a organização pai de uma subsidiária?

**Resposta:** Sim, desde que não haja conflitos de dados. Edite a subsidiária e selecione um novo pai no campo "Organização Pai".

---

## 14. Erros Comuns e Soluções

### Erro: "Nome da organização já existe"

**Causa**: Outra organização já possui o mesmo nome.
**Solução**: Escolha um nome único ou adicione diferenciador (cidade, filial, etc).

---

### Erro: "CNPJ inválido ou já cadastrado"

**Causa**: O CNPJ está formatado incorretamente ou já pertence a outra organização.
**Solução**: 
- Verifique o formato (XX.XXX.XXX/XXXX-XX)
- Consulte se já existe organização com este CNPJ

---

### Erro: "Usuário não tem permissão para criar organizações"

**Causa**: Seu perfil não permite criação de organizações.
**Solução**: Contate um System Administrator para realizar a operação ou solicitar alteração de perfil.

---

### Erro: "Cannot change organization of inspection"

**Causa**: Tentou mover uma inspeção para outra organização.
**Solução**: Inspeções não podem ser movidas entre organizações. Crie uma nova na organização correta.

---

### Cards de estatísticas mostrando "0"

**Causas possíveis**:
1. A organização selecionada no header não tem dados
2. Erro na consulta ao banco
3. Cache desatualizado

**Solução**: 
- Mude para "Todas as Empresas" e volte
- Atualize a página (F5)
- Limpe o cache do navegador

---

## 15. Anexos

### Anexo A: Campos do Banco de Dados

```sql
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50), -- master, consultancy, company, client
  organization_level VARCHAR(50), -- master, company, subsidiary
  parent_organization_id INTEGER REFERENCES organizations(id),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  website VARCHAR(255),
  
  -- Dados CNPJ
  cnpj VARCHAR(18) UNIQUE,
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cnae_principal VARCHAR(20),
  natureza_juridica VARCHAR(100),
  data_abertura DATE,
  porte_empresa VARCHAR(50),
  
  -- Plano
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  max_users INTEGER DEFAULT 50,
  max_subsidiaries INTEGER DEFAULT 0,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Anexo B: Endpoints de API

| Método | Endpoint | Descrição | Permissão |
|--------|----------|-----------|-----------|
| GET | `/api/organizations` | Listar organizações | SysAdmin, OrgAdmin |
| GET | `/api/organizations/:id` | Detalhes de uma org | SysAdmin, OrgAdmin* |
| GET | `/api/organizations/stats` | Estatísticas | SysAdmin, OrgAdmin |
| POST | `/api/organizations` | Criar organização | SysAdmin, OrgAdmin |
| PUT | `/api/organizations/:id` | Editar organização | SysAdmin, OrgAdmin* |
| DELETE | `/api/organizations/:id` | Excluir organização | SysAdmin |

*OrgAdmin: apenas para sua org e subsidiárias

### Anexo C: Fluxo de Telas

```
┌─────────────────────────────────────────────────────────────────────┐
│ PÁGINA: /organizations                                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 📊 CARDS DE ESTATÍSTICAS                                        │ │
│ │ [Orgs Master: X] [Empresas: Y] [Subsidiárias: Z] [Usuários: W]  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 FILTROS E BUSCA                                              │ │
│ │ [Buscar...] [Empresa ▼] [Consultoria ▼] [Ativo ▼] [Filtros ▼]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🌳 VISUALIZAÇÃO (Tree / Cards / List)                           │ │
│ │                                                                 │ │
│ │ ▼ COMPIA                                                        │ │
│ │   └─ ▼ GRUPO BPLAN                                              │ │
│ │       ├─ AOKI BAURU [Editar] [Usuários]                         │ │
│ │       ├─ AOKI DRACENA [Editar] [Usuários]                       │ │
│ │       └─ ...                                                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Contato e Suporte

Para dúvidas ou problemas não listados neste manual:

- **E-mail**: suporte@compia.tech
- **Telefone**: (11) 9999-9999
- **Chat**: Disponível no canto inferior direito do sistema

---

> **Última atualização**: 21 de Janeiro de 2026  
> **Versão do Sistema**: 2.0.0  
> **Aprovado por**: Equipe de Qualidade COMPIA  
> **Próxima Revisão**: Janeiro 2027
