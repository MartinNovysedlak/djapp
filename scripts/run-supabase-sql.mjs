import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zqaslhehioqdfjuvhoxw.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Migration SQL: add new columns and create storage bucket ──
const sql = `
-- Add new social link columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS soundcloud_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
`;

async function main() {
  console.log("📦 Spúšťam migráciu (nové stĺpce + storage bucket)...\n");

  // Try via graphql endpoint
  const ep = `${SUPABASE_URL}/graphql/v1`;
  console.log(`📡 Skúšam: ${ep}`);
  const res = await fetch(ep, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (res.ok) {
    console.log("✅ SQL migrácia úspešná!");
  } else {
    console.log(`   ${text.substring(0, 200)}`);
  }

  // Try using supabase-js REST /rpc/ call with raw SQL
  console.log("\n📡 Skúšam REST SQL endpoint...");
  try {
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    const txt2 = await res2.text();
    console.log(`Status: ${res2.status} – ${txt2.substring(0, 120)}`);
  } catch (e) {
    console.log("Chyba:", e.message);
  }

  // Verify columns
  console.log("\n🔍 Overujem stĺpce...");
  try {
    const { data, error } = await supabase.from("profiles").select("id, instagram_url, soundcloud_url, youtube_url").limit(1);
    if (error) {
      console.log("❌ Chyba:", error.message);
    } else {
      console.log("✅ Stĺpce instagram_url, soundcloud_url, youtube_url existujú!");
    }
  } catch (e) {
    console.log("❌ Výnimka:", e.message);
  }

  // Verify bucket
  console.log("\n🔍 Overujem storage bucket...");
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.log("❌ Chyba:", bucketError.message);
    } else {
      const avatarsBucket = buckets.find((b) => b.name === "avatars");
      if (avatarsBucket) {
        console.log("✅ Bucket 'avatars' existuje!");
      } else {
        console.log("❌ Bucket 'avatars' neexistuje, skúšam vytvoriť cez API...");
        const { error: createError } = await supabase.storage.createBucket("avatars", {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        });
        if (createError) {
          console.log("❌ Nepodarilo sa vytvoriť bucket:", createError.message);
        } else {
          console.log("✅ Bucket 'avatars' vytvorený!");
        }
      }
    }
  } catch (e) {
    console.log("❌ Výnimka:", e.message);
  }

  console.log("\n✅ Migrácia dokončená!");
}

main().catch(console.error);