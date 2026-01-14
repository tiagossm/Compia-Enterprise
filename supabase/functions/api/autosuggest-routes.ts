import { Hono } from 'hono';
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";

const autosuggest = new Hono<{ Bindings: Env; Variables: { user: any } }>();

type Env = {
  DB: any;
};

// Companies autosuggest - now returns recent companies when search is empty
autosuggest.get("/companies", tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const search = c.req.query("search") || "";

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ suggestions: [] });
    }

    // Get user profile to check organization access
    const userProfile = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(user.id).first() as any;
    const isSystemAdmin = userProfile?.role === 'system_admin' || userProfile?.role === 'sys_admin' || userProfile?.role === 'admin';

    let companies;

    if (isSystemAdmin) {
      // System admin can see all organizations
      if (search.trim()) {
        // With search term - filter by name
        companies = await env.DB.prepare(`
          SELECT DISTINCT 
            COALESCE(o.nome_fantasia, o.name) as value, 
            COALESCE(o.nome_fantasia, o.name) as label, 
            o.contact_email as email,
            o.address,
            o.id as org_id
          FROM organizations o
          WHERE (COALESCE(o.nome_fantasia, o.name) LIKE ? OR o.razao_social LIKE ?)
            AND o.is_active = true
          ORDER BY COALESCE(o.nome_fantasia, o.name) 
          LIMIT 10
        `).bind(`%${search}%`, `%${search}%`).all();
      } else {
        // No search term - return all active companies ordered by name
        companies = await env.DB.prepare(`
          SELECT DISTINCT 
            COALESCE(o.nome_fantasia, o.name) as value, 
            COALESCE(o.nome_fantasia, o.name) as label, 
            o.contact_email as email,
            o.address,
            o.id as org_id
          FROM organizations o
          WHERE o.is_active = true
          ORDER BY COALESCE(o.nome_fantasia, o.name) 
          LIMIT 10
        `).all();
      }
    } else {
      // Non-admin users: get organizations from user_organizations table
      if (search.trim()) {
        companies = await env.DB.prepare(`
          SELECT DISTINCT 
            COALESCE(o.nome_fantasia, o.name) as value, 
            COALESCE(o.nome_fantasia, o.name) as label, 
            o.contact_email as email,
            o.address,
            o.id as org_id
          FROM organizations o
          INNER JOIN user_organizations uo ON uo.organization_id = o.id
          WHERE uo.user_id = ?
            AND uo.is_active = true
            AND o.is_active = true
            AND (COALESCE(o.nome_fantasia, o.name) LIKE ? OR o.razao_social LIKE ?)
          ORDER BY COALESCE(o.nome_fantasia, o.name) 
          LIMIT 10
        `).bind(user.id, `%${search}%`, `%${search}%`).all();
      } else {
        // No search - return all companies user has access to
        companies = await env.DB.prepare(`
          SELECT DISTINCT 
            COALESCE(o.nome_fantasia, o.name) as value, 
            COALESCE(o.nome_fantasia, o.name) as label, 
            o.contact_email as email,
            o.address,
            o.id as org_id
          FROM organizations o
          INNER JOIN user_organizations uo ON uo.organization_id = o.id
          WHERE uo.user_id = ?
            AND uo.is_active = true
            AND o.is_active = true
          ORDER BY COALESCE(o.nome_fantasia, o.name) 
          LIMIT 10
        `).bind(user.id).all();
      }

      // If no results from user_organizations, try user's primary organization
      if ((!companies.results || companies.results.length === 0) && userProfile?.organization_id) {
        companies = await env.DB.prepare(`
          SELECT DISTINCT 
            COALESCE(o.nome_fantasia, o.name) as value, 
            COALESCE(o.nome_fantasia, o.name) as label, 
            o.contact_email as email,
            o.address,
            o.id as org_id
          FROM organizations o
          WHERE o.id = ?
            OR o.parent_organization_id = ?
          ORDER BY COALESCE(o.nome_fantasia, o.name) 
          LIMIT 10
        `).bind(userProfile.organization_id, userProfile.organization_id).all();
      }
    }

    const results = (companies.results || []).slice(0, 10);
    console.log('[AUTOSUGGEST] Companies results:', JSON.stringify(results));

    return c.json({
      suggestions: results
    });
  } catch (error) {
    console.error('Error fetching company suggestions:', error);
    return c.json({ suggestions: [] });
  }
});


