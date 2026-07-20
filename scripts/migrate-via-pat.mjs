/**
 * Execute SQL migration using Supabase PAT (Personal Access Token).
 */
const PROJECT_REF = "zqaslhehioqdfjuvhoxw";
const PAT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || "";

const SQL = `
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;
`;

async function main() {
  console.log("📦 Migration via Management API (PAT)...\n");

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/sql`;

  console.log(`📡 POST ${url}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PAT_TOKEN}`,
      },
      body: JSON.stringify({ query: SQL }),
    });

    const text = await res.text();
    console.log(`Status: ${res.status}`);

    if (res.ok) {
      console.log("✅ SQL executed successfully!");
    } else {
      console.log(`❌ ${text.substring(0, 300)}`);
    }

    // Verify columns
    console.log("\n🔍 Verifying...");
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      "https://zqaslhehioqdfjuvhoxw.supabase.co",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabase
      .from("profiles")
      .select("id, instagram_url, soundcloud_url, youtube_url")
      .limit(1);

    if (error) {
      console.log("❌ Columns still missing:", error.message);
    } else {
      console.log("✅ All columns exist!");
    }

    // Check bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const avatarsBucket = buckets?.find((b) => b.name === "avatars");
    if (avatarsBucket) {
      console.log("✅ Bucket 'avatars' exists!");
    } else {
      console.log("❌ Bucket 'avatars' not found. Creating via API...");
      const { error: createErr } = await supabase.storage.createBucket("avatars", {
        public: true,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
      });
      if (createErr) {
        console.log("❌ Failed to create bucket:", createErr.message);
      } else {
        console.log("✅ Bucket 'avatars' created successfully!");
      }
    }

  } catch (e) {
    console.error("Error:", e.message);
  }
}

main().catch(console.error);