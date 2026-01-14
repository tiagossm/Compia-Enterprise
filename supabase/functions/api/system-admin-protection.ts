// Proteção automática para o usuário system_admin principal
// Este módulo garante que eng.tiagosm@gmail.com e usuários demo sempre tenham acesso como system_admin

export async function ensureSystemAdminAccess(env: Env): Promise<void> {
  if (!env?.DB) {
    console.log('[SYSTEM-ADMIN-PROTECTION] Database não disponível');
    return;
  }

  try {
    const SYSTEM_ADMIN_EMAIL = 'eng.tiagosm@gmail.com';
    const SYSTEM_ADMIN_ID = '84edf8d1-77d9-4c73-935e-d76745bc3707'; // ID real do usuário
    const DEMO_USER_EMAIL = 'demo@compia.test';
    const DEMO_USER_ID = 'demo-user-84edf8d1-77d9-4c73-935e-d76745bc3707'; // ID do usuário demo

    // Verificar se o usuário principal existe
    let systemAdmin = await env.DB.prepare(
      "SELECT * FROM users WHERE email = ? OR id = ?"
    ).bind(SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_ID).first() as any;

    // Se não existe, criar o usuário principal
    if (!systemAdmin) {
      console.log('[SYSTEM-ADMIN-PROTECTION] Criando usuário system_admin');

      await env.DB.prepare(`
        INSERT INTO users (
          id, email, name, role, can_manage_users, can_create_organizations,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `).bind(
        SYSTEM_ADMIN_ID,
        SYSTEM_ADMIN_EMAIL,
        'Tiago Mocha System Admin',
        'sys_admin',
        1,
        1,
        1
      ).run();

      systemAdmin = await env.DB.prepare(
        "SELECT * FROM users WHERE id = ?"
      ).bind(SYSTEM_ADMIN_ID).first() as any;
    }

    // Verificar se o usuário demo existe
    let demoUser = await env.DB.prepare(
      "SELECT * FROM users WHERE email = ? OR id = ?"
    ).bind(DEMO_USER_EMAIL, DEMO_USER_ID).first() as any;

    // Se não existe, criar o usuário demo
    if (!demoUser) {
      console.log('[SYSTEM-ADMIN-PROTECTION] Criando usuário demo');

      await env.DB.prepare(`
        INSERT INTO users (
          id, email, name, role, can_manage_users, can_create_organizations,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `).bind(
        DEMO_USER_ID,
        DEMO_USER_EMAIL,
        'Usuário Demo',
        'sys_admin',
        1,
        1,
        1
      ).run();

      demoUser = await env.DB.prepare(
        "SELECT * FROM users WHERE id = ?"
      ).bind(DEMO_USER_ID).first() as any;
    }

    // Garantir que o usuário principal tem role sys_admin
    if (systemAdmin.role !== 'sys_admin') {
      console.log('[SYSTEM-ADMIN-PROTECTION] Corrigindo role para sys_admin');

      await env.DB.prepare(`
        UPDATE users 
        SET role = 'sys_admin', can_manage_users = 1, can_create_organizations = 1,
            is_active = 1, updated_at = NOW()
        WHERE id = ?
      `).bind(SYSTEM_ADMIN_ID).run();
    }

    // Garantir que o usuário demo tem role sys_admin
    if (demoUser && demoUser.role !== 'sys_admin') {
      console.log('[SYSTEM-ADMIN-PROTECTION] Corrigindo role do usuário demo para sys_admin');

      await env.DB.prepare(`
        UPDATE users 
        SET role = 'sys_admin', can_manage_users = 1, can_create_organizations = 1,
            is_active = 1, updated_at = NOW()
        WHERE id = ?
      `).bind(DEMO_USER_ID).run();
    }

    // Verificar se existe uma organização master
    let masterOrg = await env.DB.prepare(`
      SELECT * FROM organizations 
      WHERE name = 'COMPIA Master' OR name LIKE '%Master%' OR name LIKE '%COMPIA%'
      ORDER BY id ASC
      LIMIT 1
    `).first() as any;

    // Se não existe, criar organização master
    if (!masterOrg) {
      console.log('[SYSTEM-ADMIN-PROTECTION] Criando organização master');

      const result = await env.DB.prepare(`
        INSERT INTO organizations (
          name, type, is_active, created_at, updated_at,
          organization_level, max_users, max_subsidiaries
        ) VALUES (?, ?, ?, NOW(), NOW(), ?, ?, ?)
      `).bind(
        'COMPIA Master',
        'company',
        1, // SQLite uses 1 for true
        'company',
        10000,
        1000
      ).run();

      masterOrg = {
        id: result.meta.last_row_id,
        name: 'COMPIA Master'
      };
    }

    // Garantir que o system_admin está associado à organização master
    if (systemAdmin.organization_id !== masterOrg.id) {
      console.log('[SYSTEM-ADMIN-PROTECTION] Associando system_admin à organização master');

      await env.DB.prepare(`
        UPDATE users 
        SET organization_id = ?, managed_organization_id = ?, updated_at = NOW()
        WHERE id = ?
      `).bind(masterOrg.id, masterOrg.id, SYSTEM_ADMIN_ID).run();
    }

    // Verificar se existe entrada em user_organizations
    const userOrgAssociation = await env.DB.prepare(`
      SELECT * FROM user_organizations 
      WHERE user_id = ? AND organization_id = ?
    `).bind(SYSTEM_ADMIN_ID, masterOrg.id).first();

    if (!userOrgAssociation) {
      console.log('[SYSTEM-ADMIN-PROTECTION] Criando associação user_organizations');

      await env.DB.prepare(`
        INSERT INTO user_organizations (
          user_id, organization_id, role, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())
      `).bind(SYSTEM_ADMIN_ID, masterOrg.id, 'owner', 1).run();
    }

    // Verificar se está protegido na tabela protected_users
    // Primeiro garantir que o usuário realmente existe na tabela users
    const userExists = await env.DB.prepare(`
      SELECT id FROM users WHERE id = ?
    `).bind(SYSTEM_ADMIN_ID).first();

    if (userExists) {
      const protection = await env.DB.prepare(`
        SELECT * FROM protected_users WHERE user_id = ?
      `).bind(SYSTEM_ADMIN_ID).first();

      if (!protection) {
        console.log('[SYSTEM-ADMIN-PROTECTION] Adicionando proteção de usuário');

        try {
          await env.DB.prepare(`
            INSERT INTO protected_users (
              user_id, protection_level, protected_roles, protected_permissions,
              reason, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
          `).bind(
            SYSTEM_ADMIN_ID,
            'high',
            JSON.stringify(['sys_admin', 'system_admin']),
            JSON.stringify(['all']),
            'Usuário administrador principal do sistema COMPIA',
            'system'
          ).run();
        } catch (error) {
          console.error('[SYSTEM-ADMIN-PROTECTION] Erro ao inserir proteção:', error);
          // Não falhar completamente se não conseguir proteger
        }
      }
    } else {
      console.log('[SYSTEM-ADMIN-PROTECTION] Usuário não existe, pulando proteção');
    }

    console.log('[SYSTEM-ADMIN-PROTECTION] Proteções aplicadas com sucesso');

  } catch (error) {
    console.error('[SYSTEM-ADMIN-PROTECTION] Erro ao garantir acesso do system_admin:', error);
  }
}

// Função para executar auto-correção via endpoint
export async function autoFixSystemAdmin(env: Env): Promise<{ success: boolean, message: string }> {
  try {
    await ensureSystemAdminAccess(env);
    return {
      success: true,
      message: 'Sistema auto-corrigido com sucesso. Acesso de system_admin restaurado.'
    };
  } catch (error) {
    console.error('[AUTO-FIX] Erro na auto-correção:', error);
    return {
      success: false,
      message: `Erro na auto-correção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    };
  }
}

