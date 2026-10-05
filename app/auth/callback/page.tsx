"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { authErrorCode } from "@/lib/auth-errors";
import { getPostAuthPath } from "@/utils/supabase/auth";
import { getPublicSiteUrl, isNonPublicSiteUrl } from "@/lib/site-url";
import { finalizeGoogleLogin } from "./actions";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      if (isNonPublicSiteUrl(window.location.origin)) {
        const params = new URLSearchParams(window.location.search);
        const target = new URL("/login", getPublicSiteUrl());
        if (!params.get("error")) target.searchParams.set("google", "1");
        window.location.replace(target.toString());
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const providerError = params.get("error_description") || params.get("error");

      if (!code) {
        const key = providerError ? authErrorCode(providerError) : "missing_code";
        router.replace(`/login?error=${key}`);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      localStorage.removeItem("btv_pkce_verifier");
      if (cancelled) return;

      if (error) {
        setFailed(true);
        router.replace(`/login?error=${authErrorCode(error.message)}`);
        return;
      }

      const { next } = await finalizeGoogleLogin();
      if (cancelled) return;
      const path = await getPostAuthPath(next);
      router.replace(path);
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-primary" />
        {failed ? "Prihlásenie sa nepodarilo…" : "Prihlasujem…"}
      </div>
    </div>
  );
}
