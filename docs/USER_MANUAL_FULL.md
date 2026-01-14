# Manual de Referência do Usuário - Sistema COMPIA

Este documento serve como a fonte definitiva de verdade para a operação do sistema COMPIA. Ele detalha cada botão, campo e regra de negócio para os quatro módulos principais.

---

## 1. Módulo de Login e Autenticação

### 1. Visão Geral
Módulo responsável por garantir o acesso seguro de usuários autorizados ao sistema, suportando autenticação via Google Workspace ou E-mail/Senha, com validação de aprovação administrativa.

### 2. Interface Detalhada (Mapeamento de Tela)

**Tela de Login (`/login`)**
- **Botão "Entrar com Google"**: Botão azul com ícone do Chrome. Inicia o fluxo OAuth 2.0. É o método prioritário.
- **Campo "Usuário" (E-mail)**: Campo de texto para e-mail. Ícone de usuário.
- **Campo "Senha"**: Campo de senha mascarado. Ícone de cadeado.
- **Checkbox "Lembrar de mim"**: Mantém o cookie de sessão persistente no navegador.
- **Link "Esqueceu a senha?"**: Aciona o fluxo de recuperação (atualmente redireciona para suporte ou fluxo de reset).
- **Botão "Entrar"**: Botão preto. Submete as credenciais de e-mail/senha.
- **Link "Solicite seu acesso"**: Redireciona para a tela de Registro (`/register`) para novos usuários sem conta.

### 3. Guia Passo a Passo (Happy Path)

**Acesso via Google (Caminho Feliz)**
1. Acesse a URL do sistema.
2. Clique no botão **"Entrar com Google"**.
3. Uma janela pop-up do Google abrirá. Selecione sua conta corporativa.
4. O sistema processará o token.
   - Se aprovado: Você será redirecionado para o Dashboard.
   - Se pendente: Você verá um alerta "Sua conta aguarda aprovação".

**Solicitação de Acesso (Novo Usuário)**
1. Na tela de login, clique em **"Solicite seu acesso"**.
2. Preencha Nome, E-mail e Senha.
3. Clique em "Registrar".
4. Aguarde o e-mail de confirmação do Administrador informando que sua conta foi aprovada.

### 4. Regras de Negócio e Validações
- **Aprovação Obrigatória**: Todo novo cadastro nasce com status `PENDING`. O usuário **não consegue entrar** até que um Admin mude o status para `APPROVED` na tela de Usuários.
- **Bloqueio de Recusados**: Se o status for `REJECTED`, o login é bloqueado permanentemente com a mensagem "Sua solicitação de cadastro foi recusada".
- **Sessão Única**: O sistema mantém a sessão via Cookies `HttpOnly`. O token expira (padrão 24h), exigindo re-login.

### 5. Resolução de Problemas (FAQ)
- **Erro "Approval Pending"**: Você logou corretamente, mas o Admin ainda não liberou seu acesso. Contate o suporte da sua empresa.
- **Loop de Redirecionamento**: Limpe os cookies do navegador ou tente em aba anônima. Geralmente causado por conflito de contas Google gravadas.

---

## 2. Módulo de Inspeções (Execução e Wizard)

### 1. Visão Geral
O coração do sistema. Permite planejar, executar (coletar dados em campo) e finalizar inspeções técnicas com suporte a checklists, evidências multimídia e geolocalização.

### 2. Interface Detalhada (Mapeamento de Tela)

**Lista de Inspeções (`/inspections`)**
- **Botão "Nova Inspeção"**: Azul com ícone `+`. Inicia o Wizard de criação.
- **Botão "Baixar Offline"**: Botão cinza/índigo. Baixa todos os dados da organização para o cache do navegador (PWA).
- **Barra de Busca**: Filtra por título, empresa, local ou nome do técnico.
- **Filtro de Status**: Dropdown (Pendente, Em Andamento, Concluída, Cancelada).
- **Cards de Inspeção**:
  - **Botão "Ver Detalhes"**: Abre a inspeção para execução.
  - **Botão "Clonar" (Ícone Copy)**: Duplica a inspeção mantendo dados básicos, mas resetando o checklist.
  - **Botão "Excluir" (Ícone Lixeira)**: Remove a inspeção (requer confirmação).

