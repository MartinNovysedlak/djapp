"use client";

import { useEffect, useState } from "react";
import {
  Link2,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  getCalendarSyncSettings,
  regenerateCalendarExportToken,
  updateExternalCalendarUrl,
  type CalendarSyncSettings,
} from "@/app/actions/calendar-sync";
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
import { useToast } from "@/lib/toast-context";

export function CalendarSyncPanel() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [settings, setSettings] = useState<CalendarSyncSettings | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getCalendarSyncSettings();
      if (cancelled) return;
      setLoading(false);
      if (!result.ok || !result.settings) {
        showToast(
          result.error ?? "Nastavenia kalendára sa nepodarilo načítať.",
          "error"
        );
        return;
      }
      setSettings(result.settings);
      setImportUrl(result.settings.externalCalendarUrl ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const handleSaveImport = async () => {
    setSaving(true);
    const result = await updateExternalCalendarUrl(importUrl);
    setSaving(false);
    if (!result.ok || !result.settings) {
      showToast(result.error ?? "Uloženie zlyhalo.", "error");
      return;
    }
    setSettings(result.settings);
    setImportUrl(result.settings.externalCalendarUrl ?? "");
    showToast(
      result.settings.externalCalendarUrl
        ? "Externý kalendár bol prepojený. Obsadené termíny sa budú blokovať."
        : "Externý kalendár bol odpojený.",
      "success"
    );
  };

  const handleCopyExport = async () => {
    if (!settings?.exportUrl) return;
    try {
      await navigator.clipboard.writeText(settings.exportUrl);
      setCopied(true);
      showToast("Export URL skopírovaná do schránky.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Kopírovanie zlyhalo.", "error");
    }
  };

  const handleRegenerate = async () => {
    if (
      !window.confirm(
        "Vygenerovať nový tajný odkaz? Starý odkaz prestane fungovať — treba ho znova vložiť do Google/Apple kalendára."
      )
    ) {
      return;
    }
    setRegenerating(true);
    const result = await regenerateCalendarExportToken();
    setRegenerating(false);
    if (!result.ok || !result.settings) {
      showToast(result.error ?? "Regenerácia zlyhala.", "error");
      return;
    }
    setSettings(result.settings);
    showToast("Nový export odkaz bol vytvorený.", "success");
  };

  if (loading) {
    return (
      <Card className="rounded-3xl border-white/10 bg-black/40 backdrop-blur-md">
        <CardContent className="flex items-center gap-2 py-8 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" />
          Načítavam synchronizáciu…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-white/10 bg-black/40 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <Link2 className="size-4 text-emerald-400" />
          Synchronizácia kalendárov
        </CardTitle>
        <CardDescription>
          Prepoj Google/Apple kalendár oboma smermi — tvoje potvrdené akcie
          uvidíš v osobnom kalendári a súkromné „Busy“ termíny zablokujú
          rezervácie klientov.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-zinc-200">
              Export do Google / Apple
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Skopíruj tajnú URL a pridaj ju ako „URL odber“ / „Subscribe by
              URL“ v Google Calendar alebo v Apple Calendar. Feed obsahuje
              všetky potvrdené (accepted) akcie a blokácie.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              readOnly
              value={settings?.exportUrl ?? ""}
              className="font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2 rounded-[0.75rem]"
                onClick={handleCopyExport}
                disabled={!settings?.exportUrl}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-400" />
                ) : (
                  <Copy className="size-4" />
                )}
                Kopírovať
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="gap-2 rounded-[0.75rem] text-zinc-400"
                onClick={handleRegenerate}
                disabled={regenerating}
                title="Vygenerovať nový tajný token"
              >
                {regenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-zinc-600">
            Google Calendar → Nastavenia → Pridať kalendár → Z URL. Apple
            Calendar → Súbor → Nové predplatné kalendára.
          </p>
        </section>

        <section className="space-y-3 border-t border-white/5 pt-6">
          <div>
            <h3 className="text-sm font-medium text-zinc-200">
              Import z osobného kalendára
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Vlož tajnú .ics URL zo svojho Google/Apple kalendára. Systém
              stiahne udalosti (vrátane celodenných „Busy“) a tieto dátumy
              zablokuje v rezervačnom formulári klienta. Cache: 1 hodina.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="external-ics-url">Tajná ICS URL</Label>
            <Input
              id="external-ics-url"
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/…/private-…/basic.ics"
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              className="gap-2 rounded-[0.75rem]"
              onClick={handleSaveImport}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Uložiť import
            </Button>
            <a
              href="https://support.google.com/calendar/answer/37648"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Ako získať tajný odkaz
              <ExternalLink className="size-3" />
            </a>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
