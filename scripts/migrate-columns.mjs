import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zqaslhehioqdfjuvhoxw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Try using postgres.js via the SQL endpoint
  console.log("📦 Migrácia stĺpcov...\n");

  // Method 1: Direct REST API - use raw SQL via the postgres REST endpoint
  console.log("📡 Skúšam REST API postgres endpoint...");
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        query: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;`
      }),
    });
    console.log(`Status: ${res.status}`);
  } catch (e) {
    console.log("Chyba:", e.message);
  }

  // Method 2: Use pg client
  console.log("\n📡 Skúšam priamo cez supabase-js REST with select...");
  try {
    // Use the supabase client to check what columns we have
    const { data, error } = await supabase
      .from("profiles")
      .select("id, instagram_url, soundcloud_url, youtube_url")
      .limit(1);

    if (error && error.message?.includes("does not exist")) {
      console.log("❌ Stĺpce ešte neexistujú, skúšam vytvoriť cez rpc...");
      
      // Try creating via a raw SQL execution
      // Supabase has this endpoint: /rest/v1/rpc/pgrest_exec
      const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          "Accept": "application/json",
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;
          `,
        }),
      });
      const txt = await res2.text();
      console.log(`RPC Status: ${res2.status} - ${txt.substring(0, 200)}`);
    } else if (error) {
      console.log("Iná chyba:", error.message);
    } else {
      console.log("✅ Stĺpce už existujú!");
      return;
    }
  } catch (e) {
    console.log("Výnimka:", e.message);
  }

  // Method 3: Try a different approach - use the management API
  console.log("\n📡 Skúšam Supabase Management API...");
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/zqaslhehioqdfjuvhoxw/sql`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;
          `,
        }),
      }
    );
    const txt = await res.text();
    console.log(`Status: ${res.status} - ${txt.substring(0, 300)}`);
  } catch (e) {
    console.log("Chyba:", e.message);
  }

  // Verify
  console.log("\n🔍 Overujem...");
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, instagram_url, soundcloud_url, youtube_url")
      .limit(1);
    if (error) {
      console.log("❌ Stále neexistujú:", error.message);
      console.log("\n⚠️  Musíš spustiť SQL manuálne v Supabase:");
      console.log("   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;");
      console.log("   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;");
      console.log("   ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;");
    } else {
      console.log("✅ Stĺpce existujú!");
    }
  } catch (e) {
    console.log("Chyba:", e.message);
  }
}

main().catch(console.error);