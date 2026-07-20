/**
 * Direct PostgreSQL migration to add new columns and create storage bucket.
 * Uses the service_role JWT as the database password.
 */
import pg from "pg";

const { Pool } = pg;

const PROJECT_REF = "zqaslhehioqdfjuvhoxw";
const DB_HOST = `db.${PROJECT_REF}.supabase.co`;
const DB_PORT = 5432;
const DB_NAME = "postgres";
const DB_USER = "postgres";
const DB_PASSWORD = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_DB_PASSWORD || "";

const MIGRATION_SQL = `
  -- Add new social link columns
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;

  -- Create storage bucket for avatars if not exists
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  ON CONFLICT (id) DO NOTHING;
`;

async function main() {
  console.log("📦 Direct PostgreSQL migration...\n");
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

    // Run migration
    console.log("📡 Adding new columns...");
    await pool.query(`
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;
    `);
    console.log("✅ Columns added!\n");

    // Create storage bucket
    console.log("📡 Creating storage bucket...");
    try {
      await pool.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log("✅ Bucket created!\n");
    } catch (e) {
      console.log(`⚠️  Bucket creation note: ${e.message}\n`);
    }

    // Verify
    const verifyResult = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'profiles'
       AND column_name IN ('instagram_url', 'soundcloud_url', 'youtube_url')`
    );
    console.log("🔍 Existing columns:");
    verifyResult.rows.forEach((r) => console.log(`   ✅ ${r.column_name} (${r.data_type})`));

    if (verifyResult.rows.length === 3) {
      console.log("\n✅ All 3 columns exist!");
    } else {
      console.log(`\n⚠️  Only ${verifyResult.rows.length}/3 columns found`);
    }

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    console.log("\n⚠️  Run SQL manually in Supabase SQL Editor:");
    console.log("   1. https://supabase.com/dashboard/project/zqaslhehioqdfjuvhoxw/sql/new");
    console.log("   2. Execute:");
    console.log("      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;");
    console.log("      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;");
    console.log("      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;");
    console.log("      ");
    console.log("      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)");
    console.log("      VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])");
    console.log("      ON CONFLICT (id) DO NOTHING;");
  } finally {
    await pool.end();
  }
}

main().catch(console.error);