// Inspector suggestions
autosuggest.get('/inspectors', tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const search = c.req.query('search') || '';

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ suggestions: [] });
    }

    // First search in registered users (high priority)
    const userResults = await env.DB.prepare(
      `SELECT 
              name as value, 
              name as label, 
              email,
              100 as priority
       FROM users 
       WHERE (name LIKE ? OR email LIKE ?) 
         AND name IS NOT NULL AND name != '' 
         AND is_active = true
         AND (role = 'inspector' OR role = 'manager' OR role = 'admin' OR role = 'org_admin')
       ORDER BY name ASC
       LIMIT 8`
    )
      .bind(`%${search}%`, `%${search}%`)
      .all();

    // Then search in inspection data (lower priority)
    const inspectionResults = await env.DB.prepare(
      `SELECT DISTINCT 
              inspector_name as value, 
              inspector_name as label, 
              inspector_email as email, 
              COUNT(*) as usage_count,
              50 as priority
       FROM inspections 
       WHERE (inspector_name LIKE ? OR inspector_email LIKE ?)
         AND inspector_name IS NOT NULL AND inspector_name != ''
       GROUP BY inspector_name, inspector_email
       ORDER BY usage_count DESC, inspector_name ASC
       LIMIT 5`
    )
      .bind(`%${search}%`, `%${search}%`)
      .all();

    // Combine and remove duplicates
    const allSuggestions = [
      ...(userResults.results || []),
      ...(inspectionResults.results || [])
    ];

    const uniqueSuggestions = allSuggestions.reduce((acc: any[], current: any) => {
      const exists = acc.find((item: any) =>
        (item.value && current.value && item.value.toLowerCase() === current.value.toLowerCase()) ||
        (item.email && current.email && item.email.toLowerCase() === current.email.toLowerCase())
      );
      if (!exists && current.value) {
        acc.push({
          value: current.value,
          label: current.label,
          email: current.email,
          priority: current.priority
        });
      }
      return acc;
    }, [] as any[]);

    // Sort by priority and name
    uniqueSuggestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.value.localeCompare(b.value);
    });

    return c.json({
      suggestions: uniqueSuggestions.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching inspector suggestions:', error);
    return c.json({ suggestions: [] });
  }
});

// Responsible person suggestions
autosuggest.get('/responsibles', tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const search = c.req.query('search') || '';

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ suggestions: [] });
    }

    // Search in registered users (high priority)
    const userResults = await env.DB.prepare(
      `SELECT 
              name as value, 
              name as label, 
              email,
              100 as priority
       FROM users 
       WHERE (name LIKE ? OR email LIKE ?) 
         AND name IS NOT NULL AND name != ''
         AND is_active = true
       ORDER BY name ASC
       LIMIT 8`
    )
      .bind(`%${search}%`, `%${search}%`)
      .all();

    // Search from existing inspections (lower priority)
    const inspectionResults = await env.DB.prepare(
      `SELECT DISTINCT 
              responsible_name as value, 
              responsible_name as label, 
              responsible_email as email,
              COUNT(*) as usage_count,
              50 as priority
       FROM inspections 
       WHERE (responsible_name LIKE ? OR responsible_email LIKE ?)
         AND responsible_name IS NOT NULL AND responsible_name != ''
       GROUP BY responsible_name, responsible_email
       ORDER BY usage_count DESC, responsible_name ASC
       LIMIT 6`
    )
      .bind(`%${search}%`, `%${search}%`)
      .all();

    // Combine results, prioritizing registered users
    const allSuggestions = [
      ...(userResults.results || []),
      ...(inspectionResults.results || [])
    ];

    // Remove duplicates
    const uniqueSuggestions = allSuggestions.reduce((acc: any[], current: any) => {
      const exists = acc.find((item: any) =>
        (item.value && current.value && item.value.toLowerCase() === current.value.toLowerCase()) ||
        (item.email && current.email && item.email.toLowerCase() === current.email.toLowerCase())
      );
      if (!exists && current.value) {
        acc.push({
          value: current.value,
          label: current.label,
          email: current.email,
          priority: current.priority
        });
      }
      return acc;
    }, [] as any[]);

    // Sort by priority and name
    uniqueSuggestions.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.value.localeCompare(b.value);
    });

    return c.json({
      suggestions: uniqueSuggestions.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching responsible suggestions:', error);
    return c.json({ suggestions: [] });
  }
});

// Locations suggestions
autosuggest.get('/locations', tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const search = c.req.query('search') || '';

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ suggestions: [] });
    }

    const results = await env.DB.prepare(
      `SELECT DISTINCT location as value, location as label, COUNT(*) as usage_count
       FROM inspections 
       WHERE location LIKE ? AND location IS NOT NULL AND location != ''
       GROUP BY location
       ORDER BY usage_count DESC, location ASC
       LIMIT 10`
    )
      .bind(`%${search}%`)
      .all();

    return c.json({
      suggestions: (results.results || []).map((item: any) => ({
        value: item.value,
        label: item.label
      }))
    });
  } catch (error) {
    console.error('Error fetching location suggestions:', error);
    return c.json({ suggestions: [] });
  }
});

