import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zqaslhehioqdfjuvhoxw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔧 Vytváram tabuľku profiles cez service_role key...\n");

  // Step 1: Check if table exists
  const { data: existingProfiles, error: checkError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (!checkError) {
    console.log("✅ Tabuľka 'profiles' už existuje!");
    const { data: count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    console.log(`   Počet záznamov: ${count?.length ?? 0}`);
    return;
  }

  console.log("⚠️  Tabuľka neexistuje, vytváram...\n");

  // Step 2: Use the Supabase Management API with a PAT token workaround
  // The service_role key CAN work with the Management API when using proper headers
  // Actually, for the Management API we need a different approach

  // Method: Use the service_role key to call the internal Supabase PostgreSQL API
  // via the REST endpoint with the Content-Type: application/sql

  console.log("📡 Pokus 1: POST /rest/v1/ (Content-Type: application/sql)...");
  try {
    // We'll use a simple INSERT to the auth schema to trigger cache refresh
    const createSQL = `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        public_slug TEXT UNIQUE,
        plan_type TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    // If we get a 404, the table truly doesn't exist
    if (res.status === 404) {
      console.log("   (tabuľka neexistuje, čo je očakávané)");
    } else {
      const txt = await res.text();
      console.log(`   Status: ${res.status}, Odpoveď: ${txt.substring(0, 100)}`);
    }
  } catch (e) {
    console.log("   Chyba:", e.message);
  }

  // Step 3: Use Python to create the table
  console.log("\n📡 Pokus 2: Skúšam vytvoriť tabuľku cez supabase-js admin funkciu...");
  try {
    // The service_role key gives us admin access to the database
    // We can use the 'admin' functions or direct REST calls with the service_role
    
    // Let's try to use the rpc() method to call a database function
    // First, check if we can list users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.log("   Auth admin error:", usersError.message);
    } else {
      console.log(`   ✅ Auth pripojený! ${users.users.length} používateľov`);
    }

    // Try a different approach: use the REST API to create the table
    // via the pg_api extension which is available on Supabase
    // The endpoint is: POST /rest/v1/rpc/pg_api_create_table
    
    // Actually, with service_role we can access the auth schema directly
    // and create the table using raw SQL via the pg_dump endpoint
    
    // The trick: use the "Prefer: params=single-object" header with a POST to the rest API
    // This tells Supabase to treat the POST body as a SQL query
    console.log("   Skúšam POST cez service_role s Prefer header...");
    
    // We'll use the rest API to get schema info first
    const schemaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=neq.00000000-0000-0000-0000-000000000000`,
      {
        method: "GET",
        headers: {
          "apikey": SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    
    const schemaStatus = schemaRes.status;
    const schemaText = await schemaRes.text();
    console.log(`   Status: ${schemaStatus}`);
    
    if (schemaStatus === 404) {
      console.log("   ✅ Tabuľka neexistuje (404 = potvrdzujeme)");
      
      // Now let's try to create it using the Supabase management API
      // with a session token instead of the service_role key
      // First, get a session for the service_role user
      
      // Actually, the service_role key IS the authentication. The problem is that
      // the Management API uses a different auth system (PAT tokens).
      
      // But we can use the service_role key to call the internal Supabase API
      // This endpoint exists for the dashboard to create tables:
      const createRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles_schema`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            schema: "public",
            table: "profiles",
          }),
        }
      );
      console.log(`   Schema endpoint status: ${createRes.status}`);
    } else if (schemaStatus === 200) {
      console.log("   ⚡ Tabuľka existuje! (potvrdzujem)");
    }
  } catch (e) {
    console.log("   Chyba:", e.message);
  }

  // Step 4: Try direct SQL execution via the pg_jsonschema API
  console.log("\n📡 Pokus 3: Používam supabase-js REST rozhranie...");
  try {
    // The key insight: with service_role, we can make GET/POST/PATCH/DELETE requests
    // to ANY table, and Supabase will auto-create the schema cache.
    // But to actually CREATE the table, we need DDL (Data Definition Language)
    // which isn't available through the REST API.
    
    // However, we CAN use the "pg_net" extension or call "net.http_post"
    // But that's complex.
    
    // The SIMPLEST approach is to use the Supabase CLI or a direct db connection.
    // Since neither is available, let's use a clever workaround:
    
    // Use the auth.users table to get the user, then create a profile via INSERT
    // If the table doesn't exist, the INSERT will fail with a clear message.
    // But we can use the "ON CONFLICT" clause with a DO UPDATE to bypass
    
    // Actually, let's just try to insert with a proper schema definition via
    // the "Prefer: return=representation" header
  } catch (e) {
    console.log("   Chyba:", e.message);
  }

  // Step 5: The most reliable approach - use the supabase-js client
  // with the service_role key to call the internal SQL executor
  console.log("\n📡 Pokus 4: Používam supabase rpc s exec_sql...");
  try {
    const { data, error } = await supabase.rpc("exec", { sql: `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        public_slug TEXT UNIQUE,
        plan_type TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `});
    if (error) console.log("   exec error:", error.message);
    else console.log("   ✅ exec OK!", data);
  } catch (e) {
    console.log("   exec exception:", e.message);
  }

  try {
    const { data, error } = await supabase.rpc("exec_sql", { 
      sql_text: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          full_name TEXT,
          bio TEXT,
          avatar_url TEXT,
          public_slug TEXT UNIQUE,
          plan_type TEXT NOT NULL DEFAULT 'free',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `
    });
    if (error) console.log("   exec_sql error:", error.message);
    else console.log("   ✅ exec_sql OK!", data);
  } catch (e) {
    console.log("   exec_sql exception:", e.message);
  }

  try {
    const { data, error } = await supabase.rpc("exec_sql_raw", {
      sql_text: "SELECT 1"
    });
    if (error) console.log("   exec_sql_raw error:", error.message);
    else console.log("   ✅ exec_sql_raw OK!");
  } catch (e) {
    console.log("   exec_sql_raw exception:", e.message);
  }

  // Final check
  console.log("\n🔍 Finálne overenie...");
  const { error: finalError } = await supabase.from("profiles").select("id").limit(1);
  if (finalError) {
    console.log(`❌ Tabuľka stále neexistuje: ${finalError.message}\n`);
    console.log("=" .repeat(60));
    console.log("⚠️  Musíš spustiť SQL manuálne v Supabase SQL Editore:");
    console.log("=" .repeat(60));
    console.log("1. Otvor: https://supabase.com/dashboard/project/zqaslhehioqdfjuvhoxw/sql/new");
    console.log("2. Otvor súbor supabase-setup.sql (v koreni projektu)");
    console.log("3. Skopíruj celý obsah do SQL Editora");
    console.log("4. Klikni RUN (alebo Ctrl+Enter)");
    console.log("=" .repeat(60));
  } else {
    console.log("✅ Tabuľka 'profiles' existuje!");
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, plan_type");
    console.log(`   Počet profilov: ${profiles?.length ?? 0}`);
  }
}

main().catch(console.error);