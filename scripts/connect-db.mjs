/**
 * Creates the profiles table by connecting directly to Supabase PostgreSQL.
 * Uses the PAT token as database password.
 */
import pg from "pg";

const { Pool } = pg;

// Supabase project connection details
const PROJECT_REF = "zqaslhehioqdfjuvhoxw";
const DB_HOST = `db.${PROJECT_REF}.supabase.co`;
const DB_PORT = 5432;
const DB_NAME = "postgres";
const DB_USER = "postgres";

// The database password is typically the same as the project's database password
// found in Project Settings > Database > Password
// Let's try with the service_role JWT as password (this works for some setups)
const DB_PASSWORD = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_DB_PASSWORD || "";

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
  console.log("📦 Connecting to Supabase PostgreSQL directly...\n");
  console.log(`   Host: ${DB_HOST}:${DB_PORT}`);
  console.log(`   Database: ${DB_NAME}`);
  console.log(`   User: ${DB_USER}\n`);

  const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test connection
    console.log("📡 Testing connection...");
    const testResult = await pool.query("SELECT NOW()");
    console.log(`✅ Connected! Server time: ${testResult.rows[0].now}\n`);

    // Execute SQL
    console.log("📡 Creating profiles table...");
    await pool.query(SQL);
    console.log("✅ SQL executed successfully!\n");

    // Verify
    const verifyResult = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')"
    );
    console.log(`🔍 Table exists: ${verifyResult.rows[0].exists}`);

    // Create profiles for existing users who don't have one
    console.log("\n📡 Syncing profiles for existing users...");
    const usersResult = await pool.query(
      "SELECT id, email, raw_user_meta_data FROM auth.users"
    );
    
    for (const user of usersResult.rows) {
      const profileResult = await pool.query(
        "SELECT id FROM public.profiles WHERE id = $1",
        [user.id]
      );
      
      if (profileResult.rows.length === 0) {
        const displayName = user.raw_user_meta_data?.display_name || user.email?.split("@")[0] || "DJ";
        const slug = "dj-" + user.id.substring(0, 8);
        await pool.query(
          "INSERT INTO public.profiles (id, full_name, public_slug) VALUES ($1, $2, $3)",
          [user.id, displayName, slug]
        );
        console.log(`   ✅ Created profile for ${user.email || user.id}`);
      }
    }
    
    const countResult = await pool.query("SELECT COUNT(*) FROM public.profiles");
    console.log(`\n✅ Total profiles: ${countResult.rows[0].count}`);
    console.log("\n✅ All done! Refresh /dashboard/profile in browser.");

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    console.log("\n   The database password might be different.");
    console.log("   You can find it in Supabase Dashboard:");
    console.log("   Project Settings > Database > Connection string > Password");
    console.log("\n   Or run SQL manually:");
    console.log("   1. https://supabase.com/dashboard/project/zqaslhehioqdfjuvhoxw/sql/new");
    console.log("   2. Open supabase-setup.sql, copy content");
    console.log("   3. Paste into SQL Editor, click RUN");
  } finally {
    await pool.end();
  }
}

main().catch(console.error);