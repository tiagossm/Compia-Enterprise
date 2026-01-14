import { Context } from "hono";
import { TenantContext } from "./tenant-auth-middleware.ts";

/**
 * SECURE QUERY HELPER - Isolamento de Dados Multi-Tenant
 * 
 * Este módulo fornece funções para construir queries SQL seguras
 * que FORÇAM o filtro de organization_id baseado no contexto de tenant.
 * 
 * @security O organization_id é SEMPRE extraído do contexto seguro,
 * NUNCA do body/params da requisição.
 */

export interface SecureQueryOptions {
    table: string;
    columns?: string[];
    conditions?: string[];
    params?: unknown[];
    orderBy?: string;
    limit?: number;
    offset?: number;
}

/**
 * Constrói uma cláusula WHERE segura para isolamento de tenant
 * 
 * @security Esta função garante que:
 * - System Admin: sem filtro de organização (acesso total)
 * - Org Admin: filtra por organização + subsidiárias
 * - Outros: filtra apenas pela própria organização
 */
export function buildTenantWhereClause(
    c: Context,
    tableAlias: string = ""
): { clause: string; params: unknown[] } {
    const tenantContext = c.get("tenantContext") as TenantContext | undefined;
    const prefix = tableAlias ? `${tableAlias}.` : "";

    // Sem contexto de tenant = sem filtro (requisição não autenticada)
    if (!tenantContext) {
        return { clause: "", params: [] };
    }

    // System Admin: acesso total, sem filtro
    if (tenantContext.isSystemAdmin) {
        return { clause: "", params: [] };
    }

    // Org Admin e usuários regulares: filtrar por organizações permitidas
    if (tenantContext.allowedOrganizationIds.length === 0) {
        // Usuário sem organização: não pode ver nada
        return { clause: `${prefix}organization_id = -1`, params: [] };
    }

    if (tenantContext.allowedOrganizationIds.length === 1) {
        return {
            clause: `${prefix}organization_id = ?`,
            params: [tenantContext.allowedOrganizationIds[0]]
        };
    }

    // Múltiplas organizações (Org Admin com subsidiárias)
    const placeholders = tenantContext.allowedOrganizationIds.map(() => "?").join(", ");
    return {
        clause: `${prefix}organization_id IN (${placeholders})`,
        params: tenantContext.allowedOrganizationIds
    };
}

/**
 * Constrói uma query SELECT segura com isolamento de tenant automático
 * 
 * @example
 * const query = buildSecureSelectQuery(c, {
 *   table: 'inspections',
 *   columns: ['id', 'title', 'status'],
 *   conditions: ['status = ?'],
 *   params: ['pendente'],
 *   orderBy: 'created_at DESC'
 * });
 * const results = await env.DB.prepare(query.sql).bind(...query.params).all();
 */
export function buildSecureSelectQuery(
    c: Context,
    options: SecureQueryOptions
): { sql: string; params: unknown[] } {
    const { table, columns = ["*"], conditions = [], params = [], orderBy, limit, offset } = options;

    const tenantWhere = buildTenantWhereClause(c);
    const allConditions = [...conditions];
    const allParams = [...params];

    // Adicionar filtro de tenant se houver
    if (tenantWhere.clause) {
        allConditions.push(tenantWhere.clause);
        allParams.push(...tenantWhere.params);
    }

    let sql = `SELECT ${columns.join(", ")} FROM ${table}`;

    if (allConditions.length > 0) {
        sql += ` WHERE ${allConditions.join(" AND ")}`;
    }

    if (orderBy) {
        sql += ` ORDER BY ${orderBy}`;
    }

    if (limit !== undefined) {
        sql += ` LIMIT ${limit}`;
        if (offset !== undefined) {
            sql += ` OFFSET ${offset}`;
        }
    }

    return { sql, params: allParams };
}

/**
 * Verifica se o usuário pode acessar um registro específico
 * 
 * @security Use esta função antes de retornar dados de um registro único
 * @returns true se o usuário tem acesso, false caso contrário
 */
export function canAccessRecord(
    c: Context,
    recordOrgId: number | null
): boolean {
    const tenantContext = c.get("tenantContext") as TenantContext | undefined;

    if (!tenantContext) return false;
    if (tenantContext.isSystemAdmin) return true;
    if (recordOrgId === null) return false;

    return tenantContext.allowedOrganizationIds.includes(recordOrgId);
}

/**
 * Extrai o organization_id seguro para INSERT
 * 
 * @security CRÍTICO: Esta função NUNCA usa o organization_id do body
 * O ID sempre vem do contexto de tenant (token/banco)
 */
export function getSecureOrgIdForInsert(c: Context): number | null {
    const tenantContext = c.get("tenantContext") as TenantContext | undefined;

    if (!tenantContext) {
        throw new Error("Contexto de tenant não disponível");
    }

    // System Admin pode especificar organização via parâmetro especial
    // (implementação futura com validação adicional)

    // Para usuários regulares, usar a organização do contexto
    return tenantContext.organizationId;
}

/**
 * Valida se o organization_id do body corresponde ao contexto seguro
 * 
 * @security Use para detectar tentativas de injeção de organization_id
 * @returns true se o ID é válido ou não foi fornecido, false se há tentativa de injeção
 */
export function validateOrgIdFromBody(
    c: Context,
    bodyOrgId: number | null | undefined
): { valid: boolean; message?: string } {
    const tenantContext = c.get("tenantContext") as TenantContext | undefined;

    if (!tenantContext) {
        return { valid: false, message: "Contexto de tenant não disponível" };
    }

    // Se não foi fornecido no body, está ok
    if (bodyOrgId === null || bodyOrgId === undefined) {
        return { valid: true };
    }

    // System Admin pode especificar qualquer organização
    if (tenantContext.isSystemAdmin) {
        return { valid: true };
    }

    // Verificar se o ID fornecido está na lista de permitidos
    if (!tenantContext.allowedOrganizationIds.includes(bodyOrgId)) {
        return {
            valid: false,
            message: "Tentativa de acesso a organização não autorizada detectada"
        };
    }

    return { valid: true };
}

/**
 * Registra um log de auditoria para operações em inspeções
 * 
 * @security Obrigatório para conformidade com LGPD
 */
export async function logInspectionChange(
    env: Env,
    inspectionId: number,
    userId: string,
    action: "CREATE" | "UPDATE" | "DELETE" | "FINALIZE",
    fieldChanged?: string,
    oldValue?: unknown,
    newValue?: unknown,
    ipAddress?: string,
    userAgent?: string
): Promise<void> {
    try {
        await env.DB.prepare(`
      INSERT INTO inspection_logs (
        inspection_id, user_id, action, field_changed,
        old_value, new_value, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `).bind(
            inspectionId,
            userId,
            action,
            fieldChanged || null,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null,
            ipAddress || null,
            userAgent || null
        ).run();
    } catch (error) {
        // Log de auditoria não deve bloquear a operação principal
        console.error("[AUDIT-LOG] Erro ao registrar log de inspeção:", error);
    }
}

