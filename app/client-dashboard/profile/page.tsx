"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Building2,
  Camera,
  Loader2,
  Save,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AvatarCropperDialog from "@/components/AvatarCropperDialog";
import { useClientUser } from "@/components/ClientUserContext";
import { useToast } from "@/lib/toast-context";
import {
  getClientProfile,
  saveClientBilling,
  updateClientProfile,
  type SaveClientBillingInput,
} from "@/app/actions/client-profile";

const EMPTY_BILLING: SaveClientBillingInput = {
  personType: "individual",
  legalName: "",
  streetAddress: "",
  city: "",
  postalCode: "",
  country: "Slovensko",
  ico: "",
  dic: "",
  icDph: "",
  isVatPayer: false,
  companyNote: "",
};

export default function ClientProfilePage() {
  const { user, loading: userLoading, setProfile } = useClientUser();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [realFirstName, setRealFirstName] = useState("");
  const [realLastName, setRealLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [billing, setBilling] = useState<SaveClientBillingInput>(EMPTY_BILLING);

  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await getClientProfile();
      if (!result.ok) {
        showToast(result.error, "error");
        setLoading(false);
        return;
      }
      setFullName(result.profile.fullName ?? "");
      setRealFirstName(result.profile.realFirstName ?? "");
      setRealLastName(result.profile.realLastName ?? "");
      setPhone(result.profile.phone ?? "");
      setEmail(result.profile.email ?? "");
      setAvatarPreview(result.profile.avatarUrl);
      if (result.billing) {
        setBilling({
          personType: result.billing.person_type ?? "individual",
          legalName: result.billing.legal_name ?? "",
          streetAddress: result.billing.street_address ?? "",
          city: result.billing.city ?? "",
          postalCode: result.billing.postal_code ?? "",
          country: result.billing.country ?? "Slovensko",
          ico: result.billing.ico ?? "",
          dic: result.billing.dic ?? "",
          icDph: result.billing.ic_dph ?? "",
          isVatPayer: result.billing.is_vat_payer,
          companyNote: result.billing.company_note ?? "",
        });
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setBillingField<K extends keyof SaveClientBillingInput>(
    key: K,
    value: SaveClientBillingInput[K]
  ) {
    setBilling((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const result = await updateClientProfile({
        fullName,
        realFirstName,
        realLastName,
        phone,
        avatarUrl: avatarPreview,
      });
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName.trim() || null,
              avatar_url: avatarPreview,
            }
          : prev
      );
      showToast("Profil uložený.", "success");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveBilling(e: React.FormEvent) {
    e.preventDefault();
    setSavingBilling(true);
    try {
      const result = await saveClientBilling(billing);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      showToast("Fakturačné údaje uložené.", "success");
    } finally {
      setSavingBilling(false);
    }
  }

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingFile(file);
    setCropperOpen(true);
  }

  async function handleCropConfirm(blob: Blob) {
    if (!user) return;
    setUploading(true);
    try {
      const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", croppedFile);

      const response = await fetch("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload zlyhal");

      const publicUrl = result.url as string;
      setAvatarPreview(publicUrl);
      setProfile((prev) =>
        prev ? { ...prev, avatar_url: publicUrl } : prev
      );
      showToast("Profilová fotka nahraná.", "success");
      setCropperOpen(false);
      setPendingFile(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Neznáma chyba";
      showToast(`Chyba pri nahrávaní: ${message}`, "error");
    } finally {
      setUploading(false);
    }
  }

  if (userLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 animate-pulse pt-4">
        <div className="h-8 w-40 rounded-xl bg-white/5" />
        <div className="h-40 rounded-3xl bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-28 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Môj profil
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Osobné a fakturačné údaje pre rýchlejšie zmluvy a faktúry.
        </p>
      </div>

      <Card className="rounded-3xl border-white/8 bg-card/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Camera className="size-4 text-violet-300" />
            Profilová fotka
          </CardTitle>
          <CardDescription className="text-zinc-500">
            JPEG, PNG, WebP alebo GIF · max 5 MB · pomer 1:1
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-2 border-white/15">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10">
                  <User className="size-10 text-zinc-500" />
                </div>
              )}
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              ) : null}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onFilePicked}
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Nahrať fotku
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSaveProfile}>
        <Card className="rounded-3xl border-white/8 bg-card/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <User className="size-4 text-violet-300" />
              Osobné údaje
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Tvoje meno a kontakt, ktoré uvidia umelci pri rezervácii.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Zobrazované meno</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 rounded-xl bg-white/[0.03]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Meno</Label>
                <Input
                  value={realFirstName}
                  onChange={(e) => setRealFirstName(e.target.value)}
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Priezvisko</Label>
                <Input
                  value={realLastName}
                  onChange={(e) => setRealLastName(e.target.value)}
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Telefón</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">E-mail</Label>
                <Input
                  value={email}
                  disabled
                  className="h-10 rounded-xl bg-white/[0.03] opacity-70"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={savingProfile}
              className="gap-1.5 rounded-full"
            >
              {savingProfile ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Uložiť profil
            </Button>
          </CardContent>
        </Card>
      </form>

      <form onSubmit={handleSaveBilling}>
        <Card className="rounded-3xl border-white/8 bg-card/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Building2 className="size-4 text-violet-300" />
              Fakturačné údaje
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Používajú sa na rýchlejšie vystavenie zmlúv a faktúr. Upravuješ ich
              len ty.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => setBillingField("personType", "individual")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  billing.personType === "individual"
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Fyzická osoba
              </button>
              <button
                type="button"
                onClick={() => setBillingField("personType", "company")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  billing.personType === "company"
                    ? "bg-violet-500/20 text-violet-200"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Právnická osoba
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-zinc-400">
                  {billing.personType === "company"
                    ? "Názov firmy / odberateľa"
                    : "Meno a priezvisko"}
                </Label>
                <Input
                  value={billing.legalName}
                  onChange={(e) => setBillingField("legalName", e.target.value)}
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-zinc-400">Adresa (ulica)</Label>
                <Input
                  value={billing.streetAddress}
                  onChange={(e) =>
                    setBillingField("streetAddress", e.target.value)
                  }
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Mesto</Label>
                <Input
                  value={billing.city}
                  onChange={(e) => setBillingField("city", e.target.value)}
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">PSČ</Label>
                <Input
                  value={billing.postalCode}
                  onChange={(e) => setBillingField("postalCode", e.target.value)}
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-zinc-400">Krajina</Label>
                <Input
                  value={billing.country}
                  onChange={(e) => setBillingField("country", e.target.value)}
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
              {billing.personType === "company" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">IČO</Label>
                    <Input
                      value={billing.ico}
                      onChange={(e) => setBillingField("ico", e.target.value)}
                      className="h-10 rounded-xl bg-white/[0.03]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">DIČ</Label>
                    <Input
                      value={billing.dic}
                      onChange={(e) => setBillingField("dic", e.target.value)}
                      className="h-10 rounded-xl bg-white/[0.03]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">IČ DPH</Label>
                    <Input
                      value={billing.icDph}
                      onChange={(e) => setBillingField("icDph", e.target.value)}
                      className="h-10 rounded-xl bg-white/[0.03]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 sm:col-span-2">
                    <Label className="text-sm text-zinc-300">
                      Som platiteľ DPH
                    </Label>
                    <Switch
                      checked={billing.isVatPayer}
                      onCheckedChange={(v) => setBillingField("isVatPayer", v)}
                    />
                  </div>
                </>
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-zinc-400">Poznámka</Label>
                <Input
                  value={billing.companyNote}
                  onChange={(e) =>
                    setBillingField("companyNote", e.target.value)
                  }
                  className="h-10 rounded-xl bg-white/[0.03]"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={savingBilling}
              className="gap-1.5 rounded-full"
            >
              {savingBilling ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Uložiť fakturačné údaje
            </Button>
          </CardContent>
        </Card>
      </form>

      <AvatarCropperDialog
        open={cropperOpen}
        onOpenChange={setCropperOpen}
        file={pendingFile}
        onConfirm={handleCropConfirm}
        confirming={uploading}
      />
    </div>
  );
}
