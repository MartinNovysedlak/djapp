"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/toast-context";
import {
  getBillingProfile,
  saveBillingProfile,
  type SaveBillingProfileInput,
} from "@/app/actions/invoices";

const EMPTY_FORM: SaveBillingProfileInput = {
  legalName: "",
  streetAddress: "",
  city: "",
  postalCode: "",
  country: "Slovensko",
  ico: "",
  dic: "",
  icDph: "",
  isVatPayer: false,
  iban: "",
  bankName: "",
  swift: "",
  registrationNote: "",
  invoiceNumberPrefix: String(new Date().getFullYear()),
  defaultDueDays: 14,
};

export function BillingProfileForm({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState<SaveBillingProfileInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getBillingProfile();
      if (cancelled) return;
      if (result.ok && result.billing) {
        const b = result.billing;
        setForm({
          legalName: b.legal_name ?? "",
          streetAddress: b.street_address ?? "",
          city: b.city ?? "",
          postalCode: b.postal_code ?? "",
          country: b.country ?? "Slovensko",
          ico: b.ico ?? "",
          dic: b.dic ?? "",
          icDph: b.ic_dph ?? "",
          isVatPayer: b.is_vat_payer,
          iban: b.iban ?? "",
          bankName: b.bank_name ?? "",
          swift: b.swift ?? "",
          registrationNote: b.registration_note ?? "",
          invoiceNumberPrefix: b.invoice_number_prefix,
          defaultDueDays: b.default_due_days,
        });
      } else if (!result.ok) {
        showToast(result.error, "error");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  function setField<K extends keyof SaveBillingProfileInput>(
    key: K,
    value: SaveBillingProfileInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveBillingProfile(form);
    setSaving(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Fakturačné údaje uložené.", "success");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Načítavam fakturačné údaje…
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-5" : "space-y-6"}>
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Fakturačná identita
        </p>
        <div className="space-y-2">
          <Label className="text-zinc-400">
            Fakturačný názov / meno (živnostník)
          </Label>
          <Input
            value={form.legalName}
            onChange={(e) => setField("legalName", e.target.value)}
            placeholder="Napr. Ján Novák — event services"
            className="h-10 rounded-xl bg-white/[0.03]"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-zinc-400">Ulica a číslo</Label>
            <Input
              value={form.streetAddress}
              onChange={(e) => setField("streetAddress", e.target.value)}
              className="h-10 rounded-xl bg-white/[0.03]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">Mesto</Label>
            <Input
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              className="h-10 rounded-xl bg-white/[0.03]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">PSČ</Label>
            <Input
              value={form.postalCode}
              onChange={(e) => setField("postalCode", e.target.value)}
              className="h-10 rounded-xl bg-white/[0.03]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">Krajina</Label>
            <Input
              value={form.country}
              onChange={(e) => setField("country", e.target.value)}
              className="h-10 rounded-xl bg-white/[0.03]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-white/5 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Registračné údaje
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-zinc-400">IČO</Label>
            <Input
              value={form.ico}
              onChange={(e) => setField("ico", e.target.value)}
              className="h-10 rounded-xl bg-white/[0.03]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">DIČ</Label>
            <Input
              value={form.dic}
              onChange={(e) => setField("dic", e.target.value)}
              className="h-10 rounded-xl bg-white/[0.03]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">IČ DPH</Label>
            <Input
              value={form.icDph}
              onChange={(e) => setField("icDph", e.target.value)}
              disabled={!form.isVatPayer}
              className="h-10 rounded-xl bg-white/[0.03] disabled:opacity-40"
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <div>
            <p className="text-sm text-zinc-200">Som platca DPH</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Keď je vypnuté, faktúra doplní poznámku „Nie som platcom DPH.“
            </p>
          </div>
          <Switch
            checked={form.isVatPayer}
            onCheckedChange={(checked) => setField("isVatPayer", checked)}
            aria-label="Som platca DPH"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-400">
            Poznámka o registrácii (voliteľné)
          </Label>
          <Input
            value={form.registrationNote}
            onChange={(e) => setField("registrationNote", e.target.value)}
            placeholder="Napr. Zapísaný v živnostenskom registri OÚ ..."
            className="h-10 rounded-xl bg-white/[0.03]"
          />
        </div>
      </div>

      <div className="space-y-4 border-t border-white/5 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Bankové spojenie
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-zinc-400">IBAN</Label>
            <Input
              value={form.iban}
              onChange={(e) => setField("iban", e.target.value)}
              placeholder="SK00 0000 0000 0000 0000 0000"
              className="h-10 rounded-xl bg-white/[0.03]"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">Banka / SWIFT</Label>
            <div className="flex gap-2">
              <Input
                value={form.bankName}
                onChange={(e) => setField("bankName", e.target.value)}
                placeholder="Názov banky"
                className="h-10 rounded-xl bg-white/[0.03]"
              />
              <Input
                value={form.swift}
                onChange={(e) => setField("swift", e.target.value)}
                placeholder="SWIFT"
                className="h-10 w-28 shrink-0 rounded-xl bg-white/[0.03]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t border-white/5 pt-5">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Číslovanie faktúr
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-zinc-400">Predpona čísla faktúry</Label>
            <Input
              value={form.invoiceNumberPrefix}
              onChange={(e) => setField("invoiceNumberPrefix", e.target.value)}
              placeholder="Napr. 2026"
              className="h-10 rounded-xl bg-white/[0.03]"
            />
            <p className="text-[11px] text-zinc-600">
              Ďalšia faktúra bude napr. {form.invoiceNumberPrefix || "2026"}0001.
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-400">
              Splatnosť (dní od vystavenia)
            </Label>
            <Input
              type="number"
              min={0}
              value={form.defaultDueDays}
              onChange={(e) =>
                setField("defaultDueDays", Number(e.target.value) || 0)
              }
              className="h-10 rounded-xl bg-white/[0.03]"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end border-t border-white/5 pt-5">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="gap-1.5 rounded-full"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Uložiť fakturačné údaje
        </Button>
      </div>
    </div>
  );
}
