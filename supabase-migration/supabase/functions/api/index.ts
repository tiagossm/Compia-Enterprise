import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const authHeader = req.headers.get("Authorization")
    if (authHeader) {
      supabaseClient.auth.setSession({
        access_token: authHeader.replace("Bearer ", ""),
        refresh_token: "",
      })
    }
    // Health check endpoint (no auth required)
    if (url.pathname === "/health" && req.method === "GET") {
      return new Response(JSON.stringify({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "COMPIA API v2.0",
        database: "connected"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }


    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    // Route: GET /users/me
    if (path === "/users/me" && method === "GET") {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "User not authenticated" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const { data: userProfile } = await supabaseClient
        .from("users")
        .select("*, organizations(*)")
        .eq("id", user.id)
        .single()

      return new Response(
        JSON.stringify({ user: { ...user, profile: userProfile } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Route: GET /inspections
    if (path === "/inspections" && method === "GET") {
      const { data: inspections } = await supabaseClient
        .from("inspections")
        .select("*, users!inspections_created_by_fkey(name), organizations(name)")
        .order("created_at", { ascending: false })

      return new Response(
        JSON.stringify({ inspections: inspections || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

