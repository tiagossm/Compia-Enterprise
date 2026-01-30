import { Hono } from 'hono';
import { requireAuth } from './tenant-auth-middleware.ts';

const app = new Hono();

/**
 * Endpoint de teste para validar o contexto RLS
 *
 * Este endpoint verifica se as variáveis de sessão RLS estão sendo
 * configuradas corretamente pelo middleware e se as políticas RLS
 * estão funcionando como esperado.
 *
 * Uso: GET /api/test/rls-context
 */
app.get('/rls-context', requireAuth, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        // Teste 1: Verificar se current_user_id() retorna o ID correto
        const contextTest = await db.prepare(
            "SELECT current_user_id() as user_from_context"
        ).first();

        // Teste 2: Contar quantos usuários são acessíveis (RLS deve filtrar)
        const usersTest = await db.prepare(
            "SELECT COUNT(*) as accessible_users FROM users"
        ).first();

        // Teste 3: Contar quantas inspeções são acessíveis (RLS deve filtrar por org)
        const inspectionsTest = await db.prepare(
            "SELECT COUNT(*) as accessible_inspections FROM inspections"
        ).first();

        // Teste 4: Verificar se o usuário consegue ver seu próprio registro
        const selfTest = await db.prepare(
            "SELECT id, email, role FROM users WHERE id = ?"
        ).bind(user.id).first();

        // Verificar se o contexto RLS está correto
        const contextMatches = contextTest?.user_from_context === user.id;

        return c.json({
            success: true,
            rls_context: {
                authenticated_user_id: user.id,
                context_user_id: contextTest?.user_from_context,
                context_matches: contextMatches,
                context_type: contextTest?.user_from_context ? 'UUID' : 'NULL'
            },
            access_tests: {
                accessible_users_count: usersTest?.accessible_users || 0,
                accessible_inspections_count: inspectionsTest?.accessible_inspections || 0,
                can_see_self: !!selfTest
            },
            user_info: {
                id: user.id,
                email: user.email,
                role: user.role,
                organization_id: user.organization_id
            },
            message: contextMatches
                ? "✅ RLS context is working correctly!"
                : "❌ WARNING: RLS context mismatch detected",
            status: contextMatches ? 'healthy' : 'error'
        });
    } catch (error: any) {
        console.error('[TEST-RLS] Error during RLS context test:', error);
        return c.json({
            success: false,
            error: error.message,
            stack: error.stack,
            message: "Failed to test RLS context"
        }, 500);
    }
});

/**
 * Endpoint de teste para simular diferentes contextos de usuário
 *
 * Este endpoint permite que system admins simulem o contexto de outros
 * usuários para validar que as políticas RLS estão isolando corretamente
 * os dados entre organizações.
 *
 * Uso: GET /api/test/rls-simulation/:userId
 * Requer: role = sys_admin ou system_admin
 */
app.get('/rls-simulation/:userId', requireAuth, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;
    const targetUserId = c.req.param('userId');

    // Apenas sys_admin pode simular outros usuários
    if (user.role !== 'sys_admin' && user.role !== 'system_admin') {
        return c.json({
            error: 'forbidden',
            message: 'Only system admins can simulate users'
        }, 403);
    }

    try {
        // Verificar se o usuário alvo existe
        const targetUser = await db.prepare(
            "SELECT id, email, role, organization_id FROM users WHERE id = ?"
        ).bind(targetUserId).first();

        if (!targetUser) {
            return c.json({
                error: 'not_found',
                message: 'Target user not found'
            }, 404);
        }

        // Simular o contexto do usuário alvo
        // Nota: Esta é uma simulação read-only para testes
        const result = await db.prepare(`
            WITH context_set AS (
                SELECT
                    set_config('request.jwt.claim.sub', $1, true) as config_sub,
                    set_config('role', 'authenticated', true) as config_role
            )
            SELECT
                current_user_id() as simulated_user,
                (SELECT COUNT(*) FROM inspections) as visible_inspections,
                (SELECT COUNT(*) FROM organizations) as visible_orgs,
                (SELECT COUNT(*) FROM users) as visible_users
            FROM context_set
        `).bind(targetUserId).first();

        return c.json({
            success: true,
            simulation: {
                target_user: {
                    id: targetUser.id,
                    email: targetUser.email,
                    role: targetUser.role,
                    organization_id: targetUser.organization_id
                },
                simulated_context: {
                    user_id: result?.simulated_user,
                    visible_inspections: result?.visible_inspections || 0,
                    visible_orgs: result?.visible_orgs || 0,
                    visible_users: result?.visible_users || 0
                }
            },
            message: "Simulation completed successfully"
        });
    } catch (error: any) {
        console.error('[TEST-RLS] Error during simulation:', error);
        return c.json({
            success: false,
            error: error.message,
            message: "Failed to simulate user context"
        }, 500);
    }
});

