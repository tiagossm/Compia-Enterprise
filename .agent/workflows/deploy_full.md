---
description: Deploy Full Stack (Supabase Edge Functions + Web App)
---

1.  **Build Web App**:
    ```poweshell
    npm run build
    ```

2.  **Deploy Edge Functions**:
    ```powershell
    supabase functions deploy api --no-verify-jwt
    ```

3.  **Deploy to Vercel**:
    ```powershell
    npx vercel --prod
    ```
