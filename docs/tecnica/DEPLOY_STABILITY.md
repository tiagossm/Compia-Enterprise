# Estabilidade de Deploy - Regra de Ouro (Supabase)

**Data:** 2026-02-05
**Status:** MANDATORY / OBRIGATÓRIO

---

## 🚫 O QUE NÃO FAZER

Jamais utilizar `npx supabase` para deploys ou comandos de infraestrutura.

```powershell
# ❌ INCORRETO
npx supabase functions deploy api
```

**Por que?**
- `npx` baixa a versão `latest` da CLI (atualmente v2.75.x+).
- A versão `2.75.x` introduziu quebras de compatibilidade de arquitetura (`exec format error`) no ambiente Windows/Containers deste projeto.
- Isso causa falhas silenciosas ou erros 255 no bundle.

---

## ✅ O QUE FAZER (PADRÃO)

Utilizar sempre o binário local `supabase` instalado via Scoop/Gerenciador de Pacotes, que está pinado numa versão estável.

**Versão Homologada:** `2.74.0`

```powershell
# ✅ CORRETO
supabase functions deploy api --project-ref vjlvvmriqerfmztwtewa --no-verify-jwt
```

---

## 🛠️ Procedimento de Recuperação

Se o erro `exec format error` aparecer:

1. Verifique a versão:
   ```powershell
   supabase --version
   ```
   Deve ser **2.74.0**.

2. Se não estiver instalado ou for versão diferente:
   ```powershell
   scoop install supabase@2.74.0
   # ou downgrade correspondente
   ```

3. Limpe caches se necessário:
   ```powershell
   # Em caso de persistência de cache do npx
   npm cache clean --force
   ```

---

## 📜 Histórico

- **2026-02-05:** Erro crítico com CLI v2.75.5 impedindo deploy. Decisão de travar operação na v2.74.0 via Scoop.
