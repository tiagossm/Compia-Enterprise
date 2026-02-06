# Manual Operacional: Módulo de Inspeção

## Controle de Revisão do Documento

| Versão | Data | Responsável | Descrição da Mudança |
| :--- | :--- | :--- | :--- |
| 1.0 | 11/01/2026 | Inspector Agent | Criação inicial do documento. Documentação completa de: Lista de Inspeções, Wizard de Criação (4 passos), Tela de Execução, Finalização/Assinaturas, FAQ. |
| 1.1 | 11/01/2026 | Inspector Agent | Backend atualizado para exibir avatares de inspetores logados via Google. Foto do perfil Google agora é persistida automaticamente. |
| 1.2 | 11/01/2026 | Inspector Agent | Corrigido backend GET /inspections/:id para retornar avatar do inspetor também na tela de Detalhes. |

---

Este manual descreve todas as telas, botões e funcionalidades do Módulo de Inspeção do Compia. Use-o como referência para operação do sistema.

---

## 1. Tela: Lista de Inspeções (Dashboard)

**Objetivo:** Visão geral de todas as vistorias da organização selecionada.

**Caminho de Acesso:** Menu lateral → "Inspeções"

### Elementos da Interface

| Elemento | Descrição |
|----------|-----------|
| **Botão "Nova Inspeção"** | Abre o wizard de criação de nova inspeção. Localizado no canto superior direito (azul com ícone `+`). |
| **Botão "Baixar Offline"** | Baixa todas as inspeções e modelos da organização para uso offline. Útil antes de ir a campo sem internet. |
| **Campo de Busca** | Filtra inspeções por **título**, **empresa**, **local** ou **nome do técnico**. Digite e os resultados aparecem automaticamente. |
| **Filtro de Status** | Dropdown para filtrar por: `Todos os Status`, `Pendente`, `Em Andamento`, `Concluída`, `Cancelada`. |

### Cards de Inspeção

Cada inspeção aparece como um card contendo:
- **Título** da inspeção
- **Badge de Prioridade**: Verde (Baixa), Amarelo (Média), Laranja (Alta), Vermelho (Crítica)
- **Empresa**, **Local**, **Técnico Responsável**, **Data Agendada**
- **Status** com ícone colorido:
  - 🕐 Amarelo = `Pendente` (aguardando início)
  - ▶️ Azul = `Em Andamento` (inspeção iniciada)
  - ✅ Verde = `Concluída` (finalizada e assinada)
  - ⚠️ Vermelho = `Cancelada`

### Ações em Cada Card

| Ícone | Ação |
|-------|------|
| ✏️ **Editar** | Abre o wizard de edição (não disponível para inspeções concluídas). |
| 📋 **Clonar** | Cria uma cópia da inspeção (apenas dados básicos, sem respostas). Útil para inspeções recorrentes. |
| 🗑️ **Excluir** | Remove permanentemente a inspeção. Uma confirmação será solicitada. |
| **Ver Detalhes** | Abre a tela de execução/checklist da inspeção. |

### Importar/Exportar CSV

- **Exportar**: Baixa um arquivo `.csv` com todas as inspeções filtradas.
- **Importar**: Permite criar múltiplas inspeções de uma vez via upload de CSV.

---

## 2. O Wizard de Criação (Passo a Passo)

**Objetivo:** Criar uma nova inspeção seguindo 4 etapas obrigatórias.

**Caminho de Acesso:** Botão "Nova Inspeção" → `/inspections/new`

### Passo 1: Informações Básicas
| Campo | Obrigatório? | Descrição |
|-------|--------------|-----------|
| **Título** | ✅ Sim | Nome identificador da inspeção. Mínimo: 1 caractere. |
| **Descrição** | Não | Detalhes adicionais sobre o objetivo da vistoria. |
| **Prioridade** | Não | `Baixa`, `Média`, `Alta` ou `Crítica`. Padrão: Média. |

> **Validação:** O botão "Próximo" só é habilitado após preencher o Título.

