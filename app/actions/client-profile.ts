"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import type {
  ClientBillingFieldKey,
  ClientBillingProfileRow,
  ClientPersonType,
} from "@/lib/client-billing";

type RequireClientResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createSSRClient>>; userId: string }
  | { ok: false; error: string };

async function requireClient(): Promise<RequireClientResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role === "dj") {
    return { ok: false, error: "Táto stránka je len pre klientské účty." };
  }

  return { ok: true, supabase, userId: authData.user.id };
}

export type ClientProfileData = {
  fullName: string | null;
  realFirstName: string | null;
  realLastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  email: string | null;
};

export type GetClientProfileResult =
  | { ok: true; profile: ClientProfileData; billing: ClientBillingProfileRow | null }
  | { ok: false; error: string };

export async function getClientProfile(): Promise<GetClientProfileResult> {
  const auth = await requireClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const [{ data: profile }, { data: billing }, authUser] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, real_first_name, real_last_name, phone, avatar_url")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("client_billing_profiles")
      .select("*")
      .eq("client_id", userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  return {
    ok: true,
    profile: {
      fullName: profile?.full_name ?? null,
      realFirstName: profile?.real_first_name ?? null,
      realLastName: profile?.real_last_name ?? null,
      phone: profile?.phone ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      email: authUser.data.user?.email ?? null,
    },
    billing: (billing as ClientBillingProfileRow | null) ?? null,
  };
}

export type UpdateClientProfileInput = {
  fullName: string;
  realFirstName: string;
  realLastName: string;
  phone: string;
  avatarUrl?: string | null;
};

export type UpdateResult = { ok: true } | { ok: false; error: string };

export async function updateClientProfile(
  input: UpdateClientProfileInput
): Promise<UpdateResult> {
  const auth = await requireClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const patch: Record<string, string | null> = {
    full_name: input.fullName.trim() || null,
    real_first_name: input.realFirstName.trim() || null,
    real_last_name: input.realLastName.trim() || null,
    phone: input.phone.trim() || null,
  };
  if (input.avatarUrl !== undefined) {
    patch.avatar_url = input.avatarUrl?.trim() || null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (error) {
    console.error("[updateClientProfile]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export type SaveClientBillingInput = {
  personType: ClientPersonType;
  legalName: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  ico: string;
  dic: string;
  icDph: string;
  isVatPayer: boolean;
  companyNote: string;
};

export type SaveClientBillingResult =
  | { ok: true; billing: ClientBillingProfileRow }
  | { ok: false; error: string };

export async function saveClientBilling(
  input: SaveClientBillingInput
): Promise<SaveClientBillingResult> {
  const auth = await requireClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const isCompany = input.personType === "company";

  const { data, error } = await supabase
    .from("client_billing_profiles")
    .upsert(
      {
        client_id: userId,
        person_type: input.personType,
        legal_name: input.legalName.trim() || null,
        street_address: input.streetAddress.trim() || null,
        city: input.city.trim() || null,
        postal_code: input.postalCode.trim() || null,
        country: input.country.trim() || "Slovensko",
        ico: isCompany ? input.ico.trim() || null : null,
        dic: isCompany ? input.dic.trim() || null : null,
        ic_dph: isCompany ? input.icDph.trim() || null : null,
        is_vat_payer: isCompany ? input.isVatPayer : false,
        company_note: input.companyNote.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[saveClientBilling]", error);
    return { ok: false, error: error?.message ?? "Uloženie zlyhalo." };
  }

  return { ok: true, billing: data as ClientBillingProfileRow };
}

/** Merge filled placeholder values into the client's billing profile (partial upsert). */
export async function mergeClientBillingFromFill(
  values: Partial<Record<ClientBillingFieldKey, string>>
): Promise<UpdateResult> {
  const auth = await requireClient();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const entries = Object.entries(values).filter(
    ([, v]) => typeof v === "string" && v.trim()
  );
  if (entries.length === 0) return { ok: true };

  const patch: Record<string, string | null | boolean> = {
    client_id: userId,
    updated_at: new Date().toISOString(),
  };
  for (const [key, value] of entries) {
    patch[key] = value!.trim();
  }

  const { error } = await supabase
    .from("client_billing_profiles")
    .upsert(patch, { onConflict: "client_id" });

  if (error) {
    console.error("[mergeClientBillingFromFill]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
