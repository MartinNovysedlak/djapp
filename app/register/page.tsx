"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Disc, Loader2, Lock, Mail, Music2, Phone, Sparkles, User, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpWithEmail } from "@/utils/supabase/auth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/BrandLogo";
import {
  ARTIST_KIND_OPTIONS,
  getArtistNameFieldLabel,
  type ArtistKind,
} from "@/lib/dj-display";

type Role = "client" | "dj";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const initialRole = searchParams.get("role") === "dj" ? "dj" : "client";

  const [role, setRole] = useState<Role>(initialRole);
  const [artistKind, setArtistKind] = useState<ArtistKind>("dj");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  // Real name + phone — required for everyone, regardless of role.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  // Artist-only field — public stage name, separate from the real name above.
  const [artistName, setArtistName] = useState("");
  // Artist-only — whether the real first/last name may appear next to the stage name.
  const [showRealName, setShowRealName] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage("Heslá sa nezhodujú.");
      return;
    }

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirst || !trimmedLast) {
      setErrorMessage("Zadaj krstné meno a priezvisko.");
      return;
    }
    if (!trimmedPhone) {
      setErrorMessage("Zadaj telefónne číslo.");
      return;
    }
    if (role === "dj" && !artistName.trim()) {
      setErrorMessage(
        artistKind === "band"
          ? "Zadaj názov kapely."
          : "Zadaj svoje umelecké meno."
      );
      return;
    }

    const displayName =
      role === "client" ? `${trimmedFirst} ${trimmedLast}` : artistName.trim();

    setErrorMessage(null);
    setIsLoading(true);
    const { error, needsEmailConfirmation } = await signUpWithEmail(
      email,
      password,
      {
        displayName,
        role,
        firstName: trimmedFirst,
        lastName: trimmedLast,
        phone: trimmedPhone,
        showRealName: role === "dj" ? showRealName : false,
        artistKind: role === "dj" ? artistKind : undefined,
      }
    );
    setIsLoading(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    if (needsEmailConfirmation) {
      setNeedsEmailConfirmation(true);
      return;
    }

    if (role === "client" && redirectParam) {
      router.push(redirectParam);
      return;
    }
    router.push(role === "client" ? "/client-dashboard" : "/dashboard/profile");
  }

  if (needsEmailConfirmation) {
    return (
      <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent)]"
        />
        <div className="glass relative z-10 w-full max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
            <CheckCircle2 className="size-7 text-emerald-400" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Skontrolujte si e-mail!
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Poslali sme vám potvrdzovací odkaz pre dokončenie registrácie na
            adresu <span className="font-medium text-zinc-200">{email}</span>.
            Kliknite na odkaz v e-maile a potom sa prihláste.
          </p>
          <Link href="/login">
            <Button className="mt-6 h-10 w-full">Prejsť na prihlásenie</Button>
          </Link>
        </div>
      </div>
    );
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
          <BrandLogo size="lg" />
          <p className="text-sm text-muted-foreground">
            Vytvor si účet za pár sekúnd.
          </p>
        </div>

        <div className="glass rounded-3xl p-6 md:p-7">
          {/* Role selector — big, visually distinct cards */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("client")}
              className={cn(
                "group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border px-4 py-5 text-center transition-all duration-300",
                role === "client"
                  ? "border-violet-500/40 bg-gradient-to-b from-violet-500/15 to-transparent shadow-[0_0_0_1px_oklch(0.6_0.26_295/0.3),0_12px_30px_-14px_oklch(0.6_0.26_295/0.5)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl transition-colors",
                  role === "client"
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-white/5 text-zinc-400"
                )}
              >
                <Users className="size-5" />
              </span>
              <span
                className={cn(
                  "text-sm font-semibold transition-colors",
                  role === "client" ? "text-white" : "text-zinc-300"
                )}
              >
                Som Zákazník
              </span>
              <span className="text-[11px] leading-snug text-zinc-500">
                Rezervuj umelcov na svoju akciu
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole("dj")}
              className={cn(
                "group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border px-4 py-5 text-center transition-all duration-300",
                role === "dj"
                  ? "border-violet-500/40 bg-gradient-to-b from-violet-500/15 to-transparent shadow-[0_0_0_1px_oklch(0.6_0.26_295/0.3),0_12px_30px_-14px_oklch(0.6_0.26_295/0.5)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              )}
            >
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-xl transition-colors",
                  role === "dj" ? "bg-violet-500/20 text-violet-300" : "bg-white/5 text-zinc-400"
                )}
              >
                <Disc className="size-5" />
              </span>
              <span
                className={cn(
                  "text-sm font-semibold transition-colors",
                  role === "dj" ? "text-white" : "text-zinc-300"
                )}
              >
                Som umelec
              </span>
              <span className="text-[11px] leading-snug text-zinc-500">
                DJ, kapela alebo oboje
              </span>
            </button>
          </div>

          {role === "dj" ? (
            <div className="mb-6 grid grid-cols-3 gap-2">
              {ARTIST_KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setArtistKind(opt.value)}
                  className={cn(
                    "rounded-xl border px-2 py-2.5 text-center transition-all",
                    artistKind === opt.value
                      ? "border-violet-500/40 bg-violet-500/15 text-violet-100"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                  )}
                >
                  <span className="block text-xs font-semibold">{opt.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first-name">Krstné meno</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="first-name"
                    type="text"
                    placeholder="Jana"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                    className="h-10 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Priezvisko</Label>
                <Input
                  id="last-name"
                  type="text"
                  placeholder="Nováková"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className="h-10"
                />
              </div>
            </div>

            {role === "dj" && (
              <div className="space-y-2">
                <Label htmlFor="artist-name">
                  {getArtistNameFieldLabel(artistKind)}
                </Label>
                <div className="relative">
                  {artistKind === "band" ? (
                    <Music2 className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                  ) : (
                    <Sparkles className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                  )}
                  <Input
                    id="artist-name"
                    type="text"
                    placeholder={
                      artistKind === "band"
                        ? "The Vibes"
                        : artistKind === "dj_band"
                          ? "Nova Collective"
                          : "DJ Nova"
                    }
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    required
                    autoComplete="name"
                    className="h-10 pl-9"
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <input
                    type="checkbox"
                    checked={showRealName}
                    onChange={(e) => setShowRealName(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-white/20 bg-transparent accent-violet-500"
                  />
                  <span className="text-xs leading-relaxed text-zinc-400">
                    <span className="font-medium text-zinc-200">
                      Zobraziť aj skutočné meno a priezvisko
                    </span>
                    <br />
                    Ak toto vypneš, klienti uvidia len{" "}
                    {artistKind === "band"
                      ? "názov kapely"
                      : "umelecké meno"}
                    . Nastavenie môžeš kedykoľvek zmeniť v dashboarde.
                  </span>
                </label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Telefónne číslo</Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+421 900 123 456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 znakov"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Potvrď heslo</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="h-10 pl-9"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMessage}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:brightness-110"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Vytváram účet…
                </>
              ) : role === "client" ? (
                "Vytvoriť účet ako zákazník"
              ) : artistKind === "band" ? (
                "Vytvoriť účet ako kapela"
              ) : artistKind === "dj_band" ? (
                "Vytvoriť účet ako DJ + Kapela"
              ) : (
                "Vytvoriť účet ako DJ"
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-muted-foreground/60">alebo</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <GoogleSignInButton
            next={redirectParam ?? undefined}
            label="Zaregistrovať sa cez Google"
          />

          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            Už máš účet?{" "}
            <Link
              href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}
              className="font-medium text-violet-300 transition-colors hover:text-violet-200"
            >
              Prihlás sa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