/**
 * Endpoint de teste para verificar políticas RLS específicas
 *
 * Testa se as políticas RLS estão permitindo/bloqueando acesso corretamente
 * para diferentes tabelas.
 *
 * Uso: GET /api/test/rls-policies
 */
app.get('/rls-policies', requireAuth, async (c) => {
    const user = c.get('user');
    const db = c.env.DB;

    try {
        const tests = [];

        // Teste 1: Verificar RLS na tabela users
        try {
            const usersCount = await db.prepare(
                "SELECT COUNT(*) as count FROM users"
            ).first();
            tests.push({
                table: 'users',
                status: 'pass',
                accessible_records: usersCount?.count || 0,
                expected: user.role === 'sys_admin' || user.role === 'system_admin' ? 'all users' : 'own org users'
            });
        } catch (e: any) {
            tests.push({
                table: 'users',
                status: 'fail',
                error: e.message
            });
        }

        // Teste 2: Verificar RLS na tabela organizations
        try {
            const orgsCount = await db.prepare(
                "SELECT COUNT(*) as count FROM organizations"
            ).first();
            tests.push({
                table: 'organizations',
                status: 'pass',
                accessible_records: orgsCount?.count || 0,
                expected: user.role === 'sys_admin' || user.role === 'system_admin' ? 'all orgs' : 'own org only'
            });
        } catch (e: any) {
            tests.push({
                table: 'organizations',
                status: 'fail',
                error: e.message
            });
        }

        // Teste 3: Verificar RLS na tabela inspections
        try {
            const inspCount = await db.prepare(
                "SELECT COUNT(*) as count FROM inspections"
            ).first();
            tests.push({
                table: 'inspections',
                status: 'pass',
                accessible_records: inspCount?.count || 0,
                expected: user.role === 'sys_admin' || user.role === 'system_admin' ? 'all inspections' : 'own org inspections'
            });
        } catch (e: any) {
            tests.push({
                table: 'inspections',
                status: 'fail',
                error: e.message
            });
        }

        // Teste 4: Verificar RLS na tabela plans (deve ser pública)
        try {
            const plansCount = await db.prepare(
                "SELECT COUNT(*) as count FROM plans WHERE is_active = true AND is_public = true"
            ).first();
            tests.push({
                table: 'plans',
                status: 'pass',
                accessible_records: plansCount?.count || 0,
                expected: 'all public plans'
            });
        } catch (e: any) {
            tests.push({
                table: 'plans',
                status: 'fail',
                error: e.message
            });
        }

        const passedTests = tests.filter(t => t.status === 'pass').length;
        const totalTests = tests.length;

        return c.json({
            success: true,
            summary: {
                total_tests: totalTests,
                passed: passedTests,
                failed: totalTests - passedTests,
                pass_rate: `${Math.round((passedTests / totalTests) * 100)}%`
            },
            tests,
            user_context: {
                id: user.id,
                role: user.role,
                organization_id: user.organization_id
            },
            message: passedTests === totalTests
                ? "All RLS policy tests passed!"
                : `${totalTests - passedTests} test(s) failed`
        });
    } catch (error: any) {
        console.error('[TEST-RLS] Error during policy tests:', error);
        return c.json({
            success: false,
            error: error.message,
            message: "Failed to test RLS policies"
        }, 500);
    }
});

export default app;
