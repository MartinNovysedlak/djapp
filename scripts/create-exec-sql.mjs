import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zqaslhehioqdfjuvhoxw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("🔄 Creating exec_sql function...\n");

  const { error } = await supabase.rpc("exec_sql", { query: "SELECT 1" });

  if (error && error.message.includes("Could not find the function")) {
    console.log("📝 exec_sql doesn't exist yet. Creating it via Management API...\n");

    // Use the Supabase Management API to create the function
    // This requires the project ref and the service role key
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Accept": "application/json",
        },
        body: JSON.stringify({
          query: `
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  EXECUTE query;
END;
$$;
          `.trim(),
        }),
      }
    );

    const text = await response.text();
    console.log(`Status: ${response.status} - ${text.substring(0, 200)}`);

    // Try a different URL format
    console.log("\n📡 Trying alternative approach...");
    try {
      const res = await fetch(
        "https://api.supabase.com/v1/projects/zqaslhehioqdfjuvhoxw/sql",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            query: `
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  EXECUTE query;
END;
$$;
            `.trim(),
          }),
        }
      );
      const txt = await res.text();
      console.log(`Status: ${res.status} - ${txt.substring(0, 200)}`);
    } catch (e) {
      console.log("Error:", e.message);
    }
  } else if (error) {
    console.log("exec_sql exists but error:", error.message);
  } else {
    console.log("✅ exec_sql function already exists!");
  }

  console.log("\n⚠️  You need to run the SQL manually in Supabase Dashboard:");
  console.log("   1. Open https://supabase.com/dashboard/project/zqaslhehioqdfjuvhoxw/sql/new");
  console.log("   2. Copy and paste the content from supabase-setup.sql sections 7-9");
  console.log("   3. Click RUN");
}

main().catch(console.error);