# Sistema Multi-Empresa COMPIA - Documentação Completa

## Visão Geral

O COMPIA foi desenvolvido com uma arquitetura multi-empresa escalável que permite a você (criador do sistema) vender o sistema para empresas clientes, que por sua vez podem gerenciar suas próprias organizações subsidiárias e usuários internos.

## Estrutura Hierárquica

### Níveis Organizacionais

1. **Master** - Sua organização (COMPIA Master)
   - Controle total do sistema
   - Pode criar empresas clientes
   - Vê todos os dados do sistema

2. **Empresa** - Organizações que compram o sistema
   - Podem ter admins organizacionais
   - Podem criar subsidiárias
   - Gerenciam seus próprios usuários

3. **Subsidiária** - Sub-organizações dentro de empresas
   - Criadas pelos admins organizacionais
   - Herdam permissões da empresa pai

## Perfis de Usuário

### 1. System Admin (Administrador do Sistema)
- **Quem é**: Você (criador do COMPIA)
- **Permissões**:
  - Acesso total ao sistema
  - Criar/editar/excluir qualquer organização
  - Gerenciar qualquer usuário
  - Ver todos os dados e relatórios
  - Configurar limites de usuários e subsidiárias
  - Definir planos de assinatura

### 2. Org Admin (Administrador da Organização)
- **Quem é**: Admin da empresa cliente que comprou o sistema
- **Permissões**:
  - Gerenciar sua organização e subsidiárias
  - Convidar/gerenciar usuários de sua organização
  - Criar subsidiárias (até o limite definido)
  - Ver dados apenas de sua organização
  - Não pode criar outras empresas top-level

### 3. Manager (Gerente)
- **Quem é**: Gerentes dentro de organizações
- **Permissões**:
  - Ver dados de sua organização
  - Gerenciar inspeções e planos de ação
  - Acesso limitado a funcionalidades administrativas

### 4. Inspector (Técnico)
- **Quem é**: Técnicos de segurança do trabalho
- **Permissões**:
  - Realizar inspeções
  - Criar e executar planos de ação
  - Ver dados relacionados às suas inspeções

### 5. Client (Cliente)
- **Quem é**: Clientes finais ou usuários apenas para visualização
- **Permissões**:
  - Visualizar relatórios
  - Acesso limitado de leitura

## Como Usar o Sistema

### Para Você (System Admin)

#### 1. Criar Empresa Cliente
1. Acesse **Organizações** no menu lateral
2. Clique em **"Nova Empresa Cliente"**
3. Preencha os dados:
   - Nome da empresa
   - Tipo (Empresa, Consultoria, Cliente)
   - Deixe "Organização Pai" em branco para criar empresa independente
   - Configure limites de usuários e subsidiárias
   - Defina o plano de assinatura
4. Clique em **"Criar Organização"**

#### 2. Criar Administrador da Empresa Cliente
1. Na hierarquia de organizações, selecione a empresa criada
2. Clique na aba **"Usuários"**
3. Clique em **"Convidar Usuário"**
4. Preencha:
   - Email do futuro admin
   - Perfil: **"Administrador da Organização"**
5. O sistema gerará um link de convite que você pode enviar

### Para Administradores de Empresa (Org Admin)

#### 1. Aceitar Convite
1. Acesse o link de convite recebido
2. Faça login com sua conta Google
3. Aceite o convite - você será associado à organização com perfil de Admin

#### 2. Gerenciar Sua Organização
1. Acesse **"Minha Organização"** no menu lateral
2. Na aba **"Detalhes"** você pode:
   - Ver estatísticas da organização
   - Configurar dados da empresa
3. Na aba **"Usuários"** você pode:
   - Convidar novos usuários (Técnicos, Gerentes, Clientes)
   - Gerenciar usuários existentes
   - Ver convites pendentes

#### 3. Criar Subsidiárias
1. Na página de organizações, clique em **"Nova Subsidiária"**
2. Sua organização será automaticamente definida como pai
3. Configure os dados da subsidiária
4. A subsidiária será criada dentro dos seus limites definidos

#### 4. Convidar Usuários
1. Clique em **"Convidar Usuário"** em qualquer organização que você gerencia
2. Escolha o perfil apropriado:
   - **Gerente**: Para supervisores
   - **Técnico**: Para profissionais de segurança
   - **Cliente**: Para acesso de visualização
