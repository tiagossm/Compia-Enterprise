# COMPIA - Sistema de Inspeção com IA

Sistema B2B Multi-tenant para Inspeções de Segurança do Trabalho, utilizando Inteligência Artificial para análise e geração de relatórios.

## 🚀 Como Rodar o Projeto do Zero

Este guia assume que você tem **Node.js (v20+)** e **Supabase CLI** instalados.

### 1. Configuração Inicial

Clone o repositório e instale as dependências:

```bash
# Instalar dependências do Frontend
npm install
```

### 2. Configuração de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as chaves do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

> **Nota:** Não é necessário configurar o Backend localmente para rodar o Frontend se você estiver conectando a um projeto Supabase remoto já existente. Se for desenvolver o backend, precisará das chaves de serviço no `.env` da pasta `supabase`.

### 3. Executando o Frontend

Para iniciar o servidor de desenvolvimento local:

```bash
npm run dev
```

O sistema estará acessível em `http://localhost:5173`.

### 4. Deploy e Backend

O backend é inteiramente Serverless (Supabase Edge Functions).

```bash
# Login no Supabase
npx supabase login

# Deploy das Funções (Backend)
npx supabase functions deploy api
```

Para mais detalhes sobre a arquitetura técnica, consulte [ARCHITECTURE.md](./ARCHITECTURE.md).
Para entender o modelo Multi-tenant, consulte [MULTI_TENANT_DOCUMENTATION.md](./MULTI_TENANT_DOCUMENTATION.md).

## 🛠 Troubleshooting

Encontrou problemas? Consulte [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) para soluções comuns.
