"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Phone, User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { completeOnboarding } from "@/app/actions/onboarding";
import {
  ARTIST_KIND_OPTIONS,
  getArtistNameFieldLabel,
  type ArtistKind,
} from "@/lib/dj-display";
import { isProfileOnboardingComplete } from "@/lib/profile-completeness";
import {
  COUNTRIES,
  formatLocation,
  getCitiesForCountry,
  locationOptionHint,
  parseLocation,
  type Country,
} from "@/lib/locations";
import { cn } from "@/lib/utils";

type ProfileDraft = {
  role: string;
  full_name: string | null;
  real_first_name: string | null;
  real_last_name: string | null;
  phone: string | null;
  artist_kind: string | null;
  avatar_url: string | null;
  location: string | null;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileDraft | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [artistKind, setArtistKind] = useState<ArtistKind>("dj");
  const [country, setCountry] = useState<Country>("SK");
  const [cityName, setCityName] = useState<string | null>(null);

  const cityOptions: ComboboxOption[] = getCitiesForCountry(country).map(
    (c) => ({
      value: c.name,
      label: c.name,
      hint: locationOptionHint(c),
    })
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select(
          "role, full_name, real_first_name, real_last_name, phone, artist_kind, avatar_url, location"
        )
        .eq("id", auth.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!data) {
        router.replace("/login");
        return;
      }
      if (data.role === "admin") {
        router.replace("/admin");
        return;
      }
      if (isProfileOnboardingComplete(data)) {
        router.replace(
          data.role === "client" ? "/client-dashboard" : "/dashboard/profile"
        );
        return;
      }

      setProfile(data as ProfileDraft);
      setFirstName(data.real_first_name ?? "");
      setLastName(data.real_last_name ?? "");
      setPhone(data.phone ?? "");
      setFullName(data.full_name ?? "");
      setArtistKind(
        data.artist_kind === "band" || data.artist_kind === "dj_band"
          ? data.artist_kind
          : "dj"
      );
      const parsed = parseLocation(data.location);
      setCountry(parsed.country);
      setCityName(parsed.city);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const isDj = profile?.role !== "client";
    if (isDj && !cityName?.trim()) {
      setError(
        "Vyber miesto pôsobenia — bez neho ťa klienti v katalógu nenájdu."
      );
      return;
    }

    setSaving(true);
    const result = await completeOnboarding({
      fullName,
      realFirstName: firstName,
      realLastName: lastName,
      phone,
      artistKind: isDj ? artistKind : undefined,
      location: isDj && cityName ? formatLocation(cityName, country) : null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(
      profile?.role === "client" ? "/client-dashboard" : "/dashboard/profile"
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-zinc-500">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const isDj = profile?.role !== "client";

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(139,92,246,0.18),transparent)]"
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandLogo size="md" />
          <h1 className="text-2xl font-bold text-white">Doplň profil</h1>
          <p className="text-sm text-zinc-400">
            Z Google sme predvyplnili, čo sa dalo. Zostáva pár povinných údajov
            — kým ich nedoplníš, do aplikácie ťa nepustíme.
          </p>
          {profile?.avatar_url ? (
            // Google CDN avatar — next/image domain not always configured
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="mt-2 size-16 rounded-full border border-white/10 object-cover"
            />
          ) : null}
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" required>
                Krstné meno
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName" required>
                Priezvisko
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" required>
              Telefón
            </Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+421…"
                className="pl-9"
                required
              />
            </div>
          </div>

          {isDj ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName" required>
                  {getArtistNameFieldLabel(artistKind)}
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label required>Miesto pôsobenia</Label>
                <div className="grid grid-cols-[auto_1fr] gap-2">
                  <div className="flex h-11 items-center gap-0.5 rounded-xl border border-input bg-transparent p-1">
                    {COUNTRIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          if (c.code !== country) {
                            setCountry(c.code);
                            setCityName(null);
                          }
                        }}
                        className={cn(
                          "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                          country === c.code
                            ? "bg-violet-500/15 text-violet-300"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {c.code}
                      </button>
                    ))}
                  </div>
                  <Combobox
                    options={cityOptions}
                    value={cityName}
                    onValueChange={setCityName}
                    placeholder="Vyber mesto alebo kraj…"
                    searchPlaceholder="Hľadať mesto alebo kraj…"
                    emptyText="Nič sa nenašlo — napíš vlastné miesto."
                    icon={<MapPin className="size-4" />}
                    creatable
                    createLabel={(q) => `Použiť „${q}“ ako miesto`}
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Môžeš zvoliť mesto, celý kraj, alebo napísať vlastné miesto.
                  Bez tohto údaju ťa klienti v katalógu neuvidia.
                </p>
              </div>

              <div className="space-y-2">
                <Label required>Typ účtu</Label>
                <div className="grid gap-2">
                  {ARTIST_KIND_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setArtistKind(opt.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        artistKind === opt.value
                          ? "border-violet-500/50 bg-violet-500/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={saving}
            className="h-11 w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Ukladám…
              </>
            ) : (
              "Pokračovať"
            )}
          </Button>

          <button
            type="button"
            className="w-full text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.replace("/login");
            }}
          >
            Odhlásiť sa
          </button>
        </form>
      </div>
    </div>
  );
}
