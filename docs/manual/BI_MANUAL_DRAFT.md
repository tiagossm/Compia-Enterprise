# 📚 Manual de BI e Métricas - Compia (DRAFT)

> **Controle de Documento (ISO 9001)**
> *   **Código:** MAN-BI-001
> *   **Versão:** 1.0 (Draft)
> *   **Data:** 13/01/2026
> *   **Responsável:** System Admin

---

## 1. Glossário de Métricas

### 1.1 Painel SaaS Metrics (System Admin)

Este painel é exclusivo para o Administrador do Sistema e visa monitorar a saúde do negócio e o consumo de recursos global.

### [Total de Organizações Ativas]
*   **Para que serve:** Monitora o crescimento da base de clientes e a adoção do sistema. Diferencia organizações "Master" (Consultorias) de subsidiárias (Unidades/Clientes).
*   **Como interpretar:**
    *   **Crescimento contínuo:** Indica saúde comercial.
    *   **Estagnação:** Pode exigir ações de marketing ou vendas.
*   **Ação recomendada:** Se o número de Unidades estiver alto mas o de Consultorias baixo, focar em vender para novos grupos de consultoria.

### [Consumo Global de IA (Tokens)]
*   **Para que serve:** Mede o custo operacional dos modelos de Inteligência Artificial (GPT-4, etc) em todo o sistema.
*   **Como interpretar:**
    *   **Barra Verde (Safe):** Consumo dentro da previsão de custos.
    *   **Barra Vermelha (Alert):** Consumo explodindo, risco de prejuízo Operacional.
*   **Ação recomendada:** Se o consumo estiver desproporcional à receita, revisar os Prompts da IA ou ajustar o pricing dos planos.

### [Taxa de Conversão de Inspeções]
*   **Para que serve:** Mede a eficácia do uso do sistema. Inspeções criadas vs. Inspeções finalizadas.
*   **Como interpretar:**
    *   Uma taxa baixa (< 50%) indica que usuários estão começando inspeções mas desistindo (problema de UX ou processo).
*   **Ação recomendada:** Investigar com Org Admins se há dificuldades técnicas no campo.

---

## 2. Protocolo de Validação de Dados

*   **Fonte da Verdade:** Banco de Dados Produção (Supabase).
*   **Atualização:** Tempo real (On-demand).
*   **Privacidade:** Dados agregados, sem exposição de PII (Personal Identifiable Information) neste painel macro.
