"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { DELETE_ACCOUNT_CONFIRM_WORD } from "@/lib/account";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Chýbajú Supabase serverové premenné prostredia.");
  }

  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Permanently deletes the signed-in auth user (cascades to profile + related rows).
 * Requires typing the confirmation word exactly.
 */
export async function deleteOwnAccount(input: {
  confirmWord: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ssr = await createSSRClient();
    const { data: authData, error: authError } = await ssr.auth.getUser();

    if (authError || !authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const word = (input.confirmWord || "").trim();
    if (word !== DELETE_ACCOUNT_CONFIRM_WORD) {
      return {
        ok: false,
        error: `Pre potvrdenie napíš presne ${DELETE_ACCOUNT_CONFIRM_WORD}.`,
      };
    }

    const userId = authData.user.id;
    const admin = getAdminClient();

    // Best-effort avatar cleanup — never block account deletion.
    try {
      const { data: files } = await admin.storage.from("avatars").list(userId);
      if (files?.length) {
        await admin.storage
          .from("avatars")
          .remove(files.map((f) => `${userId}/${f.name}`));
      }
    } catch (err) {
      console.warn("[deleteOwnAccount] avatar cleanup failed", err);
    }

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[deleteOwnAccount]", error);
      return {
        ok: false,
        error: error.message || "Účet sa nepodarilo zmazať.",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("[deleteOwnAccount]", err);
    return { ok: false, error: "Účet sa nepodarilo zmazať." };
  }
}
