"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Megaphone,
  Save,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Reveal } from "@/components/motion";
import { useDashboardUser } from "@/components/DashboardUserContext";
import { useToast } from "@/lib/toast-context";
import {
  getMarketingSettings,
  updateMarketingSettings,
} from "@/app/actions/marketing";
import {
  GOOGLE_REVIEW_LINK_ERROR,
  isValidGoogleReviewLink,
} from "@/lib/google-review";
import { cn } from "@/lib/utils";

export default function MarketingSettingsPage() {
  const { loading: userLoading } = useDashboardUser();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleReviewLink, setGoogleReviewLink] = useState("");

  useEffect(() => {
    void (async () => {
      const result = await getMarketingSettings();
      if (result.ok && result.settings) {
        setGoogleReviewLink(result.settings.googleReviewLink ?? "");
      } else if (!result.ok) {
        showToast(
          result.error ?? "Nastavenia sa nepodarilo načítať.",
          "error"
        );
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linkInvalid =
    googleReviewLink.trim().length > 0 &&
    !isValidGoogleReviewLink(googleReviewLink);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (linkInvalid) return;
    setSaving(true);
    const result = await updateMarketingSettings({ googleReviewLink });
    setSaving(false);
    if (!result.ok) {
      showToast(result.error ?? "Uloženie zlyhalo.", "error");
      return;
    }
    setGoogleReviewLink(result.settings?.googleReviewLink ?? "");
    showToast(
      result.settings?.googleReviewLink
        ? "Odkaz na Google recenzie bol uložený. Klienti dostanú e-mail 1–2 dni po akcii."
        : "Odkaz na recenzie bol odstránený — e-maily sa neposielajú.",
      "success"
    );
  };

  if (userLoading || loading) {
    return (
      <div className="mx-auto flex max-w-2xl items-center gap-2 py-16 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Načítavam marketing…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Reveal>
        <Link
          href="/dashboard/profile"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="size-3.5" />
          Späť na profil
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Marketing
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Automatické poďakovanie a žiadosť o Google recenziu po úspešnej
            akcii.
          </p>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <Card className="rounded-3xl border-white/10 bg-black/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Megaphone className="size-4 text-fuchsia-400" />
              Google recenzie
            </CardTitle>
            <CardDescription>
              1–2 dni po potvrdenej akcii pošleme klientovi e-mail s
              poďakovaním a tlačidlom na tvoju Google stránku s recenziami.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="googleReviewLink"
                  className="flex items-center gap-1.5"
                >
                  <Star className="size-3.5 text-amber-400" />
                  Odkaz na Google recenzie
                </Label>
                <Input
                  id="googleReviewLink"
                  type="url"
                  value={googleReviewLink}
                  onChange={(e) => setGoogleReviewLink(e.target.value)}
                  placeholder="https://g.page/r/…/review"
                  aria-invalid={linkInvalid}
                  className={cn(
                    "font-mono text-xs",
                    linkInvalid &&
                      "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                  )}
                />
                {linkInvalid ? (
                  <p className="text-xs text-red-400">
                    {GOOGLE_REVIEW_LINK_ERROR}
                  </p>
                ) : (
                  <div className="space-y-2 text-xs leading-relaxed text-zinc-500">
                    <p>
                      Ako získať krátky odkaz z Google Business Profile
                      (Google Moja firma):
                    </p>
                    <ol className="list-decimal space-y-1 pl-4">
                      <li>
                        Otvor{" "}
                        <a
                          href="https://business.google.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-zinc-300 underline-offset-2 hover:underline"
                        >
                          business.google.com
                          <ExternalLink className="size-3" />
                        </a>
                      </li>
                      <li>
                        Vyber svoj profil →{" "}
                        <strong className="text-zinc-400">
                          Získať viac recenzií
                        </strong>{" "}
                        (Get more reviews)
                      </li>
                      <li>
                        Skopíruj krátky odkaz (napr.{" "}
                        <code className="rounded bg-white/5 px-1 py-0.5 text-[11px] text-zinc-300">
                          https://g.page/r/…/review
                        </code>
                        ) a vlož ho sem.
                      </li>
                    </ol>
                    <p>
                      Bez vyplneného odkazu sa e-maily s prosbou o recenziu
                      neodosielajú.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={saving || linkInvalid}
                className="gap-2 rounded-[0.75rem]"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Uložiť
              </Button>
            </form>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
