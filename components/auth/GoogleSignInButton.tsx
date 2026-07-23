"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/utils/supabase/auth";
import type { OAuthSignupIntent } from "@/lib/oauth-intent";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.48a5.54 5.54 0 0 1-2.4 3.64v3.02h3.87c2.27-2.09 3.57-5.17 3.57-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.95-2.9l-3.87-3.02c-1.08.73-2.46 1.16-4.08 1.16-3.14 0-5.8-2.12-6.75-4.97H1.24v3.12A11.998 11.998 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.25 14.27a7.2 7.2 0 0 1 0-4.54V6.61H1.24a12.02 12.02 0 0 0 0 10.78l4.01-3.12Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.24 6.61l4.01 3.12C6.2 6.87 8.86 4.75 12 4.75Z"
      />
    </svg>
  );
}

type GoogleSignInButtonProps = {
  next?: string;
  label?: string;
  /** When registering — locked to selected role on the form. */
  intent?: OAuthSignupIntent;
};

export function GoogleSignInButton({
  next,
  label = "Prihlásiť sa cez Google",
  intent,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsLoading(true);
    const { error: authError } = await signInWithGoogle(next, intent);
    if (authError) {
      setIsLoading(false);
      setError(authError);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isLoading}
        className="h-10 w-full gap-2 text-zinc-200"
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {label}
      </Button>
      {error ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
