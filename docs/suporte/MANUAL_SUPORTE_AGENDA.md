# 📅 Manual de Suporte - Módulo de Agenda

> **Versão**: 1.0.0  
> **Data**: Janeiro 2026  
> **Sistema**: COMPIA - Sistema de Gestão de Inspeções  
> **Módulo**: Agenda (Calendário Integrado)

---

## 📋 Índice

1. [O que é o Módulo de Agenda?](#o-que-é-o-módulo-de-agenda)
2. [Como Acessar](#como-acessar)
3. [Visão Geral da Interface](#visão-geral-da-interface)
4. [Tipos de Eventos](#tipos-de-eventos)
5. [Criando um Novo Evento](#criando-um-novo-evento)
6. [Agendando uma Inspeção](#agendando-uma-inspeção)
7. [Editando Eventos](#editando-eventos)
8. [Arrastando Eventos (Drag and Drop)](#arrastando-eventos-drag-and-drop)
9. [Conflito de Horários](#conflito-de-horários)
10. [Participantes e RSVP](#participantes-e-rsvp)
11. [Escopo e Anexos](#escopo-e-anexos)
12. [Integrações](#integrações)
13. [Eventos de Sistema (Somente Leitura)](#eventos-de-sistema-somente-leitura)
14. [Perguntas Frequentes](#perguntas-frequentes)
15. [Erros Comuns e Soluções](#erros-comuns-e-soluções)

---

## O que é o Módulo de Agenda?

O **Módulo de Agenda** é o centro de gerenciamento de compromissos do COMPIA. Ele integra três tipos de informações em uma única visualização de calendário:

| Fonte | Descrição | Editável na Agenda? |
|-------|-----------|---------------------|
| **Eventos de Calendário** | Reuniões, bloqueios, tempo de foco | ✅ Sim |
| **Inspeções** | Inspeções agendadas automaticamente sincronizadas | ✅ Parcialmente |
| **Planos de Ação** | Deadlines de planos de ação (5W2H) | ❌ Somente leitura |

### Benefícios

- 📍 **Visualização Centralizada**: Veja todos os compromissos em um só lugar
- 🔄 **Sincronização Automática**: Inspeções criadas aparecem automaticamente no calendário
- ⚠️ **Prevenção de Conflitos**: Sistema alerta sobre agendamentos duplicados
- 🎯 **Arrastar e Soltar**: Reagende eventos facilmente arrastando-os para outro dia

---

## Como Acessar

### Caminho no Sistema

1. Faça login no COMPIA
2. No menu lateral esquerdo, clique em **"Agenda"**
3. A visualização do calendário será exibida

### URL Direta

```
https://seu-dominio.com/agenda
```

### Permissões Necessárias

| Perfil | Acesso |
|--------|--------|
| Administrador | ✅ Total |
| Gerente | ✅ Total |
| Inspetor | ✅ Visualizar + Criar próprios eventos |
| Visualizador | 👁️ Somente visualização |

---

## Visão Geral da Interface

### Barra Superior

```
┌─────────────────────────────────────────────────────────────────┐
│ Janeiro 2026   [< ] [Hoje] [>]     [Filtros ▼] [+ Novo Evento]  │
└─────────────────────────────────────────────────────────────────┘
```

| Elemento | Função |
|----------|--------|
| **Nome do Mês** | Exibe o mês e ano atual |
| **Setas <  / >** | Navegar para mês anterior/próximo |
| **Botão "Hoje"** | Voltar para o mês atual |
| **Filtros** | Filtrar por tipo de evento |
| **Novo Evento** | Criar um novo evento ou inspeção |

### Grade do Calendário

- **7 colunas**: Dom, Seg, Ter, Qua, Qui, Sex, Sáb
- **Linhas**: Semanas do mês
- **Dia atual**: Destacado com fundo azul claro e número em círculo azul
- **Dias fora do mês**: Exibidos em cinza claro
- **Eventos**: Exibidos como pequenas barras coloridas dentro de cada dia

### Cores dos Eventos

| Cor | Tipo de Evento |
|-----|----------------|
| 🔵 **Azul** | Inspeção |
| 🟢 **Verde** | Reunião |
| 🟣 **Roxo** | Tempo de Foco / Trabalho |
| ⚫ **Cinza** | Bloqueio / Deadline |
| ⬜ **Slate** | Outro |

---

## Tipos de Eventos

### 1. Inspeção 🔵

**Descrição**: Agendamento de uma inspeção técnica em campo.

**Campos Específicos**:
- Cliente / Empresa (obrigatório)
- Endereço completo (CEP, logradouro, número, bairro, cidade, UF)
- Template de Checklist (opcional - pode ser definido na hora)
- Inspetor responsável (participante principal)

**Comportamento Especial**:
- Ao salvar, cria automaticamente uma entrada na tabela de Inspeções
- Aparece tanto na Agenda quanto na listagem de Inspeções
- A partir do evento, é possível clicar em "Iniciar" para começar a inspeção

**Botões de Ação**:
- **Iniciar / Continuar**: Abre o formulário de execução da inspeção
- **Ver Relatório**: Disponível após conclusão, abre o relatório

### 2. Reunião 🟢

**Descrição**: Reuniões internas ou externas.

**Campos**:
- Título
- Data/Hora de início e fim
- Localização (texto livre)
- Descrição
- Participantes
- Escopo/Pauta

**Integrações Disponíveis**:
- Gerar Link Google Meet
- Enviar convite por e-mail

### 3. Tempo de Foco 🟣

**Descrição**: Bloqueio de tempo para trabalho concentrado.

**Uso Típico**:
- Reservar tempo para elaborar relatórios
- Preparação de checklists
- Trabalho que exige concentração

### 4. Bloqueio ⚫

**Descrição**: Período indisponível.

**Uso Típico**:
- Férias
- Afastamento
- Manutenção de equipamentos
- Deadlines importantes

### 5. Outro ⬜

**Descrição**: Eventos que não se encaixam nas categorias anteriores.

---

## Criando um Novo Evento

### Método 1: Botão "Novo Evento"

1. Clique no botão **"+ Novo Evento"** no canto superior direito
2. O modal de criação será aberto com a data de hoje

### Método 2: Clicando em um Dia

1. Clique em qualquer dia do calendário
2. O modal será aberto com a data clicada pré-selecionada

### Preenchendo o Formulário

O modal possui **3 abas**:

#### Aba 1: Geral

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| **Tipo de Evento** | ✅ Sim | Selecione: Inspeção, Reunião, Foco, Bloqueio ou Outro |
| **Título** | ✅ Sim | Nome do evento (ex: "Reunião com Cliente ABC") |
| **Início** | ✅ Sim | Data e hora de início |
| **Término** | ✅ Sim | Data e hora de término |
| **Descrição** | ❌ Não | Detalhes adicionais |
| **Localização** | ❌ Não | Endereço ou sala (para eventos não-inspeção) |

**Opções de Integração** (visíveis para Reuniões):
- [ ] Gerar Link Meet
- [ ] Enviar E-mail

#### Aba 2: Escopo & Anexos

**Pontos de Atenção / Escopo**:
Lista de itens que devem ser verificados ou discutidos no evento.

Como adicionar:
1. Digite o item no campo de texto
2. Pressione **Enter** ou clique em **"Adicionar"**
3. Os itens aparecem em uma lista numerada
4. Para remover, passe o mouse sobre o item e clique no **X**

**Anexos & Fotos**:
Arquivos relacionados ao evento.

Como anexar:
1. Clique em **"Selecionar Arquivo"**
2. Escolha um ou mais arquivos
3. Aguarde o upload
4. Os anexos aparecerão listados com link para download

#### Aba 3: Participantes

Adicione pessoas que devem participar do evento.

Como adicionar:
1. Selecione um usuário na lista dropdown
2. Clique em **"Adicionar"**
3. O participante aparece com ícone de status:
   - 🕐 **Relógio**: Pendente (ainda não respondeu)
   - ✅ **Check verde**: Aceitou o convite
   - ❌ **X vermelho**: Recusou o convite

### Salvando o Evento

1. Revise todas as informações nas 3 abas
2. Clique no botão **"Salvar"** no canto inferior direito
3. O modal será fechado e o evento aparecerá no calendário

---

## Agendando uma Inspeção

Agendar uma inspeção pela Agenda é uma forma rápida de criar uma inspeção já com data marcada.

### Passo a Passo Detalhado

1. **Clique em "Novo Evento"** ou em um dia no calendário

2. **Selecione "Inspeção"** nos tipos de evento
   - Um painel azul será exibido com campos específicos

3. **Preencha o Cliente**
   - Digite o nome da empresa no campo "Cliente / Empresa"
   - O sistema buscará sugestões de empresas cadastradas
   - Ao selecionar, o endereço será preenchido automaticamente

4. **Verifique o Endereço**
   - Os seguintes campos serão exibidos:
     - CEP
     - Logradouro
     - Número
     - Complemento
     - Bairro
     - Cidade
     - UF
   - Ajuste se necessário

5. **Selecione o Template (Opcional)**
   - Escolha um template de checklist ou deixe como "Decidir na hora da inspeção"
   - Se não selecionar agora, poderá escolher ao iniciar a inspeção

6. **Defina Título e Horário**
   - O título será prefixado automaticamente com "Inspeção: "
   - Escolha data e hora de início/término

7. **Adicione o Inspetor (Aba Participantes)**
   - Adicione o inspetor responsável como participante
   - Ele receberá o evento em seu calendário

8. **Clique em "Salvar"**

### Após o Agendamento

- A inspeção aparecerá:
  - ✅ Na Agenda (como evento azul)
  - ✅ Na listagem de Inspeções (status "Agendada")
  
- O inspetor verá o evento em seu calendário pessoal

- Ao clicar no evento, os botões estão disponíveis:
  - **"Iniciar"**: Abre o formulário para executar a inspeção
  - **"Ver Relatório"**: Disponível após conclusão

### Links de Navegação

Ao visualizar a inspeção na agenda, links para navegação são exibidos:
- **Abrir no Waze**: Abre o aplicativo Waze com o endereço
- **Google Maps**: Abre o Google Maps com o endereço

---

## Editando Eventos

### Como Editar

1. **Clique no evento** no calendário
2. O modal será aberto em modo de edição
3. Faça as alterações necessárias
4. Clique em **"Salvar"**

### Campos Editáveis por Tipo

| Campo | Evento Manual | Inspeção | Plano de Ação |
|-------|---------------|----------|---------------|
| Título | ✅ | ✅ | ❌ |
| Data/Hora | ✅ | ✅ | ❌ |
| Descrição | ✅ | ✅ | ❌ |
| Localização | ✅ | ✅ | ❌ |
| Participantes | ✅ | ✅ | ❌ |
| Escopo | ✅ | ❌ | ❌ |

### Excluindo Eventos

1. Abra o evento clicando nele
2. Clique no botão **"Excluir"** (vermelho, canto inferior esquerdo)
3. Clique novamente em **"Confirmar?"** para confirmar a exclusão

> ⚠️ **Atenção**: Ao excluir uma inspeção pela agenda, ela também será excluída da listagem de inspeções.

---

## Arrastando Eventos (Drag and Drop)

### Como Funciona

1. **Posicione o mouse** sobre o evento que deseja mover
2. O cursor mudará para indicar que é arrastável
3. **Clique e segure** o botão do mouse
4. **Arraste** o evento para outro dia
5. **Solte** o botão do mouse

### Comportamento

- O evento mantém o **mesmo horário** (apenas a data muda)
- A alteração é **salva automaticamente**
- Se houver **conflito de horário** no novo dia, um alerta será exibido

### Feedback Visual

- O dia de destino fica destacado com **borda azul** durante o arraste
- Se o arraste for cancelado, o evento volta à posição original

### Limitações

- Eventos de **Planos de Ação** não podem ser arrastados (somente leitura)
- Eventos de **organizações diferentes** não podem ser arrastados

---

## Conflito de Horários

### O que é?

O sistema detecta automaticamente quando você tenta criar ou mover um evento para um horário que já possui outro evento.

### Quando Ocorre?

Um conflito é detectado quando:
- O novo evento **começa antes** do fim de outro evento
- E **termina depois** do início de outro evento
- E envolve o **mesmo participante**

### O que Acontece?

1. Ao tentar salvar, um **alerta de confirmação** é exibido
2. O alerta lista os **eventos conflitantes**
3. Você pode escolher:
   - **Sim**: Criar o evento mesmo assim
   - **Não**: Cancelar e ajustar os horários

### Exemplo de Alerta

```
⚠️ Conflito de Horário Detectado!

Já existem eventos neste período:
• Reunião com Fornecedor (10:00-11:00)
• Inspeção: Empresa ABC (10:30-11:30)

Deseja criar o evento mesmo assim?

[Sim]  [Não]
```

### Dica

Para evitar conflitos:
- Verifique o calendário antes de criar novos eventos
- Use a visualização de mês para ter uma visão geral
- Considere criar bloqueios para períodos que você não quer ser agendado

---

## Participantes e RSVP

### Adicionando Participantes

1. Vá para a **aba "Participantes"** no modal do evento
2. Selecione um usuário no dropdown
3. Clique em **"Adicionar"**

### Status de Resposta (RSVP)

Cada participante possui um status de resposta:

| Ícone | Status | Significado |
|-------|--------|-------------|
| 🕐 | Pendente | Ainda não respondeu ao convite |
| ✅ | Aceito | Confirmou participação |
| ❌ | Recusado | Não poderá participar |

### Como Responder a um Convite

Se você foi adicionado como participante em um evento:

1. Acesse a **Agenda**
2. Clique no **evento**
3. Na parte inferior do modal, você verá os botões:
   - **"Aceitar"**: Confirma sua participação
   - **"Recusar"**: Indica que não poderá participar
4. Clique na opção desejada

Após responder, seu status será atualizado para todos os participantes.

### Visualizando Respostas

O organizador pode ver o status de cada participante:
- Abra o evento
- Vá para a aba **"Participantes"**
- Veja os ícones ao lado de cada nome

---

## Escopo e Anexos

### Pontos de Atenção / Escopo

Use este campo para listar itens específicos que devem ser abordados no evento.

**Exemplos de uso**:

Para uma **Inspeção**:
- Verificar extintores do bloco B
- Fotografar saída de emergência
- Checar data de validade dos EPIs

Para uma **Reunião**:
- Discutir orçamento Q2
- Apresentar resultados da auditoria
- Definir responsáveis para ações corretivas

### Anexos

Anexe arquivos relevantes ao evento:

**Tipos de arquivo aceitos**:
- Documentos (PDF, DOC, XLSX)
- Imagens (JPG, PNG, GIF)
- Outros arquivos

**Limite de tamanho**: Consulte administrador do sistema

**Como anexar**:
1. Vá para a aba **"Escopo & Anexos"**
2. Clique em **"Selecionar Arquivo"**
3. Escolha o(s) arquivo(s)
4. Aguarde o upload (indicador de carregamento aparecerá)
5. O arquivo será listado com link para download

---

## Integrações

### Google Meet

**Funcionalidade**: Gerar automaticamente um link de videoconferência.

**Como usar**:
1. Na aba **"Geral"**, marque a opção **"Gerar Link Meet"**
2. Salve o evento
3. O link será exibido no evento com botão **"Entrar"**

> ⚠️ **Nota**: Esta funcionalidade requer integração com Google Workspace configurada.

### Notificação por E-mail

**Funcionalidade**: Enviar convite por e-mail aos participantes.

**Como usar**:
1. Na aba **"Geral"**, marque a opção **"Enviar E-mail"**
2. Opcionalmente, adicione uma **mensagem personalizada**
3. Salve o evento
4. Os participantes receberão um e-mail com os detalhes

**Conteúdo do e-mail**:
- Título do evento
- Data e hora
- Localização
- Descrição
- Mensagem personalizada (se preenchida)
- Link para o sistema

---

## Eventos de Sistema (Somente Leitura)

Alguns eventos são exibidos no calendário mas **não podem ser editados** diretamente pela Agenda.

### Inspeções de Outras Organizações

- **Identificação**: Etiqueta "Somente Leitura" no modal
- **Motivo**: Você é participante mas não o organizador
- **Ações disponíveis**: Visualizar, Aceitar/Recusar convite

### Planos de Ação

- **Identificação**: ID prefixado com "action-"
- **Motivo**: Criados pelo módulo de Planos de Ação
- **Cor**: Cinza
- **Exibe**: Descrição do plano e prazo (due_date)
- **Para editar**: Acesse o módulo de Planos de Ação

### Navegação para Módulos Originais

Para eventos de sistema, links de navegação são exibidos:
- **Inspeções**: Botão "Ver Relatório" ou "Iniciar"
- **Planos de Ação**: Link para o módulo de Planos de Ação (em desenvolvimento)

---

## Perguntas Frequentes

### 1. Por que não consigo editar uma inspeção na agenda?

**Resposta**: Verifique se:
- A inspeção pertence à sua organização
- Você tem permissão de edição
- A inspeção não foi concluída (inspeções concluídas são somente leitura)

### 2. Criei uma inspeção pela agenda, onde ela aparece?

**Resposta**: A inspeção aparece em dois lugares:
- Na **Agenda** (como evento azul)
- Na **listagem de Inspeções** (menu Inspeções)

### 3. Posso criar uma inspeção sem escolher o template agora?

**Sim!** Deixe o campo "Checklist / Template" como "Decidir na hora da inspeção". Ao iniciar a inspeção, você poderá escolher ou criar um checklist.

### 4. O que significa o ícone de relógio ao lado do participante?

**Resposta**: Significa que o participante ainda não respondeu ao convite (status: Pendente).

### 5. Como removo um participante de um evento?

**Resposta**: 
1. Abra o evento
2. Vá para a aba "Participantes"
3. Passe o mouse sobre o participante
4. Clique no **X** que aparece
5. Salve o evento

### 6. Posso reagendar uma inspeção arrastando ela para outro dia?

**Sim!** Basta arrastar o evento para o novo dia. A data da inspeção será atualizada automaticamente.

### 7. Por que estou vendo eventos de cor cinza?

**Resposta**: Eventos cinza são **Bloqueios** ou **Deadlines de Planos de Ação**. Eles indicam períodos indisponíveis ou prazos importantes.

### 8. Como vejo apenas as inspeções no calendário?

**Resposta**:
1. Clique no botão **"Filtros"**
2. Selecione **"Inspeção"**
3. Apenas eventos do tipo inspeção serão exibidos
4. Para voltar, clique em **"Limpar"** ou selecione **"Todos"**

### 9. É possível criar eventos recorrentes?

**Resposta**: Atualmente, eventos recorrentes não são suportados. Cada evento deve ser criado individualmente.

### 10. Como exporto minha agenda?

**Resposta**: A exportação de agenda não está disponível no momento. Para integrações com calendários externos (Google Calendar, Outlook), consulte o administrador do sistema.

---

## Erros Comuns e Soluções

### Erro: "Campos obrigatórios: title, start_time, end_time, event_type"

**Causa**: Você tentou salvar um evento sem preencher todos os campos obrigatórios.

**Solução**: Verifique se preencheu:
- ✅ Tipo de evento (selecionado)
- ✅ Título
- ✅ Data/Hora de início
- ✅ Data/Hora de término

---

### Erro: "Conflito de horário detectado"

**Causa**: Já existe um evento no horário selecionado para o mesmo participante.

**Solução**: 
- Ajuste o horário do novo evento
- Ou confirme a criação mesmo assim (se intencional)

---

### Erro: "User is not associated with any organization"

**Causa**: Seu usuário não está vinculado a nenhuma organização.

**Solução**: Contate o administrador do sistema para associar seu usuário a uma organização.

---

### Erro: "Evento não encontrado ou permissão negada"

**Causa**: O evento foi excluído ou você não tem permissão para acessá-lo.

**Solução**:
- Atualize a página (F5)
- Verifique se você tem acesso à organização do evento
- Se persistir, contate o administrador

---

### Erro: "Erro ao fazer upload"

**Causa**: Falha no envio do arquivo anexo.

**Solução**:
- Verifique sua conexão com a internet
- Tente novamente com um arquivo menor
- Verifique se o formato do arquivo é suportado

---

### Evento não aparece no calendário após criar

**Causas possíveis**:
1. Você está visualizando outro mês
2. O filtro está ativo para outro tipo de evento
3. Erro silencioso no salvamento

**Solução**:
1. Clique em **"Hoje"** para voltar ao mês atual
2. Limpe os filtros clicando em **"Filtros" > "Todos"**
3. Atualize a página (F5)
4. Verifique no console do navegador se há erros (F12)

---

### Não consigo arrastar o evento

**Causas possíveis**:
1. O evento é de "Somente Leitura" (outra organização ou Plano de Ação)
2. Problema no navegador

**Solução**:
1. Verifique se o evento é editável (não tem etiqueta "Somente Leitura")
2. Tente em outro navegador (Chrome recomendado)
3. Atualize a página

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Agenda** | Módulo de calendário do COMPIA |
| **RSVP** | Resposta a convite (Aceitar/Recusar) |
| **Drag and Drop** | Arrastar e soltar eventos |
| **Template** | Modelo de checklist pré-definido |
| **Escopo** | Lista de pontos a serem verificados/discutidos |
| **Conflito** | Sobreposição de horários entre eventos |
| **Evento de Sistema** | Evento criado automaticamente (inspeções, planos de ação) |

---

## Contato do Suporte

Para dúvidas ou problemas não listados neste manual:

- **E-mail**: suporte@compia.com.br
- **Telefone**: (11) 9999-9999
- **Chat**: Disponível no canto inferior direito do sistema

---

> **Última atualização**: Janeiro 2026  
> **Versão do Sistema**: 2.0.0  
> **Autor**: Chronos (Calendar & Scheduling Engineer)
