---
description: Analisa o pedido do usuário, consulta o catálogo de skills, seleciona o melhor agente/skill, executa e faz o deploy. Responde sempre em PT-BR.
---

1. **Analisar o contexto e identificar a necessidade do usuário.**
   - Considere o último pedido do usuário e o estado atual do projeto.

2. **Consultar o catálogo de skills.**
   - Leia o arquivo `.agent/SKILLS_CATALOG.md` para ver as opções disponíveis.
   - Command: `view_file .agent/SKILLS_CATALOG.md`

3. **Selecionar a melhor skill.**
   - Com base na descrição da skill e na necessidade do usuário, escolha a mais adequada.
   - Priorize skills mais específicas (ex: `ui-ux-pro-max` para design) sobre genéricas.

4. **Notificar o usuário (EM PT-BR).**
   - Informe qual agente (skill) foi selecionado e o motivo.
   - Exemplo: "Selecionei o agente **[Nome da Skill]** pois ele é especializado em [Motivo]."
   - **IMPORTANTE:** Toda a comunicação deve ser em Português do Brasil.

5. **Carregar e Executar a Skill.**
   - Leia o arquivo de instruções da skill selecionada.
   - Command: `view_file .agent/skills/[nome-da-skill]/SKILL.md`
   - Siga rigorosamente as instruções contidas no `SKILL.md`.

6. **Executar Deploy Completo.**
   - Após a conclusão bem-sucedida da skill, execute o workflow de deploy.
   - Command: `view_file .agent/workflows/deploy_full.md`
   - Siga os passos definidos no workflow de deploy.
