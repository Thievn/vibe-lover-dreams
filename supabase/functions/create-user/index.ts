const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Supabase configuration is not available." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();
    const allowRaw = (Deno.env.get("CREATE_USER_ALLOWED_EMAILS") ?? "lustforgeapp@gmail.com,thievnsden@gmail.com,deanoneill69@gmail.com").trim();
    const allowedEmails = new Set(
      allowRaw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowedEmails.has(email)) {
      return new Response(
        JSON.stringify({ error: "This email is not allowed to use the invite create-user endpoint." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const headers = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    const createUserResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        email_confirmed_at: new Date().toISOString(),
      }),
    });

    const createUserData = await createUserResponse.json();
    if (!createUserResponse.ok) {
      const duplicateUser =
        createUserResponse.status === 409 ||
        String(createUserData?.msg || createUserData?.message || createUserData?.error_description || "").toLowerCase().includes("already");

      if (!duplicateUser) {
        return new Response(JSON.stringify({ error: createUserData?.msg || createUserData?.message || JSON.stringify(createUserData) }), {
          status: createUserResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const existingUsersResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "GET",
        headers,
      });
      const existingUsers = await existingUsersResponse.json();
      const existingUser = Array.isArray(existingUsers)
        ? existingUsers.find((user: any) => user.email?.toLowerCase() === email.toLowerCase())
        : null;

      if (!existingUser) {
        return new Response(JSON.stringify({ error: "User already exists, but could not be found." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updatePassword = async () => {
        const payload = JSON.stringify({
          id: existingUser.id,
          password,
          email_confirm: true,
          email_confirmed_at: new Date().toISOString(),
        });

        let response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          method: "PATCH",
          headers,
          body: payload,
        });

        if (!response.ok) {
          response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existingUser.id}`, {
            method: "PATCH",
            headers,
            body: payload,
          });
        }

        return response;
      };

      const passwordResponse = await updatePassword();
      const passwordResult = await passwordResponse.json();
      if (!passwordResponse.ok) {
        return new Response(JSON.stringify({ error: passwordResult?.msg || passwordResult?.message || JSON.stringify(passwordResult) }), {
          status: passwordResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ user: existingUser, passwordUpdated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ user: createUserData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-user function error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unable to create user." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