**Wizard de Nova Inspeção (`/inspections/new`)**
- **Etapa 1 (Info Básica)**:
  - Campos Título* e Descrição.
  - Sugestões (Tags): Clicáveis para preenchimento rápido.
- **Etapa 2 (Local)**:
  - **Botão "Capturar GPS"**: Solicita geolocalização ao navegador. Preenche Latitude/Longitude.
  - **Campo "Setores"**: Input com tags (chips). Digite e dê Enter para adicionar múltiplos locais (ex: "Casa de Máquinas").
  - **Auto-complete de Empresa**: Busca empresas cadastradas enquanto digita.
- **Etapa 3 (Equipe)**:
  - **Seleção de Técnicos**: Múltipla escolha com avatares. O primeiro é o líder.
- **Etapa 4 (Config)**:
  - **Dropdown Template**: Seleciona o checklist base.
  - **Dropdown IA**: Seleciona o "Persona" da IA auxiliar (opcional).

**Tela de Execução (`/inspections/:id`)**
- **Botão "Adicionar Item"**: Insere uma pergunta extra no checklist manualmente.
- **Botão "Gerar Análise IA"**: Envia itens não conformes e fotos para o GPT-4.
- **Botão "Finalizar Inspeção"**: Valida campos e abre modal de assinaturas.
- **Ícone Câmera (Item)**: Abre modal de upload de foto/vídeo para aquele item.
- **Botões C/NC/NA**: Conforme (Verde), Não Conforme (Vermelho), Não Aplicável (Cinza).

### 3. Guia Passo a Passo (Happy Path - Execução)
1. Na lista, clique em "Ver Detalhes" de uma inspeção pendente.
2. Navegue pelos grupos de perguntas (Acordeões).
3. Para cada pergunta:
   - Clique em **C** (Conforme) ou **NC**.
   - Se **NC**: O sistema exige evidência? (Configurável). Recomendado adicionar foto clicando na Câmera.
4. Ao final, clique em **"Finalizar Inspeção"**.
5. No modal de Assinatura:
   - Técnico assina na tela (touch ou mouse).
   - Responsável pelo local assina.
6. Clique em "Salvar e Finalizar". O status muda para "Concluída".

### 4. Regras de Negócio e Validações
- **GPS Obrigatório**: O sistema alerta (Warning) se tentar salvar sem GPS na criação, mas permite prosseguir.
- **Itens Pendentes**: O botão "Finalizar" varre todos os itens obrigatórios. Se houver item sem resposta, exibe alerta "Você precisa responder X itens".
- **Assinatura Dupla**: Para finalizar, é OBRIGATÓRIO ter a assinatura do Inspetor E do Responsável.
- **Imutabilidade**: Após finalizada (Concluída), a inspeção torna-se somente leitura. Para editar, é necessário usar a função "Reabrir" (requer justificativa).

### 5. Resolução de Problemas (FAQ)
- **Erro "Localização GPS Negada"**: Vá nas configurações do navegador (Chrome/Safari) > Privacidade > Localização e permita o acesso para o domínio do sistema.
- **Fotos não enviam (Timeout)**: Em conexões 3G/4G ruins, envie 2 ou 3 fotos por vez em vez de 10 de uma vez. O sistema tenta reconectar, mas uploads grandes podem falhar.

---

## 3. Módulo de Planos de Ação (5W2H)

### 1. Visão Geral
Gerencia o ciclo de vida das correções (Não Conformidades). Centraliza todas as ações corretivas geradas manualmente ou pela IA durante as inspeções.

### 2. Interface Detalhada (Mapeamento de Tela)

**Tela Planos de Ação (`/action-plans`)**
- **Cards de Estatística**: Total, Pendentes (Amarelo), Atrasadas (Vermelho), Alta Prioridade.
- **Filtros**:
  - **Busca Global**: Texto livre.
  - **Checkbox "Apenas Atrasadas"**: Filtra itens onde Data Prazo < Hoje.
  - **Checkbox "Geradas por IA"**: Mostra apenas sugestões automáticas.
