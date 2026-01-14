import { Hono } from "hono";

const cnpjRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Helper function to perform CNPJ lookup with proper error handling
const performCnpjLookup = async (cnpjInput: string) => {
    try {
        if (!cnpjInput) {
            return {
                success: false,
                error: "CNPJ é obrigatório",
                status: 400
            };
        }

        // Clean CNPJ (remove dots, dashes, slashes, spaces)
        const cleanCnpj = cnpjInput.replace(/[.\-/\s]/g, '');

        // Validate CNPJ format (14 digits)
        if (!/^\d{14}$/.test(cleanCnpj)) {
            return {
                success: false,
                error: "CNPJ deve conter 14 dígitos numéricos",
                status: 400
            };
        }

        // Call external CNPJ API (using ReceitaWS - API gratuita)
        const apiUrl = `https://receitaws.com.br/v1/cnpj/${cleanCnpj}`;

        const response = await globalThis.fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; InspectionApp/1.0)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 429) {
                return {
                    success: false,
                    error: "Muitas consultas. Tente novamente em alguns minutos. (Limite da API gratuita: 3/minuto)",
                    status: 429
                };
            }
            return {
                success: false,
                error: `Erro na consulta externa: ${response.status}`,
                status: 502
            };
        }

        const cnpjData = await response.json() as any;

        if (cnpjData.status === 'ERROR') {
            return {
                success: false,
                error: cnpjData.message || "CNPJ não encontrado",
                status: 404
            };
        }

        // Transform data to match our organization format
        const companyData = {
            cnpj: cnpjData.cnpj,
            razao_social: cnpjData.nome,
            nome_fantasia: cnpjData.fantasia || cnpjData.nome,
            nome: cnpjData.fantasia || cnpjData.nome,
            cnae_principal: cnpjData.atividade_principal?.[0]?.code || '',
            cnae_descricao: cnpjData.atividade_principal?.[0]?.text || '',
            natureza_juridica: cnpjData.natureza_juridica || '',
            data_abertura: cnpjData.abertura || '',
            capital_social: parseFloat(cnpjData.capital_social?.replace(/[. ]/g, '').replace(',', '.')) || 0,
            porte_empresa: cnpjData.porte || '',
            situacao_cadastral: cnpjData.situacao || '',
            address: cnpjData.logradouro
                ? `${cnpjData.logradouro}, ${cnpjData.numero}${cnpjData.complemento ? ' - ' + cnpjData.complemento : ''}, ${cnpjData.bairro}, ${cnpjData.municipio}/${cnpjData.uf}, CEP: ${cnpjData.cep}`
                : '',
            contact_email: cnpjData.email || '',
            contact_phone: cnpjData.telefone || '',
            website: '',
            // Additional fields for reference
            logradouro: cnpjData.logradouro,
            numero: cnpjData.numero,
            complemento: cnpjData.complemento,
            bairro: cnpjData.bairro,
            municipio: cnpjData.municipio,
            uf: cnpjData.uf,
            cep: cnpjData.cep,
            atividades_secundarias: cnpjData.atividades_secundarias || [],
            qsa: cnpjData.qsa || [] // Quadro de sócios
        };

        return {
            success: true,
            data: companyData,
            status: 200
        };

    } catch (error) {
        console.error('CNPJ lookup error:', error);
        return {
            success: false,
            error: "Erro interno ao consultar CNPJ",
            details: error instanceof Error ? error.message : "Erro desconhecido",
            status: 500
        };
    }
};

// CNPJ lookup endpoint with path parameter
cnpjRoutes.get("/:cnpj", async (c) => {
    // Set proper JSON content type header
    c.header('Content-Type', 'application/json');

    const cnpj = c.req.param("cnpj");
    const result = await performCnpjLookup(cnpj);

    if (result.success && result.data) {
        return c.json({
            success: true,
            data: result.data
        }, 200);
    } else {
        return c.json({
            success: false,
            error: result.error,
            details: result.details
        }, result.status as any);
    }
});

export default cnpjRoutes;
