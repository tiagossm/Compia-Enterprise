import { Hono } from "hono";

const commerceRoutes = new Hono();

commerceRoutes.post("/initiate", async (c) => {
    try {
        const body = await c.req.json();

        console.log("[COMMERCE] Initiate Checkout", body);

        // TODO: Validate User, Create in DB, Create Charge in Asaas
        // For now, return success mock

        // Simulate processing delay
        // await new Promise(resolve => setTimeout(resolve, 1500));

        // If PIX, we would return the QR Code
        // If Credit Card, we return the Asaas Billing URL

        return c.json({
            status: "success",
            message: "Checkout initiated",
            // For now, redirect to a test payment URL or Asaas Sandbox
            payment_url: "https://sandbox.asaas.com/payment/..."
        });

    } catch (e: any) {
        return c.json({ error: e.message }, 400);
    }
});

export default commerceRoutes;