// Title suggestions for inspections
autosuggest.get('/inspection-titles', tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const search = c.req.query('search') || '';

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ suggestions: [] });
    }

    // Search existing titles
    const existingTitles = await env.DB.prepare(
      `SELECT DISTINCT title as value, title as label, COUNT(*) as usage_count
       FROM inspections 
       WHERE title LIKE ? AND title IS NOT NULL AND title != ''
       GROUP BY title
       ORDER BY usage_count DESC, title ASC
       LIMIT 8`
    )
      .bind(`%${search}%`)
      .all();

    // Add default suggestions based on common inspection types
    const defaultSuggestions = [
      'Inspeção de Equipamentos de Proteção Individual (EPI)',
      'Inspeção de Segurança em Altura',
      'Inspeção de Equipamentos de Proteção Coletiva (EPC)',
      'Inspeção de Máquinas e Equipamentos',
      'Inspeção de Instalações Elétricas',
      'Inspeção de Ambiente de Trabalho',
      'Inspeção de Sinalização de Segurança',
      'Inspeção de Ergonomia e Postura',
      'Inspeção de Prevenção Contra Incêndio',
      'Inspeção de Produtos Químicos e FISPQ'
    ].filter(suggestion =>
      search === '' || suggestion.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5).map(suggestion => ({
      value: suggestion,
      label: suggestion,
      usage_count: 0,
      is_default: true
    }));

    const allSuggestions = [
      ...(existingTitles.results || []),
      ...defaultSuggestions
    ];

    // Remove duplicates
    const uniqueSuggestions = allSuggestions.reduce((acc: any[], current: any) => {
      const exists = acc.find((item: any) =>
        item.value.toLowerCase() === current.value.toLowerCase()
      );
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, [] as any[]);

    return c.json({
      suggestions: uniqueSuggestions.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching title suggestions:', error);
    return c.json({ suggestions: [] });
  }
});

// Description suggestions for inspections
autosuggest.get('/inspection-descriptions', tenantAuthMiddleware, async (c) => {
  const env = c.env;
  const search = c.req.query('search') || '';

  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ suggestions: [] });
    }

    // Search existing descriptions
    const existingDescriptions = await env.DB.prepare(
      `SELECT DISTINCT description as value, description as label, COUNT(*) as usage_count
       FROM inspections 
       WHERE description LIKE ? AND description IS NOT NULL AND description != '' AND LENGTH(description) > 10
       GROUP BY description
       ORDER BY usage_count DESC, description ASC
       LIMIT 6`
    )
      .bind(`%${search}%`)
      .all();

    // Add default suggestions based on common descriptions
    const defaultSuggestions = [
      'Verificação de conformidade com as normas regulamentadoras de segurança do trabalho',
      'Avaliação dos equipamentos de proteção individual e coletiva disponíveis',
      'Inspeção das condições gerais de segurança e higiene do ambiente de trabalho',
      'Verificação do cumprimento dos procedimentos de segurança estabelecidos',
      'Avaliação dos riscos ocupacionais e medidas de controle implementadas',
      'Inspeção preventiva para identificação de potenciais riscos à segurança',
      'Verificação da adequação das instalações às normas de segurança vigentes',
      'Avaliação da eficácia dos treinamentos de segurança ministrados'
    ].filter(suggestion =>
      search === '' || suggestion.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 4).map(suggestion => ({
      value: suggestion,
      label: suggestion,
      usage_count: 0,
      is_default: true
    }));

    const allSuggestions = [
      ...(existingDescriptions.results || []),
      ...defaultSuggestions
    ];

    // Remove duplicates
    const uniqueSuggestions = allSuggestions.reduce((acc: any[], current: any) => {
      const exists = acc.find((item: any) =>
        item.value && current.value &&
        item.value.toLowerCase().trim() === current.value.toLowerCase().trim()
      );
      if (!exists && current.value) {
        acc.push({
          value: current.value,
          label: current.label,
          usage_count: current.usage_count || 0,
          is_default: current.is_default || false
        });
      }
      return acc;
    }, [] as any[]);

    return c.json({
      suggestions: uniqueSuggestions.slice(0, 8)
    });
  } catch (error) {
    console.error('Error fetching description suggestions:', error);
    return c.json({ suggestions: [] });
  }
});

export default autosuggest;

