
Deno.serve(async (req) => {
    return new Response(
        JSON.stringify({ message: "Hello from Supabase!" }),
        { headers: { "Content-Type": "application/json" } }
    );
});
