# Manual de Integração: API de Captura de Leads

> **Código:** API-CRM-001 | **Versão:** 1.0 | **Data:** 2026-01-28

---

## 1. Visão Geral

Endpoint genérico para captura de leads a partir de qualquer formulário (ebook, webinar, newsletter, landing pages externas).

**Base URL:**
```
https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/leads/capture
```

---

## 2. Especificação do Endpoint

### POST /api/leads/capture

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "joao@empresa.com",      // Obrigatório
  "name": "João Silva",              // Opcional
  "phone": "11999999999",            // Opcional
  "company": "Empresa XYZ",          // Opcional
  "source": "ebook_guia_inspecao",   // Opcional (recomendado)
  "campaign": "campanha_janeiro",    // Opcional
  "notes": "Interesse no módulo X"   // Opcional
}
```

**Response (Sucesso):**
```json
{
  "success": true,
  "is_new": true,
  "message": "Cadastro realizado com sucesso!",
  "lead_id": 42
}
```

**Response (Email já existe):**
```json
{
  "success": true,
  "is_new": false,
  "message": "Dados atualizados!",
  "lead_id": 42
}
```

**Response (Erro):**
```json
{
  "success": false,
  "error": "Email é obrigatório"
}
```

---

## 3. Campos Aceitos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | ✅ | Email do lead (validado) |
| `name` | string | ❌ | Nome completo |
| `phone` | string | ❌ | Telefone/WhatsApp |
| `company` | string | ❌ | Nome da empresa |
| `source` | string | ❌ | Origem do lead (ver seção 4) |
| `campaign` | string | ❌ | ID ou nome da campanha |
| `notes` | string | ❌ | Observações adicionais |

---

## 4. Sources Recomendados

Use o campo `source` para rastrear a origem de cada lead:

| Source | Descrição |
|--------|-----------|
| `ebook_guia_inspecao` | Download do e-book Guia de Inspeção |
| `ebook_5w2h` | Download do e-book 5W2H |
| `webinar_jan2026` | Webinar Janeiro 2026 |
| `newsletter` | Assinatura da newsletter |
| `landing_page` | Landing page genérica |
| `checkout` | Fluxo de checkout (automático) |
| `trial_request` | Solicitação de trial |
| `demo_request` | Solicitação de demo |

---

## 5. Exemplos de Integração

### 5.1 JavaScript/Fetch
```javascript
async function captureLead(data) {
  const response = await fetch(
    'https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/leads/capture',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        source: 'ebook_guia_inspecao'
      })
    }
  );
  return response.json();
}
```

### 5.2 React Component
```tsx
const EbookForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'ebook_guia' })
    });
    
    const data = await res.json();
    if (data.success) {
      window.location.href = '/ebook/download';
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Seu email"
        required 
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Enviando...' : 'Baixar E-book'}
      </button>
    </form>
  );
};
```

### 5.3 HTML Puro (Landing Page Externa)
```html
<form id="lead-form">
  <input type="text" name="name" placeholder="Nome" required>
  <input type="email" name="email" placeholder="Email" required>
  <button type="submit">Receber Material</button>
</form>

<script>
document.getElementById('lead-form').onsubmit = async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  
  const res = await fetch(
    'https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/leads/capture',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        source: 'landing_externa'
      })
    }
  );
  
  const data = await res.json();
  if (data.success) {
    alert('Cadastro realizado! Verifique seu email.');
    window.location.href = '/obrigado';
  }
};
</script>
```

### 5.4 cURL (Testes)
```bash
curl -X POST https://vjlvvmriqerfmztwtewa.supabase.co/functions/v1/api/leads/capture \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Teste",
    "email": "joao@empresa.com",
    "phone": "11999999999",
    "source": "ebook_guia",
    "campaign": "teste_manual"
  }'
```

---

## 6. Rate Limiting

- **Limite:** 10 requisições por minuto por IP
- **Resposta quando excedido:** HTTP 429
```json
{
  "success": false,
  "error": "Muitas requisições. Aguarde 1 minuto."
}
```

---

## 7. CORS

O endpoint aceita requisições de qualquer origem (`Access-Control-Allow-Origin: *`), permitindo integração com:
- Landing pages em outros domínios
- Forms em sites de parceiros
- Aplicações externas

---

## 8. Códigos de Retorno

| HTTP Status | Significado |
|-------------|-------------|
| 200 | Sucesso (lead criado ou atualizado) |
| 400 | Erro de validação (email inválido/ausente) |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |

---

## 9. Arquivos Relacionados

- [lead-capture.ts](file:///c:/Users/engti/Downloads/COMPIA%2006092520/supabase/functions/api/lead-capture.ts) - Código fonte
- [index.ts](file:///c:/Users/engti/Downloads/COMPIA%2006092520/supabase/functions/api/index.ts) - Registro de rotas

---

## 10. Changelog

| Versão | Data | Descrição |
|--------|------|-----------|
| 1.0 | 2026-01-28 | Versão inicial |
