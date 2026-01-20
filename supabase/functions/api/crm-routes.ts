
import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { ExtendedMochaUser, USER_ROLES } from "./user-types.ts";

type Env = {
    DB: any;
};

const getDatabase = (env: any) => env.DB;

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Require System Admin Middleware
const requireSysAdmin = async (c: any, next: any) => {
    const user = c.get('user');
    // Check both potential locations for role (depending on how user was populated)
    const userRole = user?.role || user?.profile?.role;

    if (userRole !== USER_ROLES.SYSTEM_ADMIN && userRole !== 'sys_admin') {
        return c.json({ error: 'Acesso negado. Apenas System Admins.' }, 403);
    }
    await next();
};

app.use('*', tenantAuthMiddleware);
app.use('*', requireSysAdmin);

// List Leads (with Pagination)
app.get('/leads', async (c) => {
    try {
        const db = getDatabase(c.env);
        const { page = '1', limit = '50', search = '', status = 'all' } = c.req.query();

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const limitVal = parseInt(limit);

        let query = "SELECT * FROM leads";
        let countQuery = "SELECT COUNT(*) as total FROM leads";
        const params: any[] = [];
        const conditions: string[] = [];

        // Apply filters
        if (search) {
            conditions.push("(company_name LIKE ? OR contact_name LIKE ? OR email LIKE ?)");
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        if (status !== 'all') {
            conditions.push("status = ?");
            params.push(status);
        }

        if (conditions.length > 0) {
            const whereClause = " WHERE " + conditions.join(" AND ");
            query += whereClause;
            countQuery += whereClause;
        }

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

        // Execute queries
        const { results: leads } = await db.prepare(query).bind(...params, limitVal, offset).all();
        const { total } = await db.prepare(countQuery).bind(...params).first() || { total: 0 };

        return c.json({
            leads,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / limitVal)
        });
    } catch (error) {
        console.error('Error fetching leads:', error);
        return c.json({ error: 'Erro ao buscar leads' }, 500);
    }
});

// Create Lead
app.post('/leads', async (c) => {
    try {
        const db = getDatabase(c.env);
        const user = c.get('user') as ExtendedMochaUser;

        const body = await c.req.json();
        const {
            company_name, contact_name, email, phone, status, source, notes,
            cnpj, razao_social, nome_fantasia, website,
            cep, logradouro, numero, complemento, bairro, cidade, uf
        } = body;

        const result = await db.prepare(`
      INSERT INTO leads (
          company_name, contact_name, email, phone, status, source, notes, 
          owner_id,
          cnpj, razao_social, nome_fantasia, website,
          cep, logradouro, numero, complemento, bairro, cidade, uf
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
            company_name,
            contact_name || null,
            email || null,
            phone || null,
            status || 'new',
            source || null,
            notes || null,
            user.id,
            cnpj || null,
            razao_social || null,
            nome_fantasia || null,
            website || null,
            cep || null,
            logradouro || null,
            numero || null,
            complemento || null,
            bairro || null,
            cidade || null,
            uf || null
        ).first();

        return c.json({ lead: result });
    } catch (error) {
        console.error('Error creating lead:', error);
        return c.json({ error: 'Erro ao criar lead' }, 500);
    }
});

// Update Lead
app.put('/leads/:id', async (c) => {
    try {
        const db = getDatabase(c.env);
        const leadId = c.req.param('id');
        const body = await c.req.json();

        // Dynamic Update
        const fields = [];
        const values = [];
        const allowed = [
            'company_name', 'contact_name', 'email', 'phone', 'status', 'source', 'notes',
            'cnpj', 'razao_social', 'nome_fantasia', 'website',
            'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'
        ];

        for (const key of allowed) {
            if (body[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(body[key]);
            }
        }

        if (fields.length === 0) return c.json({ message: 'Nothing to update' });

        // Auto-log Status Change
        if (body.status) {
            const currentLead = await db.prepare("SELECT status FROM leads WHERE id = ?").bind(leadId).first();
            if (currentLead && currentLead.status !== body.status) {
                await db.prepare(`
                    INSERT INTO crm_activities (lead_id, type, title, description, created_by) 
                    VALUES (?, 'status_change', 'Alteração de Status', ?, ?)
                 `).bind(
                    leadId,
                    `Status alterado de ${currentLead.status.toUpperCase()} para ${body.status.toUpperCase()}`,
                    (c.get('user') as any).id
                ).run();
            }
        }

        fields.push("updated_at = NOW()");

        await db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`)
            .bind(...values, leadId)
            .run();

        return c.json({ success: true });
    } catch (error) {
        console.error('Error updating lead:', error);
        return c.json({ error: 'Erro ao atualizar lead' }, 500);
    }
});

// List Activities
app.get('/leads/:id/activities', async (c) => {
    try {
        const db = getDatabase(c.env);
        const leadId = c.req.param('id');

        const { results } = await db.prepare(`
            SELECT a.*, u.email as user_email 
            FROM crm_activities a
            LEFT JOIN auth.users u ON a.created_by = u.id 
            WHERE lead_id = ? 
            ORDER BY created_at DESC
        `).bind(leadId).all();

        return c.json(results || []);
    } catch (error) {
        console.error('Error fetching activities:', error);
        return c.json({ error: 'Erro ao buscar atividades' }, 500);
    }
});

