---
description: Deploy Full Stack (Supabase Edge Functions + Web App)
---

1.  **Build Web App**:
    ```poweshell
    npm run build
    ```

2.  **Deploy Edge Functions**:
    ```powershell
    # ⚠️ USE APENAS O BINÁRIO LOCAL (v2.74.0). NÃO USE NPX!
    supabase functions deploy api --project-ref vjlvvmriqerfmztwtewa --no-verify-jwt --debug
    ```

3.  **Deploy to Vercel**:
    ```powershell
    npx vercel --prod
    ```
