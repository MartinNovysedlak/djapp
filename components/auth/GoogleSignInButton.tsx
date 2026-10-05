"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  GOOGLE_CLIENT_ID,
  completeGoogleSignIn,
  redirectGoogleAuthIfNeeded,
  rememberGoogleIntent,
} from "@/utils/supabase/auth";
import type { OAuthSignupIntent } from "@/lib/oauth-intent";

type GoogleCredential = { credential?: string };

type GoogleId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredential) => void;
    nonce: string;
    ux_mode?: "popup";
    use_fedcm_for_prompt?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  prompt: () => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("gsi")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gsi"));
    document.head.appendChild(script);
  });
}

function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

type GoogleSignInButtonProps = {
  next?: string;
  label?: string;
  intent?: OAuthSignupIntent;
  autoPrompt?: boolean;
};

export function GoogleSignInButton({
  next,
  label = "Prihlásiť sa cez Google",
  intent,
  autoPrompt = false,
}: GoogleSignInButtonProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const nonceRef = useRef("");
  const intentRef = useRef(intent);
  const nextRef = useRef(next);
  intentRef.current = intent;
  nextRef.current = next;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (redirectGoogleAuthIfNeeded(nextRef.current, intentRef.current)) {
      setLeaving(true);
      return;
    }

    let cancelled = false;
    const rawNonce = createNonce();
    nonceRef.current = rawNonce;
    rememberGoogleIntent(nextRef.current, intentRef.current);

    void (async () => {
      try {
        const hashed = await sha256Hex(rawNonce);
        await loadGoogleScript();
        if (cancelled || !hostRef.current || !window.google?.accounts?.id) return;
        const googleId = window.google.accounts.id;
        googleId.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashed,
          ux_mode: "popup",
          use_fedcm_for_prompt: true,
          callback: (response) => {
            void (async () => {
              if (!response.credential) {
                setError("Prihlásenie cez Google sa nepodarilo. Skús to znova.");
                return;
              }
              setIsLoading(true);
              setError(null);
              rememberGoogleIntent(nextRef.current, intentRef.current);
              const result = await completeGoogleSignIn(response.credential, rawNonce);
              if (result.error || !result.path) {
                setIsLoading(false);
                setError(result.error || "Prihlásenie cez Google sa nepodarilo. Skús to znova.");
                return;
              }
              window.location.assign(result.path);
            })();
          },
        });
        googleId.renderButton(hostRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.max(hostRef.current.offsetWidth, 320),
          locale: "sk",
        });
        if (autoPrompt) googleId.prompt();
      } catch {
        if (!cancelled) setError("Prihlásenie cez Google sa nepodarilo. Skús to znova.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoPrompt]);

  if (leaving) {
    return (
      <Button type="button" variant="outline" disabled className="h-10 w-full gap-2 text-zinc-200">
        <Loader2 className="size-4 animate-spin" />
        {label}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={hostRef} className="flex min-h-10 w-full justify-center overflow-hidden rounded-xl" />
      {isLoading ? (
        <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Prihlasujem…
        </p>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
