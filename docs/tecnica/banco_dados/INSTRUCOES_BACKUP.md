# Como exportar o Banco de Dados do Supabase

Existe sim uma forma de extrair **tudo** (tabelas, políticas RLS, funções, triggers, etc.) do seu projeto Supabase. A ferramenta oficial para isso é a CLI do Supabase.

## 1. Exportar Apenas o Esquema (Estrutura)
Para salvar a estrutura do banco (útil para versionamento ou criar novos ambientes):

```powershell
npx supabase db dump --linked -f supabase/full_schema.sql
```

Se o seu projeto não estiver "linkado" localmente, use a string de conexão (pegue em Project Settings > Database > Connection URI):

```powershell
npx supabase db dump --db-url "postgresql://postgres:SENHA@db.seu-projeto.supabase.co:5432/postgres" -f supabase/full_schema.sql
```

## 2. Exportar Dados (Apenas Dados)
A CLI do Supabase separa o dump de esquema do dump de dados. Para baixar os dados (inserts):

```powershell
npx supabase db dump --data-only --linked -f supabase/data_backup.sql
```

**Para um backup completo (Estrutura + Dados):**
Você deve rodar os dois comandos (o de Schema acima e o de Data abaixo) e ter dois arquivos, ou concatená-los se desejar restaurar tudo de uma vez.

> **Nota:** Se você estiver usando o recurso de Storage (arquivos), isso não baixa os arquivos bucket, apenas as referências no banco.

## 3. Requisitos e Solução de Problemas

### Erro: "failed to inspect docker image"
O comando `supabase db dump` necessita do **Docker Desktop** rodando, pois ele cria um container temporário para usar a versão correta do `pg_dump`.
1. Certifique-se de que o Docker Desktop está instalado e rodando.
2. Tente rodar o comando novamente.

### Alternativa sem Docker (Requer `pg_dump` instalado)
Se você não quiser usar o Docker, você precisa instalar o **PostgreSQL** no seu Windows (apenas as ferramentas de linha de comando já bastam) para ter acesso ao comando `pg_dump`.

Após instalar e garantir que `pg_dump` está no seu PATH, você pode rodar direto:

```powershell
# Apenas Dados
pg_dump --data-only --column-inserts "postgresql://postgres:[SENHA]@[HOST]:5432/postgres" -f supabase/data.sql

# Tudo
pg_dump "postgresql://postgres:[SENHA]@[HOST]:5432/postgres" -f supabase/full.sql
```

> A string de conexão completa você encontra no Painel Supabase em **Settings > Database > Connection String > URI**.

## 4. Via Painel (Alternativa Limitada)
No painel do Supabase:
1. Vá em **Database**.
2. Clique em **Table Editor**.
3. Exporte como CSV tabela por tabela (não recomendado para backups completos).
