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

export default cepRoutes;