- **Lista de Ações**:
  - **Ícone Olho**: Vai para a inspeção de origem.
  - **Ícone Lápis**: Abre modal de edição da ação (Status, Responsável, Custo).
  - **Ícone Lixeira**: Exclui a ação.
- **Componente "Exportar/Importar"**: Botões para gerar CSV ou importar planilha.

### 3. Guia Passo a Passo (Tratamento de Ação)
1. Identifique uma ação com status "Pendente" ou "Atrasada".
2. Clique no ícone **Lápis (Editar)**.
3. Atualize o campo **"Onde"** e **"Quem"** se estiverem vazios.
4. Defina um **Prazo (Quando)** realista.
5. Mude o status para **"Em Andamento"**. Salve.
6. Quando a correção for feita fisicamente, volte, mude o status para **"Concluída"** e adicione observações de custo.

### 4. Regras de Negócio e Validações
- **Status Automático de Atraso**: O sistema calcula o atraso dinamicamente (Data Atual > Prazo). Não existe um status "Atrasado" no banco, é um status calculado na visualização.
- **Vínculo Forte**: Não é possível mover uma ação de uma inspeção para outra.
- **IA Sugestiva**: Ações geradas por IA vêm marcadas com a flag `is_ai_generated`. Elas são sugestões e DEVEM ser validadas por um humano.

### 5. Resolução de Problemas (FAQ)
- **Ação sumiu da lista**: Verifique se o filtro "Organização" no topo da página está correto. Ações são isoladas por organização.
- **CSV vazio**: Se você filtrar por "Atrasadas" e não houver nenhuma, o CSV exportado virá apenas com o cabeçalho. Limpe os filtros antes de exportar tudo.

---

## 4. Módulo de Relatórios e Dashboard

### 1. Visão Geral
Fornece inteligência sobre os dados coletados. Permite visualização macro (Dashboard) e micro (Relatório PDF de uma inspeção específica).

### 2. Interface Detalhada (Mapeamento de Tela)

**Tela de Relatórios (`/reports`)**
- **StatsCards**: Total, Pendentes, Taxa de Conclusão (%).
- **Gráfico "Distribuição por Status"**: Donut chart mostrando a saúde das operações.
- **Botão "Exportar"**: Gera um relatório gerencial consolidado (formato a definir/CSV).
- **Seção "Relatórios Detalhados"**: Botões rápidos para relatórios pré-configurados (Mensal, Por Inspetor).

**Tela de Detalhe da Inspeção (Aba Relatório)**
- **Botão "Gerar Relatório PDF"**: Botão flutuante ou na barra de ações. Aciona o `PDFGenerator`.
- **Prévia de Impressão**: Não há preview nativo, o download é direto.

### 3. Guia Passo a Passo (Geração de PDF)
1. Finalize a inspeção (Status deve ser Concluída).
2. Clique no botão **"Gerar PDF"**.
3. O sistema compila: Capa + Sumário + Checklist + Fotos + Assinaturas.
4. O navegador baixará automaticamente o arquivo `Relatorio_Inspecao_ID.pdf`.

### 4. Regras de Negócio e Validações
- **Requisito de Conclusão**: Embora tecnicamente possível gerar PDF de inspeção em andamento, recomenda-se gerar apenas de inspeções Concluídas para garantir que as assinaturas apareçam.
- **Imagens Otimizadas**: O gerador de PDF redimensiona imagens para evitar arquivos gigantes (max 20-30MB por relatório).
- **Layout Fixo**: O layout segue o padrão A4 retrato com cabeçalho da empresa (Logo da Organização é usado se disponível).

### 5. Resolução de Problemas (FAQ)
- **PDF corta tabelas**: Descrições de itens extremamente longas (mais de 1 página de texto em um único item) podem quebrar a paginação. Recomenda-se ser conciso nas observações.
- **Logo não aparece**: Verifique se a Organização tem um logo cadastrado na tela "Minha Organização". Se não tiver, o PDF usa o logo padrão do sistema.
