import { Hono } from "hono";
import { tenantAuthMiddleware } from "./tenant-auth-middleware.ts";
import { ExtendedMochaUser, USER_ROLES } from "./user-types.ts";

type Env = {
    DB: any;
};

const getDatabase = (env: any) => env.DB;

/**
 * Chronos Lei 2: Verificação de conflito de agendamento e Lei 5: Respeito a Horários/Feriados
 * Retorna eventos que conflitam com o período solicitado ou violações de regras
 */
async function checkConflict(
    db: any,
    orgId: string,
    startTime: string,
    endTime: string,
    participantEmail?: string,
    excludeEventId?: string | number
): Promise<{ hasConflict: boolean; conflictingEvents: any[]; violationType?: 'overlap' | 'business_hours' | 'holiday' }> {
    try {
        // 1. Verificar Configurações da Agenda (Feriados e Horário Comercial)
        try {
            // Tentar buscar configurações (pode não existir se a tabela ainda não foi criada/populada)
            const settings = await db.prepare("SELECT * FROM calendar_settings WHERE organization_id = ?").bind(orgId).first() as any;

            if (settings) {
                const holidays = JSON.parse(settings.holidays || '[]');
                const businessHours = JSON.parse(settings.business_hours || '{}');
                const timezone = settings.timezone || 'UTC';

                const start = new Date(startTime);
                const end = new Date(endTime);

                // Verificar Feriados
                const startStr = start.toISOString().split('T')[0];
                const holiday = holidays.find((h: any) => h.date === startStr);

                if (holiday) {
                    return {
                        hasConflict: true,
                        conflictingEvents: [{
                            id: 'holiday',
                            title: `Feriado: ${holiday.name}`,
                            start_time: `${startStr}T00:00:00Z`,
                            end_time: `${startStr}T23:59:59Z`,
                            event_type: 'block'
                        }],
                        violationType: 'holiday'
                    };
                }

                // Verificar Horário Comercial (apenas se configurado)
                if (businessHours.start && businessHours.end) {
                    // Converter para minutos para facilitar comparação
                    const getMinutes = (timeStr: string) => {
                        const [h, m] = timeStr.split(':').map(Number);
                        return h * 60 + m;
                    };

                    // Extrair hora do evento (assumindo que start_time está em UTC, precisaria converter para timezone da org,
                    // mas por simplificação aqui vamos extrair UTC hours se timezone for UTC-3 aprox ou usar lib de data se tiver
                    // Como não temos date-fns aqui, vamos fazer uma verificação simples:
                    // Se o evento começa antes de businessHours.start ou termina depois de businessHours.end (em UTC ajustado)

                    // TODO: Melhorar suporte a timezone real no backend. Por enquanto, focado em conflitos de OVERLAP.
                }
            }
        } catch (e) {
            // Ignorar erro se tabela não existir
            console.warn('[Chronos] Calendar settings check skipped:', e);
        }

        // 2. Verificar conflitos em calendar_events
        let query = `
            SELECT id, title, start_time, end_time, event_type
            FROM calendar_events
            WHERE organization_id = ?
              AND start_time < ?
              AND end_time > ?
        `;
        const params: any[] = [orgId, endTime, startTime];

        // Excluir o próprio evento (para edições)
        if (excludeEventId && !String(excludeEventId).startsWith('inspection-')) {
            query += ` AND id != ?`;
            params.push(excludeEventId);
        }

        // Filtrar por participante se fornecido
        if (participantEmail) {
            query += ` AND (participants::text LIKE ? OR created_by IN (SELECT id FROM users WHERE email = ?))`;
            params.push(`%"${participantEmail}"%`, participantEmail);
        }

        query += ` LIMIT 5`;

        const calendarConflicts = await db.prepare(query).bind(...params).all();
        const conflicts = calendarConflicts.results || [];

        // Verificar conflitos em inspections também
        if (participantEmail) {
            let inspectionQuery = `
                SELECT id, title as project_name, scheduled_date, status
                FROM inspections
                WHERE organization_id = ?
                  AND inspector_email = ?
                  AND scheduled_date IS NOT NULL
                  AND scheduled_date >= ?
                  AND scheduled_date < ?
                  AND status NOT IN ('cancelled', 'completed')
            `;
            const inspParams: any[] = [orgId, participantEmail, startTime, endTime];

            // Excluir própria inspeção
            if (excludeEventId && String(excludeEventId).startsWith('inspection-')) {
                const realId = String(excludeEventId).replace('inspection-', '');
                inspectionQuery += ` AND id != ?`;
                inspParams.push(realId);
            }

            inspectionQuery += ` LIMIT 5`;

            const inspectionConflicts = await db.prepare(inspectionQuery).bind(...inspParams).all();
            if (inspectionConflicts.results) {
                conflicts.push(...inspectionConflicts.results.map((i: any) => ({
                    id: `inspection-${i.id}`,
                    title: i.project_name?.startsWith('Inspeção:') ? i.project_name : `Inspeção: ${i.project_name}`,
                    start_time: i.scheduled_date,
                    end_time: new Date(new Date(i.scheduled_date).getTime() + 60 * 60 * 1000).toISOString(),
                    event_type: 'inspection'
                })));
            }
        }

        return {
            hasConflict: conflicts.length > 0,
            conflictingEvents: conflicts
        };
    } catch (error) {
        console.error('[Chronos] Error checking conflict:', error);
        // Em caso de erro, não bloquear - apenas logar
        return { hasConflict: false, conflictingEvents: [] };
    }
}

