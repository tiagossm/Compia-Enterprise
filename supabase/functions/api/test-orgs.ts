
import { Hono } from "hono";

type Env = {
    DB: any;
};

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => c.json({ message: 'Test connection successful' }));
app.get('/:id', (c) => c.json({ message: `Test ID: ${c.req.param('id')}` }));

// [SEC-008] DEBUG ROUTE REMOVIDA - Gatekeeper 30/01/2026
// Endpoint expunha endereços e emails de todas as organizações sem autenticação

export default app;