3. O usuário receberá um convite por email

### Para Usuários Finais

#### 1. Aceitar Convite
1. Clique no link recebido por email
2. Faça login com Google se necessário
3. Aceite o convite para ser associado à organização

#### 2. Usar o Sistema
- Após aceitar o convite, você terá acesso baseado no seu perfil
- O menu lateral se adaptará às suas permissões
- Você verá apenas dados da sua organização

## Funcionalidades Implementadas

### 1. Sistema de Convites
- Convites com token único e expiração (7 dias)
- Validação de email
- Aceitação automática via login social
- Log de atividades de convites

### 2. Controle de Acesso Baseado em Perfis (RBAC)
- Middleware de autenticação
- Verificação de permissões por rota
- Filtros automáticos de dados por organização
- Interface adaptável por perfil

### 3. Hierarquia Organizacional
- Visualização em árvore das organizações
- Relações pai-filho entre organizações
- Limites configuráveis de usuários e subsidiárias
- Status de assinatura por organização

### 4. Gestão de Usuários Multi-Tenant
- Usuários associados a organizações
- Diferentes perfis com permissões específicas
- Interface de gerenciamento de usuários por organização
- Histórico de atividades

### 5. Logs de Atividade
- Registro automático de ações importantes
- Rastreamento por usuário e organização
- Visualização de atividades recentes
- Auditoria completa do sistema

## Navegação por Perfil

### System Admin vê:
- Dashboard global
- Todas as inspeções
- **Administração do Sistema**:
  - Usuários (todos)
  - Organizações (todas)

### Org Admin vê:
- Dashboard da organização
- Inspeções da organização
- **Administração da Organização**:
  - Minha Organização
  - Usuários da organização
  - Subsidiárias

### Manager/Inspector/Client vê:
- Dashboard básico
- Inspeções permitidas
- Funcionalidades operacionais

## Fluxo de Vendas Sugerido

### 1. Preparação
- Configure sua organização Master
- Defina templates de checklist padrão
- Prepare materiais de treinamento

### 2. Venda para Empresa Cliente
- Crie a organização da empresa no sistema
- Configure limites baseados no plano contratado
- Crie convite para o admin da empresa

### 3. Onboarding da Empresa Cliente
- Envie convite para admin da empresa
- Forneça treinamento sobre o sistema
- Acompanhe a criação de usuários iniciais

### 4. Suporte Contínuo
- Monitore uso através dos logs de atividade
- Ajuste limites conforme necessário
- Forneça suporte técnico via sistema

## Escalabilidade

O sistema foi projetado para escalar facilmente:

### Técnica
- Arquitetura multi-tenant com isolamento de dados
- Índices de banco otimizados por organização
- APIs preparadas para alta concorrência

### Comercial
- Modelo B2B2C escalável
- Planos diferenciados (Basic, Pro, Enterprise)
- Limites configuráveis por organização
- Sistema de cobrança baseado em uso

## Segurança

### Isolamento de Dados
- Filtros automáticos por organização
- Validação de permissões em todas as rotas
- Tokens de convite únicos e com expiração

### Auditoria
- Log completo de todas as ações
- Rastreamento de mudanças de usuários
- Histórico de acessos por organização

## Próximos Passos Sugeridos

### 1. Funcionalidades Complementares
- Sistema de cobrança integrado
- Notificações por email/SMS
- Relatórios executivos por organização
- API para integrações externas

### 2. Melhorias de UX
- Onboarding guiado para novos clientes
- Tutorial interativo
- Dashboard personalizado por perfil
- Temas visuais por organização

### 3. Recursos Avançados
- Backup automático por organização
- Exportação completa de dados
- Integração com Active Directory
- Single Sign-On (SSO)

## Suporte e Documentação

### Para Desenvolvedores
- Código documentado com TypeScript
- Arquitetura modular
- Testes automatizados sugeridos
- API REST bem definida

### Para Usuários
- Esta documentação como base para help center
- Tutoriais em vídeo recomendados
- FAQ baseado em casos de uso reais
- Suporte técnico escalonado por perfil

---

**Sistema desenvolvido para COMPIA**  
*Arquitetura multi-tenant escalável para o mercado B2B de segurança do trabalho*
