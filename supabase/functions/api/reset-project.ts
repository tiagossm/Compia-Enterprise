import { Hono } from "hono";

type Env = {
  DB: any;
};

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Endpoint para resetar completamente o banco
app.post("/reset/database", async (c) => {
  try {
    const db = c.env.DB;

    // 1. Drop all tables if they exist
    const dropTables = [
      'DROP TABLE IF EXISTS action_plans',
      'DROP TABLE IF EXISTS inspection_items',
      'DROP TABLE IF EXISTS checklist_fields',
      'DROP TABLE IF EXISTS checklist_templates',
      'DROP TABLE IF EXISTS inspections',
      'DROP TABLE IF EXISTS user_invitations',
      'DROP TABLE IF EXISTS organizations',
      'DROP TABLE IF EXISTS users'
    ];

    for (const query of dropTables) {
      await db.prepare(query).run();
    }

    // 2. Re-create all tables with correct schema
    const createQueries = [
      // Users table
      `CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'inspector',
        can_manage_users BOOLEAN DEFAULT 0,
        can_create_organizations BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        organization_id INTEGER,
        managed_organization_id INTEGER,
        phone TEXT,
        avatar_url TEXT,
        last_login_at DATETIME,
        password_hash TEXT,
        email_verified_at DATETIME,
        profile_completed BOOLEAN DEFAULT 0,
        invitation_token TEXT,
        invited_by TEXT,
        invitation_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Organizations table  
      `CREATE TABLE organizations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        razao_social TEXT,
        nome_fantasia TEXT,
        cnpj TEXT,
        type TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        address TEXT,
        is_active BOOLEAN DEFAULT 1,
        parent_organization_id INTEGER,
        organization_level TEXT DEFAULT 'company',
        subscription_status TEXT DEFAULT 'active',
        subscription_plan TEXT DEFAULT 'basic',
        max_users INTEGER DEFAULT 50,
        max_subsidiaries INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Inspections table (com as colunas de assinatura da migração 7)
      `CREATE TABLE inspections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        inspector_name TEXT,
        inspector_email TEXT,
        company_name TEXT,
        cep TEXT,
        address TEXT,
        latitude REAL,
        longitude REAL,
        scheduled_date DATE,
        completed_date DATE,
        status TEXT DEFAULT 'pendente',
        priority TEXT DEFAULT 'media',
        created_by TEXT,
        organization_id INTEGER,
        responsible_name TEXT,
        responsible_email TEXT,
        inspector_signature TEXT,
        responsible_signature TEXT,
        action_plan TEXT,
        action_plan_type TEXT,
        ai_assistant_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )`,

      // Checklist templates
      `CREATE TABLE checklist_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        created_by TEXT,
        created_by_user_id INTEGER,
        organization_id INTEGER,
        is_public BOOLEAN DEFAULT 0,
        is_category_folder BOOLEAN DEFAULT 0,
        folder_color TEXT,
        folder_icon TEXT,
        parent_category_id INTEGER,
        folder_id INTEGER,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id)
      )`
    ];

    for (const query of createQueries) {
      await db.prepare(query).run();
    }

    // 3. Insert initial data
    await db.prepare(`
      INSERT INTO organizations (name, organization_level, subscription_status) 
      VALUES ('Organização Demo', 'master', 'active')
    `).run();

    await db.prepare(`
      INSERT INTO users (email, name, role, can_manage_users, can_create_organizations, organization_id) 
      VALUES ('eng.tiagosm@gmail.com', 'Admin Sistema', 'system_admin', 1, 1, 1)
    `).run();

    await db.prepare(`
      INSERT INTO checklist_templates (name, description, is_public, organization_id, created_by) 
      VALUES ('Template Demo', 'Template básico para testes', 1, 1, 'eng.tiagosm@gmail.com')
    `).run();

    return c.json({
      success: true,
      message: "Banco resetado e inicializado com dados básicos"
    });

  } catch (error) {
    console.error('Reset error:', error);
    return c.json({
      error: "Erro ao resetar banco",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

// Endpoint para verificar status do sistema
app.get("/status", async (c) => {
  try {
    const db = c.env.DB;

    const tables = await db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all();

    const counts: Record<string, any> = {};
    for (const table of tables.results) {
      try {
        const count = await db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).first();
        counts[table.name] = count.count;
      } catch (e) {
        counts[table.name] = 'erro';
      }
    }

    return c.json({
      database_connected: true,
      tables: tables.results.map((t: any) => t.name),
      record_counts: counts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return c.json({
      database_connected: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

export default app;

