import { Hono } from "hono";

const cepRoutes = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Helper function to perform CEP lookup with proper error handling
const performCepLookup = async (cepInput: string) => {
  try {
    if (!cepInput) {
      return {
        success: false,
        error: "CEP é obrigatório",
        status: 400
      };
    }

    // Clean CEP (remove dots, dashes, spaces)
    const cleanCep = cepInput.replace(/[-.\s]/g, '');

    // Validate CEP format (8 digits)
    if (!/^\d{8}$/.test(cleanCep)) {
      return {
        success: false,
        error: "CEP deve conter 8 dígitos numéricos",
        status: 400
      };
    }

    // Call external CEP API (using ViaCEP)
    const apiUrl = `https://viacep.com.br/ws/${cleanCep}/json/`;

    const response = await globalThis.fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; InspectionApp/1.0)',
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
      return {
        success: false,
        error: `Erro na consulta externa: ${response.status}`,
        status: 502
      };
    }

    const cepData = await response.json() as any;

    if (cepData.erro) {
      return {
        success: false,
        error: "CEP não encontrado",
        status: 404
      };
    }

    // Transform data to match our address format
    const addressData = {
      cep: cepData.cep,
      address: `${cepData.logradouro}${cepData.complemento ? ', ' + cepData.complemento : ''}, ${cepData.bairro}, ${cepData.localidade}/${cepData.uf}`,
      logradouro: cepData.logradouro,
      complemento: cepData.complemento,
      bairro: cepData.bairro,
      localidade: cepData.localidade,
      uf: cepData.uf,
      ibge: cepData.ibge,
      gia: cepData.gia,
      ddd: cepData.ddd,
      siafi: cepData.siafi
    };

    return {
      success: true,
      data: addressData,
      status: 200
    };

  } catch (error) {
    console.error('CEP lookup error:', error);
    return {
      success: false,
      error: "Erro interno ao consultar CEP",
      details: error instanceof Error ? error.message : "Erro desconhecido",
      status: 500
    };
  }
};

// CEP lookup endpoint with path parameter
cepRoutes.get("/:cep", async (c) => {
  // Set proper JSON content type header
  c.header('Content-Type', 'application/json');

  const cep = c.req.param("cep");
  const result = await performCepLookup(cep);

  if (result.success && result.data) {
    return c.json({
      success: true,
      data: result.data,
      address: result.data.address
    }, 200);
  } else {
    return c.json({
      error: result.error,
      details: result.details
    }, result.status as any);
  }
});

// CNPJ lookup endpoint - Proxy to BrasilAPI to avoid CORS issues
cepRoutes.get("/cnpj/:cnpj", async (c) => {
  c.header('Content-Type', 'application/json');

  const cnpjInput = c.req.param("cnpj");

  try {
    if (!cnpjInput) {
      return c.json({ error: "CNPJ é obrigatório" }, 400);
    }

    // Clean CNPJ (remove dots, dashes, slashes, spaces)
    const cleanCnpj = cnpjInput.replace(/[-.\/\s]/g, '');

    // Validate CNPJ format (14 digits)
    if (!/^\d{14}$/.test(cleanCnpj)) {
      return c.json({ error: "CNPJ deve conter 14 dígitos numéricos" }, 400);
    }

    // Call BrasilAPI
    const apiUrl = `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`;
    console.log(`[CEP-ROUTES] Fetching CNPJ from: ${apiUrl}`);

    const response = await globalThis.fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompiaApp/1.0)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return c.json({ error: "CNPJ não encontrado" }, 404);
      }
      if (response.status === 429) {
        return c.json({ error: "Muitas consultas. Tente novamente em alguns minutos." }, 429);
      }
      return c.json({ error: `Erro na consulta: ${response.status}` }, response.status);
    }

    const cnpjData = await response.json();

    // Return the data as-is from BrasilAPI
    return c.json({
      success: true,
      ...cnpjData
    }, 200);

  } catch (error) {
    console.error('[CEP-ROUTES] CNPJ lookup error:', error);
    return c.json({
      error: "Erro interno ao consultar CNPJ",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

export default cepRoutes;


