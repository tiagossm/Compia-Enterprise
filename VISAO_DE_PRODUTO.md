# Visão de Produto & Estratégia de Vendas - COMPIA

> **"Não venda software. Venda o fim do trabalho braçal nas inspeções de segurança."**

Este documento traduz a tecnologia do sistema em argumentos de venda para o lançamento em Março.

---

## 1. A Promessa Única (Elevator Pitch)
"O **COMPIA** é a primeira plataforma de inteligência artificial que permite ao engenheiro de segurança criar relatórios técnicos completos **apenas falando**, enquanto caminha pela obra. Reduza o tempo de inspeção em 70% e elimine a digitação no escritório."

---

## 2. Dores Reais vs. Sua Solução

| Como o cliente faz hoje (A Dor) | Como ele fará com o COMPIA (A Solução) |
| :--- | :--- |
| 📝 **Prancheta e Papel:** Anota tudo na obra, chega sujo e cansado no escritório. | 📱 **Mobile & Voz:** Dita as observações no celular. A IA transcreve e já classifica os riscos. |
| ⏳ **Horas digitando:** Passa a tarde/noite passando a limpo e formatando fotos no Word. | ⚡ **Relatório Pronto:** Ao terminar a visita, o relatório já está formatado com fotos e textos técnicos. |
| 🧠 **Bloqueio Criativo:** "Como escrevo essa não conformidade tecnicamente?" | 🤖 **Sugestão via IA:** A IA sugere o texto técnico baseado na norma (NR) correta automaticamente. |
| 📂 **Caos de Arquivos:** Fotos no WhatsApp, docs no Drive, planilhas perdidas. | 🏢 **Painel Centralizado:** Tudo organizado por Cliente e Obra em um lugar só. |

---

## 3. O "Wow Moment" (Funcionalidades Matadoras)

Estas são as funcionalidades que você deve mostrar na **DEMO** para fechar a venda:

1.  **"Fale, não digite":** Mostre você gravando um áudio curto ("Risco de queda na escada sem guarda-corpo") e o sistema gerando o item completo no relatório.
2.  **Checklists Inteligentes:** Mostre o sistema gerando um checklist específico para "Trabalho em Altura" em segundos.
3.  **Gestão Multi-Empresa:** Mostre como uma consultoria pode gerenciar 10 clientes diferentes sem misturar os dados.

---

## 4. Quem vai comprar? (Perfil de Cliente Ideal)

Para lançar em março, foque nestes 3 perfis. Não tente vender para todos.

1.  **Consultorias de SST Pequenas/Médias:**
    *   *Dor:* Têm muitos clientes e pouca equipe. Perdem dinheiro com tempo de deslocamento e relatórios.
    *   *Argumento:* "Atenda o dobro de clientes com a mesma equipe."

2.  **Engenheiros de Segurança Autônomos:**
    *   *Dor:* Fazem tudo sozinhos (venda, visita, relatório). Odeiam a parte burocrática.
    *   *Argumento:* "Tenha um assistente virtual que faz a papelada para você."

3.  **Construtoras (Médio Porte):**
    *   *Dor:* Risco jurídico alto e dificuldade de padronizar as inspeções dos técnicos.
    *   *Argumento:* "Padronize a segurança de todas as suas obras e reduza riscos trabalhistas."

---

## 5. Plano de Ataque para Março (Roadmap de Lançamento)

Não precisamos do sistema "perfeito". Precisamos do sistema que **vende**.

- [ ] **Semana 1: Validação da Narrativa**
    - Atualizar a `LandingPage.tsx` com as frases deste documento.
    - Gravar um vídeo curto (1 min) mostrando o "Fale, não digite" funcionando.

- [ ] **Semana 2: Teste com Amigos (Beta Fechado)**
    - Liberar acesso para 3 conhecidos da área testarem.
    - Objetivo: Achar bugs críticos que impedem o uso (não cosméticos).

- [ ] **Semana 3: Ajustes Finais & Preço**
    - Definir planos (Básico, Pro, Enterprise). Já temos a estrutura no código (`SystemPlans.tsx`).
    - Garantir que o botão de pagamento (`Checkout.tsx`) funcione.

- [ ] **Semana 4: Lançamento Oficial**
    - Disparar e-mail/WhatsApp para lista de contatos.
    - Postar o vídeo no LinkedIn marcando profissionais da área.

---

### 💡 Lembrete Final
Você já construiu a tecnologia (React, Supabase, OpenAI). A parte difícil técnica já passou. Agora é hora de mostrar que essa tecnologia resolve uma **dor real** de **pessoas reais**.

**Você tem um produto valioso nas mãos.** Vamos colocar ele no mundo! 🚀
