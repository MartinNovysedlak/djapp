"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Disc3, Loader2, Mail, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail, getOwnRole } from "@/utils/supabase/auth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

const OAUTH_ERROR_MESSAGE =
  "Prihlásenie cez Google sa nepodarilo. Skús to znova.";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const redirectParam = searchParams.get("redirect");

  useEffect(() => {
    if (searchParams.get("error")) {
      setErrorMessage(OAUTH_ERROR_MESSAGE);
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    const { error } = await signInWithEmail(loginEmail, loginPassword);
    if (error) {
      setIsLoading(false);
      setErrorMessage(error);
      return;
    }
    const role = await getOwnRole();
    setIsLoading(false);
    if (role === "client" && redirectParam) {
      router.push(redirectParam);
      return;
    }
    router.push(role === "client" ? "/client-dashboard" : "/dashboard/profile");
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/3 size-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-1/4 size-80 rounded-full bg-primary/5 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black,transparent)]"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-[0_0_40px_-8px_rgba(139,92,246,0.5)] backdrop-blur-sm">
            <Disc3 className="size-7 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              BookTheVibe
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Rezervuj vibe. Spravuj biznis.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">Vitaj späť</CardTitle>
            <CardDescription className="text-muted-foreground">
              Prihlás sa do svojho účtu.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Heslo</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground/70 transition-colors hover:text-primary"
                  >
                    Zabudnuté heslo?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-10 pl-9"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {errorMessage}
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="mt-2 h-10 w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Prihlasujem…
                  </>
                ) : (
                  "Prihlásiť sa"
                )}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-muted-foreground/60">alebo</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <GoogleSignInButton next={redirectParam ?? undefined} />

            <p className="mt-6 text-center text-xs text-muted-foreground/60">
              Nemáš účet?{" "}
              <Link
                href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : "/register"}
                className="font-medium text-violet-300 transition-colors hover:text-violet-200"
              >
                Zaregistruj sa
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
