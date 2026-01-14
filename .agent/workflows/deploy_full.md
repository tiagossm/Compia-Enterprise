---
description: Realiza o deploy completo da aplicação (Banco de Dados, Edge Functions e Frontend Vercel)
---

1. Deploy das Edge Functions do Supabase
   ```bash
   npx supabase functions deploy api --no-verify-jwt
   ```

2. Aplicação de Migrações do Banco de Dados
   - Verificar migrações pendentes
   - Aplicar via MCP (`supabase-mcp-server`) ou CLI (`npx supabase db push`)

3. Deploy de Produção no Vercel
   - Executar o comand de build e deploy
   ```bash
   vercel --prod
   ```