const app = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// ROTA TEMPORÁRIA PARA TESTE DE PERFORMANCE (seed)
app.get('/seed-test', tenantAuthMiddleware, async (c) => {
    const user = c.get('user') as ExtendedMochaUser;
    const db = getDatabase(c.env);

    const userProfile = await db.prepare("SELECT organization_id, managed_organization_id, email FROM users WHERE id = ?").bind(user.id).first() as any;
    if (!userProfile) return c.json({ error: "User not found" }, 404);

    const orgId = userProfile.managed_organization_id || userProfile.organization_id;
    const email = userProfile.email;

    // Inserir 50 eventos
    const statements = [];
    const baseDate = new Date(); // Hoje

    for (let i = 0; i < 50; i++) {
        const dayOffset = Math.floor(i / 5); // 5 eventos por dia
        const hourOffset = (i % 5) + 8; // Começa as 8h

        const startTime = new Date(baseDate);
        startTime.setDate(baseDate.getDate() + dayOffset);
        startTime.setHours(hourOffset, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(hourOffset + 1, 0, 0, 0);

        statements.push(db.prepare(`
            INSERT INTO calendar_events (
                organization_id, title, description, start_time, end_time, 
                event_type, created_by, participants, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
            orgId,
            `Teste Performance ${i + 1}`,
            `Evento gerado automaticamente para teste de carga #${i + 1}`,
            startTime.toISOString(),
            endTime.toISOString(),
            i % 2 === 0 ? 'meeting' : 'focus',
            user.id,
            JSON.stringify([email])
        ));
    }

    await db.batch(statements);
    return c.json({ message: "50 eventos criados com sucesso", orgId });
});

// List events (Integrated with Inspections and Action Plans)
app.get('/', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);

        const startDate = c.req.query('start_date');
        const endDate = c.req.query('end_date');

        // Get user profile to know which organization to fetch for
        const userProfile = await db.prepare("SELECT organization_id, managed_organization_id, role, email FROM users WHERE id = ?").bind(user.id).first() as any;

        if (!userProfile) {
            return c.json({ error: "User profile not found" }, 404);
        }

        const orgId = userProfile.managed_organization_id || userProfile.organization_id;
        // User email for participation check
        const userEmail = userProfile.email || user.email;

        if (!orgId) {
            return c.json({ error: "User is not associated with any organization" }, 400);
        }

        const events = [];

        // 1. Fetch Calendar Events (Rich Manual Events)
        try {
            // Check for Org OR Participation
            // Note: participants is stored as stringified JSON array in TEXT column usually
            // We use LIKE for partial match as simple workaround. proper JSONB would be better.
            let query = `
          SELECT * FROM calendar_events 
          WHERE (organization_id = ? OR participants::text LIKE ?)
        `;
            const params: any[] = [orgId, `%"${userEmail}"%`];

            if (startDate) {
                query += ` AND end_time >= ?`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND start_time <= ?`;
                params.push(endDate);
            }

            const calendarEvents = await db.prepare(query).bind(...params).all();

            if (calendarEvents.results) {
                events.push(...calendarEvents.results.map((e: any) => ({
                    ...e,
                    source: 'calendar',
                    readonly: e.organization_id !== orgId, // Readonly if not my org (simplified)
                    participants: typeof e.participants === 'string' ? JSON.parse(e.participants) : (e.participants || []),
                    accepted_by: typeof e.accepted_by === 'string' ? JSON.parse(e.accepted_by) : (e.accepted_by || []),
                    declined_by: typeof e.declined_by === 'string' ? JSON.parse(e.declined_by) : (e.declined_by || []),
                    scope_items: typeof e.scope_items === 'string' ? JSON.parse(e.scope_items) : (e.scope_items || []),
                    attachments: typeof e.attachments === 'string' ? JSON.parse(e.attachments) : (e.attachments || []),
                    // Preserve new fields
                    location: e.location,
                    meeting_link: e.meeting_link,
                    google_event_id: e.google_event_id,
                    notification_body: e.notification_body
                })));
            }
        } catch (e: any) {
            console.error('[CALENDAR_DEBUG] Error fetching calendar_events:', e);
            throw new Error(`Failed to fetch calendar_events: ${e.message}`);
        }

        // 2. Fetch Inspections (System)
        try {
            // Fetch Org Inspections OR Assigned Inspections
            let inspectionQuery = `
                SELECT id, title as project_name, scheduled_date, status, 'Inspeção Prática' as inspection_type, 
                       company_name, client_id, address, location, organization_id, inspector_email, accepted_by, declined_by,
                       cep, logradouro, numero, complemento, bairro, cidade, uf
                FROM inspections
                WHERE (organization_id = ? OR inspector_email = ?) 
                AND scheduled_date IS NOT NULL
            `;
            const inspectionParams: any[] = [orgId, userEmail];

            if (startDate) {
                inspectionQuery += ` AND scheduled_date >= ?`;
                inspectionParams.push(startDate);
            }
            if (endDate) {
                inspectionQuery += ` AND scheduled_date <= ?`;
                inspectionParams.push(endDate);
            }

            const inspections = await db.prepare(inspectionQuery).bind(...inspectionParams).all();
            if (inspections.results) {
                events.push(...inspections.results.map((i: any) => ({
                    id: `inspection-${i.id}`, // Virtual ID
                    original_id: i.id,
                    title: i.project_name?.startsWith('Inspeção:') ? i.project_name : `Inspeção: ${i.project_name}`,
                    description: `Status: ${i.status}`,
                    start_time: i.scheduled_date,
                    end_time: new Date(new Date(i.scheduled_date).getTime() + 60 * 60 * 1000).toISOString(), // Assume 1h
                    event_type: 'inspection',
                    source: 'inspection',
                    readonly: i.organization_id !== orgId, // Readonly if not my org
                    status: i.status === 'completed' ? 'completed' : 'scheduled',
                    company_name: i.company_name,
                    client_id: i.client_id,
                    location: i.location || i.address,
                    // Granular Address Mapping for EventModal
                    cep: i.cep,
                    logradouro: i.logradouro,
                    numero: i.numero,
                    complemento: i.complemento,
                    bairro: i.bairro,
                    cidade: i.cidade,
                    uf: i.uf,
                    participants: i.inspector_email ? [i.inspector_email] : [],
                    accepted_by: typeof i.accepted_by === 'string' ? JSON.parse(i.accepted_by) : (i.accepted_by || []),
                    declined_by: typeof i.declined_by === 'string' ? JSON.parse(i.declined_by) : (i.declined_by || [])
                })));
            }
        } catch (e: any) {
            console.error('[CALENDAR_DEBUG] Error fetching inspections:', e);
            throw new Error(`Failed to fetch inspections: ${e.message}`);
        }

        // 3. Fetch Action Plans (System)
        try {
            let actionPlanQuery = `
                SELECT id, description, due_date, status, priority
                FROM action_plans
                WHERE organization_id = ? AND due_date IS NOT NULL
            `;
            const actionParams: any[] = [orgId];

            if (startDate) {
                actionPlanQuery += ` AND due_date >= ?`;
                actionParams.push(startDate);
            }
            if (endDate) {
                actionPlanQuery += ` AND due_date <= ?`;
                actionParams.push(endDate);
            }

            const actionPlans = await db.prepare(actionPlanQuery).bind(...actionParams).all();
            if (actionPlans.results) {
                events.push(...actionPlans.results.map((a: any) => ({
                    id: `action-${a.id}`, // Virtual ID
                    original_id: a.id,
                    title: `Plano de Ação: ${a.description.substring(0, 30)}...`,
                    description: `Prioridade: ${a.priority}. Status: ${a.status}`,
                    start_time: a.due_date,
                    end_time: a.due_date, // Deadline is a point in time
                    event_type: 'blocking', // Blocking/Deadline type
                    source: 'action_plan',
                    readonly: true,
                    status: a.status === 'completed' ? 'completed' : 'scheduled'
                })));
            }
        } catch (e: any) {
            console.error('[CALENDAR_DEBUG] Error fetching action_plans:', e);
            // If action_plans doesn't exist, ignore it for now to not block calendar
            // throw new Error(`Failed to fetch action_plans: ${e.message}`);
        }

        // Sort by start_time
        events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        return c.json(events);

    } catch (error) {
        console.error('Error fetching calendar events FULL:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
            console.error('Message:', error.message);
        }
        return c.json({ error: 'Erro ao buscar eventos do calendário', details: String(error) }, 500);
    }
});

// Create event (Rich + Integration Hooks + Inspection Automation)
app.post('/', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);
        const body = await c.req.json();

        const {
            title,
            description,
            start_time,
            end_time,
            event_type,
            metadata,
            // New Rich Fields
            participants,
            scope_items,
            attachments,
            location,
            meeting_link,
            notification_body,
            // Integration Flags
            create_meet,
            notify_email,
            // Inspection Specifics
            template_id,
            company_name, // or client_id
            client_id
        } = body;

        // Validation
        if (!title || !start_time || !end_time || !event_type) {
            return c.json({ error: "Campos obrigatórios: title, start_time, end_time, event_type" }, 400);
        }

        // Get user profile
        const userProfile = await db.prepare("SELECT organization_id, managed_organization_id, role, name, email FROM users WHERE id = ?").bind(user.id).first() as any;

        if (!userProfile) {
            return c.json({ error: "User profile not found" }, 404);
        }

        const orgId = userProfile.managed_organization_id || userProfile.organization_id;

        if (!orgId) {
            return c.json({ error: "User is not associated with any organization" }, 400);
        }

        // --- CHRONOS LEI 2: Verificação de conflito ---
        // Determinar o email do participante principal para verificação
        const primaryParticipant = participants && participants.length > 0
            ? (typeof participants[0] === 'string' ? participants[0] : participants[0].email)
            : userProfile.email;

        // Verificar se força a criação mesmo com conflito
        const forceCreate = body.force_conflict === true;

        if (!forceCreate) {
            const conflictCheck = await checkConflict(
                db,
                orgId,
                start_time,
                end_time,
                primaryParticipant
            );

            if (conflictCheck.hasConflict) {
                return c.json({
                    error: "Conflito de horário detectado",
                    conflict: true,
                    conflicting_events: conflictCheck.conflictingEvents,
                    message: "Já existe um evento neste horário. Envie force_conflict=true para criar mesmo assim."
                }, 409);
            }
        }

        // --- INSPECTION CREATION LOGIC ---
        if (event_type === 'inspection') {
            console.log('[Calendar] Creating Inspection explicitly:', title);

            // Extract primary inspector from participants or use current user
            let inspectorName = userProfile.name;
            let inspectorEmail = userProfile.email;

            if (participants && participants.length > 0) {
                const first = participants[0];
                if (typeof first === 'string') {
                    // It's an email string
                    inspectorEmail = first;
                    // Try to find name if possible, otherwise use email as name or keep default? 
                    // Ideally we should lookup the user, but for now let's use the email prefix or keep generic if we can't find it.
                    // Actually, if we are assigning someone else, we might not have their name readily available in the body.
                    // Let's rely on the email.
                    inspectorName = first.split('@')[0];
                } else if (first.email) {
                    inspectorEmail = first.email;
                    inspectorName = first.name || first.email.split('@')[0];
                }
            }

            const inspectionQuery = `
                INSERT INTO inspections (
                    organization_id, created_by, title, scheduled_date, 
                    status, 
                    participants, location, company_name, client_id, template_id,
                    inspector_name, inspector_email,
                    description,
                    cep, logradouro, numero, complemento, bairro, cidade, uf
                ) VALUES (
                    ?, ?, ?, ?, 
                    'scheduled',
                    ?, ?, ?, ?, ?,
                    ?, ?,
                    ?,
                    ?, ?, ?, ?, ?, ?, ?
                ) RETURNING *
            `;

            // Use template_id if provided, otherwise null (Deferred Configuration)
            const resolvedTemplateId = template_id || null;

            // Extract detailed address fields from body
            const { cep, logradouro, numero, complemento, bairro, cidade, uf } = body;

            const inspectionResult = await db.prepare(inspectionQuery).bind(
                orgId, user.id, title, start_time,
                JSON.stringify(participants || []), location || '', company_name || '', client_id || null, resolvedTemplateId,
                inspectorName, inspectorEmail,
                description ? `${description} (Agendado por: ${userProfile.name})` : `Agendado via Agenda por: ${userProfile.name}`,
                cep || null, logradouro || null, numero || null, complemento || null, bairro || null, cidade || null, uf || null
            ).first();

            // Log Activity
            await db.prepare(`
                INSERT INTO activity_log(user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
                VALUES(?, ?, ?, ?, ?, ?, NOW())
            `).bind(
                user.id, orgId, 'inspection_scheduled',
                `Agendou inspeção: ${title}`, 'inspection', inspectionResult.id.toString()
            ).run();

            // Create initial history record
            await db.prepare(`
                INSERT INTO inspection_status_history (inspection_id, status_from, status_to, changed_by, created_at)
                VALUES (?, NULL, 'scheduled', ?, NOW())
            `).bind(inspectionResult.id, user.id).run();

            return c.json({ ...inspectionResult, id: `inspection-${inspectionResult.id}`, original_id: inspectionResult.id, source: 'inspection', integration_status: 'created_inspection' });
        }

        // --- STANDARD CALENDAR EVENT ---

        // Integration Logic Placeholder (Google Meet, etc)
        // For V1, we just save the request.

        // Insert
        const query = `
            INSERT INTO calendar_events (
                organization_id, created_by, title, description, 
                start_time, end_time, event_type, metadata,
                participants, scope_items, attachments, 
                location, meeting_link, notification_body,
                company_name, client_id
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?
            ) RETURNING *
        `;

        const result = await db.prepare(query).bind(
            orgId, user.id, title, description || null,
            start_time, end_time, event_type, JSON.stringify(metadata || {}),
            JSON.stringify(participants || []),
            JSON.stringify(scope_items || []),
            JSON.stringify(attachments || []),
            location || null,
            meeting_link || null,
            notification_body || null,
            company_name || null,
            client_id || null
        ).first();

        // Log Activity
        await db.prepare(`
        INSERT INTO activity_log(user_id, organization_id, action_type, action_description, target_type, target_id, created_at)
        VALUES(?, ?, ?, ?, ?, ?, NOW())
    `).bind(
            user.id, orgId, 'event_created',
            `Criou evento: ${title}`, 'calendar_event', result.id.toString()
        ).run();

        return c.json({ ...result, integration_status: 'ok' });

    } catch (error) {
        console.error('Error creating calendar event:', error);
        return c.json({ error: 'Erro ao criar evento' }, 500);
    }
});

// Update event
app.put('/:id', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);
        const eventId = c.req.param('id');
        const body = await c.req.json();

        // Get user profile first as we need orgId for both branches
        const userProfile = await db.prepare("SELECT organization_id, managed_organization_id, role FROM users WHERE id = ?").bind(user.id).first() as any;
        if (!userProfile) return c.json({ error: "User profile not found" }, 404);

        const orgId = userProfile.managed_organization_id || userProfile.organization_id;

        // --- CHRONOS LEI 2: Verificação de conflito na edição ---
        const { start_time, end_time, participants, force_conflict } = body;

        if (start_time && end_time && !force_conflict) {
            const primaryParticipant = participants && participants.length > 0
                ? (typeof participants[0] === 'string' ? participants[0] : participants[0].email)
                : userProfile.email;

            const conflictCheck = await checkConflict(
                db,
                orgId,
                start_time,
                end_time,
                primaryParticipant,
                eventId // Excluir o próprio evento
            );

            if (conflictCheck.hasConflict) {
                return c.json({
                    error: "Conflito de horário detectado",
                    conflict: true,
                    conflicting_events: conflictCheck.conflictingEvents,
                    message: "Já existe um evento neste horário. Envie force_conflict=true para atualizar mesmo assim."
                }, 409);
            }
        }

        // Check if it's a virtual inspection ID
        if (eventId.startsWith('inspection-')) {
            const realId = eventId.replace('inspection-', '');

            // Map fields back to inspection columns
            const { title, start_time, company_name, client_id, description, location, participants, cep, logradouro, numero, bairro, cidade, uf, complemento } = body;

            const updates = [];
            const values = [];

            if (title) { updates.push('title = ?'); values.push(title); }
            if (start_time) { updates.push('scheduled_date = ?'); values.push(start_time); }
            if (company_name) { updates.push('company_name = ?'); values.push(company_name); }
            if (client_id) { updates.push('client_id = ?'); values.push(client_id); }
            if (description !== undefined) { updates.push('description = ?'); values.push(description); }
            if (location !== undefined) { updates.push('address = ?'); values.push(location); }

            // Detailed address fields
            if (cep !== undefined) { updates.push('cep = ?'); values.push(cep); }
            if (logradouro !== undefined) { updates.push('logradouro = ?'); values.push(logradouro); }
            if (numero !== undefined) { updates.push('numero = ?'); values.push(numero); }
            if (bairro !== undefined) { updates.push('bairro = ?'); values.push(bairro); }
            if (cidade !== undefined) { updates.push('cidade = ?'); values.push(cidade); }
            if (uf !== undefined) { updates.push('uf = ?'); values.push(uf); }
            if (complemento !== undefined) { updates.push('complemento = ?'); values.push(complemento); }

            // Handle participants and inspector_email for inspections
            if (participants) {
                updates.push('participants = ?');
                values.push(JSON.stringify(participants));

                // Also update inspector_email if participants list is not empty
                if (participants.length > 0) {
                    // Participant is usually just an email string in this context based on frontend
                    const firstParticipant = participants[0];
                    // If it's an object use email property, otherwise use string
                    const email = typeof firstParticipant === 'string' ? firstParticipant : firstParticipant.email;
                    if (email) {
                        updates.push('inspector_email = ?');
                        values.push(email);
                    }
                }
            }

            if (updates.length > 0) {
                updates.push("updated_at = NOW()");
                const query = `
                    UPDATE inspections 
                    SET ${updates.join(', ')} 
                    WHERE id = ? AND organization_id = ?
                    RETURNING *
                 `;
                // Add realId and orgId to values
                const result = await db.prepare(query).bind(...values, realId, orgId).first();

                if (!result) return c.json({ error: "Inspeção não encontrada" }, 404);

                return c.json({
                    ...result,
                    id: `inspection-${result.id}`,
                    start_time: result.scheduled_date,
                    end_time: result.scheduled_date, // End time is same as start for inspections unless we add duration
                    event_type: 'inspection',
                    source: 'inspection',
                    location: result.address
                });
            }
            return c.json({ message: "Nada para atualizar" });
        }

        // Standard Calendar Event Update

        // Allowed fields to update
        const allowedFields = [
            'title', 'description', 'start_time', 'end_time', 'event_type', 'status', 'metadata',
            'participants', 'scope_items', 'attachments', 'location', 'meeting_link', 'notification_body',
            'company_name', 'client_id'
        ];
        const updates = [];
        const values = [];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates.push(`${field} = ?`);
                if (['metadata', 'participants', 'scope_items', 'attachments'].includes(field)) {
                    values.push(JSON.stringify(body[field]));
                } else {
                    values.push(body[field]);
                }
            }
        }

        if (updates.length === 0) {
            return c.json({ message: "Nada para atualizar" }, 200);
        }

        updates.push("updated_at = NOW()");

        const query = `
            UPDATE calendar_events 
            SET ${updates.join(', ')} 
            WHERE id = ? AND organization_id = ?
            RETURNING *
        `;

        const result = await db.prepare(query).bind(...values, eventId, orgId).first();

        if (!result) {
            return c.json({ error: "Evento não encontrado ou permissão negada" }, 404);
        }

        return c.json(result);

    } catch (error) {
        console.error('Error updating calendar event:', error);
        return c.json({ error: 'Erro ao atualizar evento' }, 500);
    }
});

// Delete event
app.delete('/:id', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);
        const eventId = c.req.param('id');

        const userProfile = await db.prepare("SELECT organization_id, managed_organization_id, role FROM users WHERE id = ?").bind(user.id).first() as any;
        const orgId = userProfile.managed_organization_id || userProfile.organization_id;

        // Check for inspection ID
        if (eventId.startsWith('inspection-')) {
            const realId = eventId.replace('inspection-', '');
            const result = await db.prepare(`
                DELETE FROM inspections
                WHERE id = ? AND organization_id = ?
                RETURNING id
            `).bind(realId, orgId).first();

            if (!result) return c.json({ error: "Inspeção não encontrada" }, 404);
            return c.json({ message: "Inspeção excluída" });
        }

        const result = await db.prepare(`
            DELETE FROM calendar_events 
            WHERE id = ? AND organization_id = ?
            RETURNING id
        `).bind(eventId, orgId).first();

        if (!result) {
            return c.json({ error: "Evento não encontrado ou permissão negada" }, 404);
        }

        return c.json({ message: "Evento excluído com sucesso" });

    } catch (error) {
        console.error('Error deleting calendar event:', error);
        return c.json({ error: 'Erro ao excluir evento' }, 500);
    }
});

// Debug route to diagnose 500 errors
app.get('/debug', async (c) => {
    try {
        const db = getDatabase(c.env);
        let orgId = c.req.query('org_id');

        // If no orgId provided, try to find the first one
        if (!orgId) {
            const firstOrg = await db.prepare("SELECT id FROM organizations LIMIT 1").first();
            if (firstOrg) {
                orgId = firstOrg.id;
            }
        }

        if (!orgId) return c.json({ error: 'No Org ID found and no organization in DB' });

        const report: any = { orgId, checks: {} };

        // Check 1: Calendar Events
        try {
            await db.prepare("SELECT * FROM calendar_events WHERE organization_id = ? LIMIT 1").bind(orgId).all();
            report.checks.calendar_events = 'OK';
        } catch (e: any) {
            report.checks.calendar_events = `FAILED: ${e.message}`;
        }

        // Check 2: Inspections (Corrected Schema)
        try {
            await db.prepare("SELECT id, title, scheduled_date, status FROM inspections WHERE organization_id = ? LIMIT 1").bind(orgId).all();
            report.checks.inspections = 'OK';
        } catch (e: any) {
            report.checks.inspections = `FAILED: ${e.message}`;
        }

        // Check 3: Action Plans
        try {
            await db.prepare("SELECT id, description, due_date, status, priority FROM action_plans WHERE organization_id = ? LIMIT 1").bind(orgId).all();
            report.checks.action_plans = 'OK';
        } catch (e: any) {
            report.checks.action_plans = `FAILED: ${e.message}`;
        }

        return c.json(report);

    } catch (error: any) {
        return c.json({ error: error.message, stack: error.stack });
    }
});

// RSVP to event
app.post('/:id/respond', tenantAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as ExtendedMochaUser;
        const db = getDatabase(c.env);
        const eventId = c.req.param('id');
        const { status } = await c.req.json(); // 'accepted' | 'declined'

        if (!['accepted', 'declined'].includes(status)) {
            return c.json({ error: 'Status inválido' }, 400);
        }

        const userProfile = await db.prepare("SELECT organization_id, managed_organization_id, role, email, name FROM users WHERE id = ?").bind(user.id).first() as any;
        const orgId = userProfile.managed_organization_id || userProfile.organization_id;

        const respondent = {
            id: user.id,
            email: userProfile.email,
            name: userProfile.name,
            responded_at: new Date().toISOString()
        };

        // Helper to update lists
        const updateLists = (currentAccepted: any[], currentDeclined: any[], newStatus: string) => {
            // Remove from both first
            const newAccepted = currentAccepted.filter((u: any) => (typeof u === 'string' ? u : u.email) !== userProfile.email);
            const newDeclined = currentDeclined.filter((u: any) => (typeof u === 'string' ? u : u.email) !== userProfile.email);

            if (newStatus === 'accepted') {
                newAccepted.push(respondent);
            } else {
                newDeclined.push(respondent);
            }
            return { newAccepted, newDeclined };
        };

        // Check for inspection
        if (eventId.startsWith('inspection-')) {
            const realId = eventId.replace('inspection-', '');
            const current = await db.prepare("SELECT accepted_by, declined_by FROM inspections WHERE id = ? AND organization_id = ?").bind(realId, orgId).first();

            if (!current) return c.json({ error: "Inspeção não encontrada" }, 404);

            const curAccepted = typeof current.accepted_by === 'string' ? JSON.parse(current.accepted_by) : (current.accepted_by || []);
            const curDeclined = typeof current.declined_by === 'string' ? JSON.parse(current.declined_by) : (current.declined_by || []);

            const { newAccepted, newDeclined } = updateLists(curAccepted, curDeclined, status);

            await db.prepare(`
                UPDATE inspections 
                SET accepted_by = ?, declined_by = ?, updated_at = NOW()
                WHERE id = ?
            `).bind(JSON.stringify(newAccepted), JSON.stringify(newDeclined), realId).run();

            return c.json({ message: "Resposta registrada" });
        }

        // Standard Event
        const current = await db.prepare("SELECT accepted_by, declined_by FROM calendar_events WHERE id = ? AND organization_id = ?").bind(eventId, orgId).first();

        if (!current) return c.json({ error: "Evento não encontrado" }, 404);

        const curAccepted = typeof current.accepted_by === 'string' ? JSON.parse(current.accepted_by) : (current.accepted_by || []);
        const curDeclined = typeof current.declined_by === 'string' ? JSON.parse(current.declined_by) : (current.declined_by || []);

        const { newAccepted, newDeclined } = updateLists(curAccepted, curDeclined, status);

        await db.prepare(`
            UPDATE calendar_events 
            SET accepted_by = ?, declined_by = ?, updated_at = NOW()
            WHERE id = ?
        `).bind(JSON.stringify(newAccepted), JSON.stringify(newDeclined), eventId).run();

        return c.json({ message: "Resposta registrada" });

    } catch (error) {
        console.error('Error responding to event:', error);
        return c.json({ error: 'Erro ao responder evento' }, 500);
    }
});

export default app;


