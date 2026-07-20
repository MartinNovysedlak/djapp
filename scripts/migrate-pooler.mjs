/**
 * Connect via Supabase connection pooler and run migration.
 * Connection string format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
 */
import pg from "pg";

const { Pool } = pg;

const PROJECT_REF = "zqaslhehioqdfjuvhoxw";

// Try using the actual database password from the project settings
// The service_role JWT won't work as a password - need the actual DB password
// You can find it in: Supabase Dashboard > Project Settings > Database > Connection string
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || "";

async function main() {
  if (!DB_PASSWORD) {
    console.log("❌ No database password provided.");
    console.log("\n⚠️  Please run SQL manually in Supabase Dashboard:");
    console.log("   1. Open https://supabase.com/dashboard/project/zqaslhehioqdfjuvhoxw/sql/new");
    console.log("   2. Execute these SQL commands:");
    console.log("   ─────────────────────────────────────────────────");
    console.log("   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;");
    console.log("   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;");
    console.log("   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;");
    console.log("   ─────────────────────────────────────────────────");
    process.exit(1);
  }

  // Try pooler connection
  console.log("📦 Trying pooler connection...\n");
  
  const pooler = new Pool({
    host: `${PROJECT_REF}.pooler.supabase.com`,
    port: 6543,
    database: "postgres",
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    const r = await pooler.query("SELECT now()");
    console.log("✅ Pooler connected:", r.rows[0].now);

    await pooler.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;
    `);
    console.log("✅ Columns added via pooler!");

    const cols = await pooler.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name IN ('instagram_url', 'soundcloud_url', 'youtube_url')
    `);
    console.log("✅ Verified:", cols.rows.map(r => r.column_name).join(", "));
  } catch (e2) {
    console.log(`❌ Pooler error: ${e2.message}`);
    process.exit(1);
  } finally {
    await pooler.end();
  }
}

main().catch(console.error);