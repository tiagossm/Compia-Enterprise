
import { Hono } from "hono";

type Env = {
    DB: any;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.json({ message: 'Test connection successful' }));
app.get('/:id', (c) => c.json({ message: `Test ID: ${c.req.param('id')}` }));

// Debug endpoint to check organization address data
app.get('/debug/addresses', async (c) => {
    try {
        const result = await c.env.DB.prepare(`
      SELECT id, name, nome_fantasia, address, contact_email 
      FROM organizations 
      LIMIT 10
    `).all();

        return c.json({
            success: true,
            organizations: result.results || [],
            message: 'Debug: Check if address column has data'
        });
    } catch (error) {
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : String(error)
        }, 500);
    }
});

export default app;
