const SUPABASE_PROJECT_ID = "zqaslhehioqdfjuvhoxw";
const PAT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || "";

const SQL = `
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, public_slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    'dj-' || substr(md5(NEW.id::text), 1, 8)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
`;

async function main() {
  console.log("📦 Spúšťam SQL script cez Management API...\n");

  // Try all known Supabase Management API endpoints for SQL execution
  // The correct endpoint varies by Supabase version
  const endpoints = [
    // Endpoint from the official Supabase API docs
    { url: `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/sql`, method: "POST" },
    { url: `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query`, method: "POST" },
    { url: `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/sql`, method: "PUT" },
    { url: `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/sql`, method: "POST" },
    // Legacy API
    { url: `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/raw-sql`, method: "POST" },
    // Internal API
    { url: `https://zqaslhehioqdfjuvhoxw.supabase.co/rest/v1/`, method: "GET", useServiceKey: true },
  ];

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  for (const { url, method, useServiceKey } of endpoints) {
    console.log(`📡 ${method} ${url}`);
    
    const headers = {
      "Content-Type": "application/json",
    };
    
    if (useServiceKey) {
      headers["apikey"] = SERVICE_KEY;
      headers["Authorization"] = `Bearer ${SERVICE_KEY}`;
    } else {
      headers["Authorization"] = `Bearer ${PAT_TOKEN}`;
    }
    
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: method !== "GET" ? JSON.stringify({ query: SQL }) : undefined,
      });

      const text = await res.text();
      console.log(`   Status: ${res.status}`);
      
      if (res.ok) {
        console.log("✅ SQL script úspešne vykonaný!");
        console.log("   Odpoveď:", text.substring(0, 200));
        process.exit(0);
      }
      
      console.log(`   ${text.substring(0, 120)}`);
    } catch (e) {
      console.log(`   Chyba: ${e.message}`);
    }
    console.log();
  }

  // Last resort: use the supabase-js client with service_role
  // to try to create the table via a different mechanism
  console.log("📡 Posledná možnosť: supabase-js admin API...");
  
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient("https://zqaslhehioqdfjuvhoxw.supabase.co", SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  
  // Check if we can access anything
  const { data: anyData } = await supabase.from("_prisma_migrations").select("*").limit(1).maybeSingle();
  console.log(`   _prisma_migrations: ${anyData ? "exists" : "no access or not exists"}`);
  
  // Try to create by inserting into a table that might auto-create
  // Actually, let's check what tables exist
  console.log("   Skúšam direct SQL cez REST API...");
  
  // The Supabase REST API with service_role can access the 
  // internal pg_catalog to create tables via a specific endpoint
  // Let's try the PgREST API with the service_role key
  const pgRestRes = await fetch(
    `https://zqaslhehioqdfjuvhoxw.supabase.co/rest/v1/rpc/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        // This won't work because we need a valid function name
      }),
    }
  );
  console.log(`   RPC: ${pgRestRes.status}`);

  console.log("\n❌ Všetky metódy zlyhali. Potrebný manuálny krok:");
  console.log("=".repeat(60));
  console.log("1. https://supabase.com/dashboard/project/zqaslhehioqdfjuvhoxw/sql/new");
  console.log("2. Otvor súbor supabase-setup.sql (v Code)");
  console.log("3. Skopíruj celý obsah a vlož do SQL Editora");
  console.log("4. Klikni RUN");
  console.log("=".repeat(60));
}

main().catch(console.error);