### Passo 2: Localização
| Campo | Obrigatório? | Descrição |
|-------|--------------|-----------|
| **Empresa / Cliente** | ✅ Sim | Nome da empresa onde a inspeção será realizada. |
| **Setores / Áreas** | ✅ Sim | Lista de setores a serem inspecionados (pode adicionar múltiplos). |
| **CEP** | Não | Ao digitar um CEP válido, os campos de endereço são preenchidos automaticamente via API dos Correios. |
| **Endereço Completo** | Não | Logradouro, número, bairro, cidade, UF. |
| **Botão "Capturar GPS"** | Não | Obtém latitude e longitude do dispositivo. |

> **Sobre o GPS:**
> - O navegador solicitará permissão de localização. Aceite para capturar as coordenadas.
> - Caso esteja em ambiente fechado ou sem sinal GPS, a captura pode falhar. Nesse caso, preencha o endereço manualmente.
> - Se a alta precisão falhar (timeout de 20s), o sistema tentará automaticamente com baixa precisão.

### Passo 3: Equipe
| Campo | Obrigatório? | Descrição |
|-------|--------------|-----------|
| **Nome do Inspetor Principal** | ✅ Sim | Técnico responsável pela execução. |
| **E-mail do Inspetor** | Não | Para notificações. |
| **Responsável no Local** | Não | Nome do contato na empresa. |
| **Data Agendada** | Não | Data prevista para a inspeção. |
| **Inspetores Adicionais** | Não | Lista de co-inspetores (multi-select). |

### Passo 4: Configuração
| Campo | Obrigatório? | Descrição |
|-------|--------------|-----------|
| **Template de Checklist** | Não | Selecione um modelo de checklist pré-cadastrado. Os itens aparecem automaticamente. |
| **Habilitar Análise IA** | Não | Permite que a IA gere análises automáticas para não-conformidades. |

> **Botão "Criar Inspeção"**: Só é habilitado se todos os campos obrigatórios estiverem preenchidos.

---

## 3. Tela de Execução (O Checklist)

**Objetivo:** Executar a inspeção em campo, respondendo perguntas, anexando evidências e registrando não-conformidades.

**Caminho de Acesso:** Lista de Inspeções → "Ver Detalhes"

### Barra de Ações Principal

| Botão | Função |
|-------|--------|
| **Compartilhar** | Gera link para compartilhar inspeção. |
| **Gerar PDF** | Cria relatório PDF completo (com fotos, respostas, assinaturas). |
| **Ver Mapa de Calor** | Exibe mapa com pontos GPS das fotos tiradas durante a inspeção. |
| **Ver Plano de Ação** | Navega para a página de ações corretivas (5W2H). |
| **Gerar Análises (IA)** | Cria análise automática 5W2H para todos os itens não conformes usando Inteligência Artificial. |
| **Nova Ação** | Adiciona uma ação corretiva manual (formulário 5W2H). |
| **Add Item** | Adiciona um item de checklist manual (fora do template). |

### Respondendo o Checklist

- Os itens aparecem agrupados por seção/categoria.
- Para cada pergunta, responda conforme o tipo de campo:
  - **Sim/Não/N.A.** – Selecione uma opção travada.
  - **Texto** – Digite a resposta.
  - **Número/Nota** – Digite o valor numérico.
  - **Seleção Múltipla** – Marque as opções aplicáveis.
- O botão **Salvar Respostas** (na barra flutuante inferior) persiste suas respostas.

> **Comportamento Offline:**
> - Se você estiver **sem internet**, as respostas são salvas localmente no seu navegador (IndexedDB).
> - O ícone de sincronização indicará "Sincronizando..." quando houver dados pendentes.
> - Ao reconectar, os dados serão enviados automaticamente para o servidor.
> - **Dica:** Antes de ir a campo, use o botão "Baixar Offline" na lista de inspeções.

### Adicionando Evidências (Mídias)

| Ícone | Função |
|-------|--------|
| 📷 **Câmera** | Abre a câmera do dispositivo para tirar foto. A foto captura automaticamente as coordenadas GPS se permitido. |
| 🎤 **Microfone** | Inicia gravação de áudio (formato WebM). Clique novamente para parar. |
| 📎 **Upload** | Permite selecionar arquivos do dispositivo (fotos, documentos). |

**Limites de Arquivo:**
- **Imagens:** Máximo 10 MB por arquivo.
- **Vídeos:** Máximo 100 MB por arquivo.
- **Áudios:** Máximo 50 MB por arquivo.
- **Documentos:** Máximo 20 MB por arquivo.

