# Troubleshooting (Resolução de Problemas)

Este guia lista os problemas mais comuns encontrados no desenvolvimento e operação do COMPIA e como resolvê-los.

## 1. Erro de CORS nas Edge Functions

**Sintoma:** O Frontend recebe um erro `Access to fetch at '...' has been blocked by CORS policy`.

**Analise:**
As Edge Functions precisam responder explicitamente ao método `OPTIONS` (preflight) e incluir cabeçalhos CORS em todas as respostas.

**Solução:**
Verifique se a função está utilizando o middleware de CORS do `shared/cors.ts` (ou equivalente no Hono).

```typescript
// Exemplo de correção no index.ts
app.use('*', cors({
  origin: '*', // Ou domínio específico em produção
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
}))
```

## 2. Falha de Permissão (RLS Policies)

**Sintoma:** Consultas ao banco retornam array vazio `[]` ou erro de permissão, mesmo logado.

**Analise:**
O Supabase utiliza Row Level Security (RLS). Se não houver uma política explícita permitindo o acesso para o `org_id` atual, o banco ocultará os dados.

**Solução:**
1. Verifique o arquivo `migrations` correspondente a tabela.
2. Garanta que existe uma policy como:
```sql
CREATE POLICY "Users can view data from their own org"
ON public.my_table
FOR SELECT
USING (organization_id = (select auth.jwt() ->> 'org_id')::uuid);
```
3. Se estiver usando o Service Role (backend), lembre-se que ele ignora RLS, mas o cliente (frontend) não.

## 3. Timeout em Edge Functions

**Sintoma:** A requisição falha após 10-60 segundos com erro 504 Gateway Timeout.

**Analise:**
Edge Functions têm limites de tempo de execução (CPU time vs Wall clock time). Processamento pesado (como gerar PDFs grandes ou chamadas longas de IA) pode estourar esse limite.

**Solução:**
- Otimize o código para ser assíncrono.
- Para tarefas muito longas, mude a arquitetura para "Fire and Forget": A Edge Function inicia o processo, salva um status "Processing" no banco e retorna 200 OK imediatamente. O cliente faz polling ou usa Realtime para saber quando acabou.
