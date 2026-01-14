import { Hono } from "hono";
import { requireProtectedSysAdmin } from "./rbac-middleware.ts";

type Env = {
  DB: any;
};

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// SEGURANÇA: Verificar se estamos em produção - bloquear debug endpoints
const isProduction = Deno.env.get('ENVIRONMENT') === 'production';

// Endpoint para consultar dados do banco
// PROTEGIDO: Apenas SysAdmin pode acessar, e bloqueado em produção
app.get("/debug/query", requireProtectedSysAdmin(), async (c) => {
  // Bloquear completamente em produção
  if (isProduction) {
    console.warn('[DEBUG-ROUTES] BLOQUEADO: Tentativa de acesso a debug em produção');
    return c.json({ error: "Debug endpoints desabilitados em produção" }, 403);
  }
  const { table, limit = "10" } = c.req.query();

  if (!table) {
    return c.json({ error: "Parâmetro 'table' é obrigatório" }, 400);
  }

  try {
    // Lista de tabelas permitidas por segurança
    const allowedTables = [
      'users', 'organizations', 'checklist_templates',
      'inspections', 'action_plans', 'checklist_folders',
      'inspection_items', 'action_plan_items'
    ];

    if (!allowedTables.includes(table)) {
      return c.json({
        error: "Tabela não permitida",
        allowedTables
      }, 400);
    }

    const query = `SELECT * FROM ${table} LIMIT ?`;
    const result = await c.env.DB.prepare(query).bind(limit).all();

    return c.json({
      table,
      count: result.results?.length || 0,
      data: result.results || []
    });

  } catch (error) {
    console.error('Database query error:', error);
    return c.json({
      error: "Erro ao consultar banco",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

// Endpoint para obter estrutura das tabelas (Postgres compatible)
// PROTEGIDO: Apenas SysAdmin pode acessar, e bloqueado em produção
app.get("/debug/schema", requireProtectedSysAdmin(), async (c) => {
  if (isProduction) {
    return c.json({ error: "Debug endpoints desabilitados em produção" }, 403);
  }
  try {
    const tableParam = c.req.query('table');

    if (tableParam) {
      // Query specific columns for a table
      const result = await c.env.DB.prepare(`
           SELECT column_name, data_type, is_nullable
           FROM information_schema.columns
           WHERE table_name = ?
           ORDER BY ordinal_position
        `).bind(tableParam).all();

      return c.json({
        table: tableParam,
        columns: result.results || []
      });
    }

    const result = await c.env.DB.prepare(`
      SELECT table_name as name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `).all();

    return c.json({
      tables: result.results || []
    });

  } catch (error) {
    console.error('Schema query error:', error);
    return c.json({
      error: "Erro ao obter schema",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

// Endpoint para contar registros
// PROTEGIDO: Apenas SysAdmin pode acessar, e bloqueado em produção
app.get("/debug/counts", requireProtectedSysAdmin(), async (c) => {
  if (isProduction) {
    return c.json({ error: "Debug endpoints desabilitados em produção" }, 403);
  }
  try {
    const tables = ['users', 'organizations', 'checklist_templates', 'inspections', 'action_plans'];
    const counts: Record<string, any> = {};

    for (const table of tables) {
      try {
        const result = await c.env.DB.prepare(`SELECT COUNT(*) as count FROM ${table}`).first() as any;
        counts[table] = result?.count || 0;
      } catch (err) {
        counts[table] = 'Tabela não existe ou erro';
      }
    }

    return c.json({ counts });

  } catch (error) {
    console.error('Counts query error:', error);
    return c.json({
      error: "Erro ao contar registros",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

export default app;

