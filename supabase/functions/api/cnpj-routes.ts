import { Hono } from "hono";

const cnpjRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>()
    .basePath('/api/cnpj');

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

        // Call BrasilAPI (more reliable than ReceitaWS)
        const apiUrl = `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`;
        console.log(`[CNPJ-ROUTES] Fetching CNPJ from: ${apiUrl}`);

        const response = await globalThis.fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; CompiaApp/1.0)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 429) {
                return {
                    success: false,
                    error: "Muitas consultas. Tente novamente em alguns minutos.",
                    status: 429
                };
            }
            if (response.status === 404) {
                return {
                    success: false,
                    error: "CNPJ não encontrado",
                    status: 404
                };
            }
            return {
                success: false,
                error: `Erro na consulta externa: ${response.status}`,
                status: 502
            };
        }

        const cnpjData = await response.json() as any;

        // BrasilAPI returns direct object, no 'status' field like ReceitaWS
        // If we got here (200 OK), data is valid.

        // Transform data to match our organization format
        const companyData = {
            cnpj: cnpjData.cnpj,
            razao_social: cnpjData.razao_social,
            nome_fantasia: cnpjData.nome_fantasia || cnpjData.razao_social,
            nome: cnpjData.nome_fantasia || cnpjData.razao_social,
            cnae_principal: cnpjData.cnae_fiscal || '',
            cnae_descricao: cnpjData.cnae_fiscal_descricao || '',
            natureza_juridica: cnpjData.natureza_juridica || '',
            data_abertura: cnpjData.data_inicio_atividade || '',
            capital_social: cnpjData.capital_social || 0,
            porte_empresa: cnpjData.porte || '',
            situacao_cadastral: cnpjData.situacao_cadastral || '', // BrasilAPI normally returns code, need verification if description is available
            address: cnpjData.logradouro
                ? `${cnpjData.logradouro}, ${cnpjData.numero}${cnpjData.complemento ? ' - ' + cnpjData.complemento : ''}, ${cnpjData.bairro}, ${cnpjData.municipio}/${cnpjData.uf}, CEP: ${cnpjData.cep}`
                : '',
            contact_email: cnpjData.email || '',
            contact_phone: cnpjData.ddd_telefone_1 ? `(${cnpjData.ddd_telefone_1.substring(0, 2)}) ${cnpjData.ddd_telefone_1.substring(2)}` : '',
            website: '',
            // Additional fields for reference
            logradouro: cnpjData.logradouro,
            numero: cnpjData.numero,
            complemento: cnpjData.complemento,
            bairro: cnpjData.bairro,
            municipio: cnpjData.municipio,
            uf: cnpjData.uf,
            cep: cnpjData.cep,
            atividades_secundarias: cnpjData.cnaes_secundarios || [], // BrasilAPI returns array of objects usually
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