// Create Activity
app.post('/leads/:id/activities', async (c) => {
    try {
        const db = getDatabase(c.env);
        const user = c.get('user') as ExtendedMochaUser;
        const leadId = c.req.param('id');
        const body = await c.req.json();

        const { type, title, description } = body;

        await db.prepare(`
            INSERT INTO crm_activities (lead_id, type, title, description, created_by)
            VALUES (?, ?, ?, ?, ?)
        `).bind(leadId, type, title, description, user.id).run();

        return c.json({ success: true });
    } catch (error) {
        console.error('Error creating activity:', error);
        return c.json({ error: 'Erro ao criar atividade' }, 500);
    }
});

// Delete Lead
app.delete('/leads/:id', async (c) => {
    try {
        const db = getDatabase(c.env);
        const leadId = c.req.param('id');
        await db.prepare("DELETE FROM leads WHERE id = ?").bind(leadId).run();
        return c.json({ success: true });
    } catch (error) {
        return c.json({ error: 'Erro ao deletar lead' }, 500);
    }
});

// ✨ CONVERT LEAD TO ORGANIZATION ✨
app.post('/leads/:id/convert', async (c) => {
    try {
        const db = getDatabase(c.env);
        const user = c.get('user') as ExtendedMochaUser;
        const leadId = c.req.param('id');

        // 1. Get Lead Data
        const lead = await db.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
        if (!lead) return c.json({ error: 'Lead not found' }, 404);
        if (lead.converted_organization_id) return c.json({ error: 'Lead já convertido' }, 400);

        // Get Body for Overrides
        let body: any = {};
        try { body = await c.req.json(); } catch (e) { }

        // 2. Prepare Organization Data
        // Map Lead fields to Organizations fields (Prefer Body, fallback to Lead)
        const orgName = body.name || lead.nome_fantasia || lead.company_name;

        // Insert Organization
        const orgResult = await db.prepare(`
            INSERT INTO organizations(
                name, 
                type, 
                description,
                contact_email, 
                contact_phone, 
                
                -- Address (Composite address string)
                address, 
                
                -- Fiscal / Details
                cnpj, 
                razao_social, 
                nome_fantasia, 
                website,
                
                -- Organization Config
                organization_level,
                parent_organization_id,
                subscription_status,
                subscription_plan,
                max_users,
                max_subsidiaries,
                
                -- Business Details
                cnae_principal, cnae_descricao, natureza_juridica, 
                data_abertura, capital_social, porte_empresa,
                situacao_cadastral, numero_funcionarios, setor_industria,
                faturamento_anual, logo_url,

                is_active,
                created_at,
                updated_at
            ) VALUES(
                ?, ?, ?, ?, ?, ?, 
                ?, ?, ?, ?, 
                ?, ?, 'active', ?, ?, ?, 
                ?, ?, ?, 
                ?, ?, ?, 
                ?, ?, ?, 
                ?, ?, 
                true, NOW(), NOW()
            )
            RETURNING id
        `).bind(
            orgName,
            body.type || 'company',
            body.description || null,
            body.contact_email || lead.email,
            body.contact_phone || lead.phone,

            // Address String (Composite or explicit from Body)
            body.address || [lead.logradouro, lead.numero, lead.bairro, lead.cidade, lead.uf].filter(Boolean).join(', ') || 'Endereço não informado',

            // Fiscal
            body.cnpj || lead.cnpj,
            body.razao_social || lead.razao_social,
            body.nome_fantasia || lead.nome_fantasia,
            body.website || lead.website,

            // Config
            body.organization_level || 'company',
            body.parent_organization_id || null,
            body.subscription_plan || 'basic',
            body.max_users || 50,
            body.max_subsidiaries || 0,

            // Business (New Fields)
            body.cnae_principal || null,
            body.cnae_descricao || null,
            body.natureza_juridica || null,
            body.data_abertura || null,
            body.capital_social || null,
            body.porte_empresa || null,
            body.situacao_cadastral || null,
            body.numero_funcionarios || null,
            body.setor_industria || null,
            body.faturamento_anual || null,
            body.logo_url || null
        ).first();

        const newOrgId = orgResult?.id;

        if (!newOrgId) throw new Error("Failed to create organization");

        // 3. Update Lead Status
        await db.prepare(`
            UPDATE leads 
            SET status = 'won', 
                converted_organization_id = ?,
                updated_at = NOW()
            WHERE id = ?
        `).bind(newOrgId, leadId).run();

        // 4. Log Activity
        await db.prepare(`
            INSERT INTO activity_log(user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
            VALUES(?, ?, 'lead_converted', ?, 'lead', ?, NOW())
        `).bind(
            user.id,
            newOrgId,
            `Lead convertido em organização: ${orgName}`,
            leadId
        ).run();

        return c.json({
            success: true,
            organization_id: newOrgId,
            message: 'Lead convertido com sucesso!'
        });

    } catch (error: any) {
        console.error('Error converting lead:', error);
        return c.json({ error: 'Erro ao converter lead: ' + error.message }, 500);
    }
});


export default app;
