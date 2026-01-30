import postgres from 'postgres'

// Cache for single connection per worker
let sqlInstance: ReturnType<typeof postgres> | null = null;

export function createD1Wrapper(connectionString: string) {
    // Use single connection with very aggressive settings for Edge Functions
    // Edge Functions are short-lived, so we minimize connection overhead
    if (!sqlInstance) {
        sqlInstance = postgres(connectionString, {
            max: 3,                    // Up to 3 connections per worker
            idle_timeout: 5,           // Close idle connections quickly
            connect_timeout: 10,       // Fast connection timeout
            max_lifetime: 30,          // Max connection lifetime 30 seconds
            fetch_types: false,        // Disable type fetching for speed
        })
    }
    const sql = sqlInstance;

    return {
        prepare: (query: string) => {
            let paramCount = 0;
            const pgQuery = query.replace(/\?/g, () => `$${++paramCount}`);

            const createExecutionMethods = (params: any[], userId?: string) => ({
                bind: (...newParams: any[]) => createExecutionMethods(newParams, userId),
                withUser: (id: string) => createExecutionMethods(params, id),
                first: async () => {
                    const runQuery = async (trx: any) => {
                        if (userId) {
                            await trx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
                            await trx`SELECT set_config('role', 'authenticated', true)`;
                        }
                        const sanitizedParams = params.map(p => p === undefined ? null : p);
                        const result = await trx.unsafe(pgQuery, sanitizedParams);
                        return result[0] || null;
                    };

                    try {
                        if (userId) {
                            // Using a transaction ensures the config is set for THIS operation only
                            return await sql.begin(runQuery);
                        } else {
                            // No RLS context, run directly (might fail policies!)
                            return await runQuery(sql);
                        }
                    } catch (error) {
                        const errObj = error instanceof Error ?
                            { name: error.name, message: error.message, stack: error.stack } :
                            error;
                        console.error('[D1-WRAPPER] Error in first():', JSON.stringify(errObj), 'Query:', pgQuery.substring(0, 100));
                        throw error;
                    }
                },
                run: async () => {
                    const runQuery = async (trx: any) => {
                        if (userId) {
                            await trx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
                            await trx`SELECT set_config('role', 'authenticated', true)`;
                        }
                        const sanitizedParams = params.map(p => p === undefined ? null : p);
                        const result = await trx.unsafe(pgQuery, sanitizedParams);
                        return { success: true, meta: { changes: result.count, last_row_id: result[0]?.id }, id: result[0]?.id };
                    };

                    try {
                        if (userId) {
                            return await sql.begin(runQuery);
                        } else {
                            return await runQuery(sql);
                        }
                    } catch (error) {
                        const errObj = error instanceof Error ?
                            { name: error.name, message: error.message, stack: error.stack } :
                            error;
                        console.error('[D1-WRAPPER] Error in run():', JSON.stringify(errObj), 'Query:', pgQuery.substring(0, 100));
                        throw error;
                    }
                },
                all: async () => {
                    const runQuery = async (trx: any) => {
                        if (userId) {
                            await trx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
                            await trx`SELECT set_config('role', 'authenticated', true)`;
                        }
                        const sanitizedParams = params.map(p => p === undefined ? null : p);
                        const result = await trx.unsafe(pgQuery, sanitizedParams);
                        return { results: result };
                    };

                    try {
                        if (userId) {
                            return await sql.begin(runQuery);
                        } else {
                            return await runQuery(sql);
                        }
                    } catch (error) {
                        const errObj = error instanceof Error ?
                            { name: error.name, message: error.message, stack: error.stack } :
                            error;
                        console.error('[D1-WRAPPER] Error in all():', JSON.stringify(errObj), 'Query:', pgQuery.substring(0, 100));
                        throw error;
                    }
                },
                raw: async () => {
                    const runQuery = async (trx: any) => {
                        if (userId) {
                            await trx`SELECT set_config('request.jwt.claim.sub', ${userId}, true)`;
                            await trx`SELECT set_config('role', 'authenticated', true)`;
                        }
                        const sanitizedParams = params.map(p => p === undefined ? null : p);
                        // raw returns array directly
                        return await trx.unsafe(pgQuery, sanitizedParams);
                    };

                    try {
                        if (userId) {
                            return await sql.begin(runQuery);
                        } else {
                            return await runQuery(sql);
                        }
                    } catch (error) {
                        const errObj = error instanceof Error ?
                            { name: error.name, message: error.message, stack: error.stack } :
                            error;
                        console.error('[D1-WRAPPER] Error in raw():', JSON.stringify(errObj), 'Query:', pgQuery.substring(0, 100));
                        throw error;
                    }
                }
            });

            return createExecutionMethods([]);
        }
    }
}