> **Nota:** Se o upload falhar (sem internet), a mídia será enfileirada localmente e enviada quando a conexão for restabelecida.

### O Botão N/C (Não Conforme)

Quando você marca uma resposta como **"Não" ou "N/C"**, o sistema:
1. Destaca a pergunta com indicador visual vermelho.
2. Habilita campo de observações para detalhar a não-conformidade.
3. Permite gerar uma **Ação Corretiva 5W2H** (via IA ou manual) diretamente naquele item.

---

## 4. Finalização e Sincronização

### Acessando a Tela de Assinaturas

Na barra flutuante inferior, clique em **"Assinar e Finalizar"**.

### Regras para Habilitar a Finalização

O botão "Finalizar Inspeção" só fica habilitado se:

| Requisito | Descrição |
|-----------|-----------|
| ✅ Todas as perguntas respondidas | Nenhum item do checklist pode estar em branco. |
| ✅ Assinatura do Inspetor | O técnico deve desenhar sua assinatura no canvas. |
| ✅ Assinatura do Responsável | O responsável no local deve assinar no segundo canvas. |

### Capturando Assinaturas

1. Toque/clique no campo de assinatura.
2. Desenhe a assinatura com o dedo (mobile) ou mouse (desktop).
3. Clique em **"Salvar Assinatura"**.
4. Se errar, clique em **"Limpar"** e refaça.

### Finalizando a Inspeção

Após assinar:
1. Clique em **"Finalizar Inspeção"**.
2. O sistema validará se todos os requisitos foram atendidos.
3. Se tudo estiver correto, a inspeção muda para status **"Concluída"**.
4. Você será redirecionado para a **Tela de Resumo** automaticamente.

> **Importante:** Uma inspeção concluída **não pode mais ser editada** diretamente. Se precisar alterar algo, use o botão **"Reabrir"** (requer justificativa).

### Lidando com Erros de Sincronização

| Situação | O que fazer |
|----------|-------------|
| "Falha no Envio" | Verifique sua conexão. O sistema tentará novamente automaticamente quando online. |
| "Erro crítico ao salvar" | IndexedDB pode estar cheio. Limpe dados do navegador ou tente outro dispositivo. |
| Inspeção não aparece na lista | Aguarde a sincronização (pode levar alguns segundos). Force atualização com F5. |

---

## 5. FAQ e Solução de Problemas (Bugs Comuns)

### Problema 1: Câmera não abre / "Permissão negada"

**Causa:** O navegador bloqueou o acesso à câmera.

**Solução:**
1. Clique no ícone de cadeado 🔒 na barra de endereço.
2. Encontre "Câmera" e mude para "Permitir".
3. Recarregue a página (F5).
4. Tente novamente.

### Problema 2: GPS não captura / "Timeout"

**Causa:** Sinal GPS fraco (ambiente fechado) ou permissão negada.

**Solução:**
1. Vá para um local aberto (próximo a janela/área externa).
2. Verifique se a permissão de localização está ativa no navegador.
3. Aguarde até 20 segundos – o sistema tentará automaticamente com baixa precisão.
4. Se persistir, preencha o endereço manualmente.

### Problema 3: Upload de foto demora muito / "Erro de upload"

**Causa:** Arquivo muito grande ou conexão lenta.

**Solução:**
1. Reduza a qualidade da foto antes de enviar (use app de compressão).
2. Verifique se a rede Wi-Fi/4G está estável.
3. Inspeção está offline? A mídia será sincronizada automaticamente quando a conexão voltar.
4. Se o erro persistir, tente novamente mais tarde.

---

## 6. Glossário de Status

| Status | Significado |
|--------|-------------|
| **Pendente** | Inspeção criada, mas ainda não iniciada. |
| **Em Andamento** | Técnico está executando a vistoria. |
| **Concluída** | Inspeção finalizada e assinada. Relatório disponível. |
| **Cancelada** | Inspeção foi descartada (não será processada). |
| **Sincronizando** | Dados estão sendo enviados para o servidor. Aguarde. |

---

*Documento controlado conforme ISO 9001 – Controle de Documentos*
*Versão atual: Consulte a Tabela de Controle de Revisão no topo deste documento.*
