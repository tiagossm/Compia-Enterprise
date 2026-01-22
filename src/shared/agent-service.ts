import { TestAgent } from "@compia/agents";

/**
 * Serviço central para interagir com o novo repositório de agentes.
 * Adicione novos agentes aqui conforme forem criados em ../compia-agents
 */
export const AgentService = {
    /**
     * Executa o agente de teste para validar a conexão.
     */
    async runTest(message: string) {
        try {
            console.log("Chamando agente de teste...");
            const response = await TestAgent.run(message);
            return response;
        } catch (error) {
            console.error("Erro ao chamar agente:", error);
            throw error;
        }
    }
};
