"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Loader2,
  Save,
  User,
  Link as LinkIcon,
  MapPin,
  FileText,
  Camera,
  Upload,
  Music,
  Images,
  Video,
  Plus,
  X,
  Play,
  Phone,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  Receipt,
  Megaphone,
  Lock,
  ImageIcon,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/toast-context";
import Image from "next/image";
import { Reveal } from "@/components/motion";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { getPublicDjDisplayPath, getPublicDjUrl } from "@/lib/site-url";
import AvatarCropperDialog from "@/components/AvatarCropperDialog";
import { useDashboardUser } from "@/components/DashboardUserContext";
import {
  COUNTRIES,
  formatLocation,
  getCitiesForCountry,
  parseLocation,
  type Country,
} from "@/lib/locations";
import { getVideoEmbedUrl, isDirectVideoFile, isValidUrl } from "@/lib/video";
import {
  GOOGLE_MAPS_URL_ERROR,
  isValidGoogleMapsUrl,
} from "@/lib/google-maps";
import { updateDjProfile } from "@/app/actions/profile";
import { getMyPermanentAddress } from "@/app/actions/verification";
import {
  formatPremiumPrice,
  getPlanDisplayName,
  getTrialDaysLeft,
  hasPremiumAccess,
  isTrialActive,
  PREMIUM_PRICE_LABEL,
  TRIAL_DAYS,
} from "@/lib/plans";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";
import { VerificationRequestSection } from "@/components/verification/VerificationRequestSection";
import { BillingProfileForm } from "@/components/invoices/BillingProfileForm";
import { cn } from "@/lib/utils";
import {
  ARTIST_KIND_OPTIONS,
  getArtistNameFieldHint,
  getArtistNameFieldLabel,
  normalizeArtistKind,
  type ArtistKind,
} from "@/lib/dj-display";

const MAX_GALLERY_PHOTOS = 12;
const MAX_VIDEOS = 6;

export default function ProfilePage() {
  const { showToast } = useToast();
  const { user, profile, loading, setProfile } = useDashboardUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [realFirstName, setRealFirstName] = useState("");
  const [realLastName, setRealLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [showRealName, setShowRealName] = useState(false);
  const [artistKind, setArtistKind] = useState<ArtistKind>("dj");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState<Country>("SK");
  const [cityName, setCityName] = useState<string | null>(null);
  const [publicSlug, setPublicSlug] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [soundcloudUrl, setSoundcloudUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [slugCopied, setSlugCopied] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [permanentAddress, setPermanentAddress] = useState("");

  const cityOptions: ComboboxOption[] = getCitiesForCountry(country).map((c) => ({
    value: c.name,
    label: c.name,
    hint: c.region,
  }));

  // Initialize form fields from the shared context profile — no extra
  // network fetch needed, the layout already loaded it once.
  useEffect(() => {
    if (initializedRef.current || !profile) return;
    initializedRef.current = true;

    setFullName(profile.full_name ?? "");
    setRealFirstName(profile.real_first_name ?? "");
    setRealLastName(profile.real_last_name ?? "");
    setPhone(profile.phone ?? "");
    setShowRealName(Boolean(profile.show_real_name));
    setArtistKind(normalizeArtistKind(profile.artist_kind));
    setBio(profile.bio ?? "");
    const parsedLocation = parseLocation(profile.location);
    setCountry(parsedLocation.country);
    setCityName(parsedLocation.city);
    setPublicSlug(profile.public_slug ?? "");
    setAvatarPreview(profile.avatar_url);
    setCoverPreview(profile.cover_url ?? null);
    setGalleryUrls(Array.isArray(profile.gallery_urls) ? profile.gallery_urls : []);
    setVideoUrls(Array.isArray(profile.video_urls) ? profile.video_urls : []);

    const links = profile.social_links || {};
    setInstagramUrl(links.instagram || "");
    setSoundcloudUrl(links.soundcloud || "");
    setYoutubeUrl(links.youtube || "");
    setWebsiteUrl(links.website || "");
    setGoogleMapsUrl(profile.google_maps_url || "");
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getMyPermanentAddress();
      if (cancelled || !result.ok) return;
      setPermanentAddress(result.permanentAddress);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  // ── Avatar upload ────────────────────────────────────────────────────────
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      showToast("Povolené sú len obrázky (JPEG, PNG, WebP, GIF)", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Maximálna veľkosť obrázku je 5 MB", "error");
      return;
    }

    setPendingFile(file);
    setCropperOpen(true);
  };

  const handleCropConfirm = async (blob: Blob) => {
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
      if (!response.ok) throw new Error(result.error || "Upload failed");

      const publicUrl = result.url;
      setAvatarPreview(publicUrl);

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: publicUrl });

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      showToast("Profilová fotka nahraná", "success");
      setCropperOpen(false);
      setPendingFile(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Neznáma chyba";
      console.error("Upload error:", err);
      showToast(`Chyba pri nahrávaní: ${message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      showToast("Povolené sú len obrázky (JPEG, PNG, WebP, GIF)", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast("Maximálna veľkosť titulnej fotky je 8 MB", "error");
      return;
    }

    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload-cover", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");

      setCoverPreview(result.url);
      setProfile((prev) => (prev ? { ...prev, cover_url: result.url } : prev));
      showToast("Titulná fotka nahraná", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Neznáma chyba";
      showToast(`Chyba pri nahrávaní: ${message}`, "error");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverRemove = async () => {
    if (!user) return;
    setCoverUploading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ cover_url: null })
        .eq("id", user.id);
      if (error) throw error;
      setCoverPreview(null);
      setProfile((prev) => (prev ? { ...prev, cover_url: null } : prev));
      showToast("Titulná fotka odstránená", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Neznáma chyba";
      showToast(`Chyba: ${message}`, "error");
    } finally {
      setCoverUploading(false);
    }
  };

  // ── Gallery photos ───────────────────────────────────────────────────────
  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !user) return;

    if (galleryUrls.length + files.length > MAX_GALLERY_PHOTOS) {
      showToast(`Galéria môže mať max ${MAX_GALLERY_PHOTOS} fotiek`, "error");
      return;
    }

    setGalleryUploading(true);
    try {
      const formData = new FormData();
      formData.append("userId", user.id);
      files.forEach((f) => formData.append("files", f));

      const response = await fetch("/api/upload-media", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");

      setGalleryUrls((prev) => [...prev, ...result.urls]);
      showToast(
        result.urls.length > 1
          ? `${result.urls.length} fotky nahrané`
          : "Fotka nahraná",
        "success"
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Neznáma chyba";
      showToast(`Chyba pri nahrávaní: ${message}`, "error");
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleRemoveGalleryPhoto = async (url: string) => {
    setGalleryUrls((prev) => prev.filter((u) => u !== url));
    if (!user) return;
    try {
      await fetch("/api/upload-media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, userId: user.id }),
      });
    } catch {
      // Best-effort cleanup — the reference is already removed from the form.
    }
  };

  // ── Videos ───────────────────────────────────────────────────────────────
  const addVideoField = () => {
    if (videoUrls.length >= MAX_VIDEOS) {
      showToast(`Môžeš pridať max ${MAX_VIDEOS} videí`, "error");
      return;
    }
    setVideoUrls((prev) => [...prev, ""]);
  };

  const updateVideoField = (index: number, value: string) => {
    setVideoUrls((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const removeVideoField = async (index: number) => {
    const url = videoUrls[index];
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
    if (!user || !url || !isDirectVideoFile(url)) return;
    try {
      await fetch("/api/upload-video", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, userId: user.id }),
      });
    } catch {
      // Best-effort cleanup
    }
  };

  const handleVideoFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (videoUrls.filter(Boolean).length >= MAX_VIDEOS) {
      showToast(`Môžeš pridať max ${MAX_VIDEOS} videí`, "error");
      return;
    }

    setVideoUploading(true);
    try {
      const formData = new FormData();
      formData.append("userId", user.id);
      formData.append("file", file);

      const response = await fetch("/api/upload-video", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");

      setVideoUrls((prev) => [...prev.filter(Boolean), result.url].slice(0, MAX_VIDEOS));
      showToast("Video nahrané", "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Neznáma chyba";
      showToast(`Chyba pri nahrávaní videa: ${message}`, "error");
    } finally {
      setVideoUploading(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const mapsUrlInvalid =
    googleMapsUrl.trim().length > 0 && !isValidGoogleMapsUrl(googleMapsUrl);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || mapsUrlInvalid) return;

    const invalidVideo = videoUrls.find((v) => v.trim() && !isValidUrl(v.trim()));
    if (invalidVideo) {
      showToast("Jeden z video odkazov nie je platná URL adresa.", "error");
      return;
    }

    if (websiteUrl.trim() && !isValidUrl(websiteUrl.trim())) {
      showToast("Odkaz na web stránku nie je platná URL adresa.", "error");
      return;
    }

    setSaving(true);

    const socialLinks: Record<string, string> = {};
    if (instagramUrl) socialLinks.instagram = instagramUrl;
    if (soundcloudUrl) socialLinks.soundcloud = soundcloudUrl;
    if (youtubeUrl) socialLinks.youtube = youtubeUrl;
    if (websiteUrl.trim()) socialLinks.website = websiteUrl.trim();

    const location = cityName ? formatLocation(cityName, country) : null;
    const cleanVideoUrls = videoUrls.map((v) => v.trim()).filter(Boolean);

    const result = await updateDjProfile({
      fullName,
      realFirstName,
      realLastName,
      phone,
      showRealName,
      artistKind,
      bio,
      location,
      permanentAddress,
      googleMapsUrl,
      socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      galleryUrls: galleryUrls,
      videoUrls: cleanVideoUrls,
    });

    if (!result.ok) {
      showToast(result.error ?? "Profil sa nepodarilo uložiť.", "error");
    } else {
      showToast("Profil bol úspešne uložený", "success");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: fullName,
              real_first_name: realFirstName.trim() || null,
              real_last_name: realLastName.trim() || null,
              phone: phone.trim() || null,
              show_real_name: showRealName,
              artist_kind: artistKind,
              bio,
              location,
              public_slug: publicSlug,
              google_maps_url: result.googleMapsUrl ?? null,
              social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
              gallery_urls: galleryUrls,
              video_urls: cleanVideoUrls,
              updated_at: new Date().toISOString(),
            }
          : prev
      );
      setVideoUrls(cleanVideoUrls);
      setGoogleMapsUrl(result.googleMapsUrl ?? "");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Page header */}
      <Reveal>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">Môj profil</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Verejná vizitka, ktorú uvidia klienti pri rezervácii.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/invoices/billing"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200"
            >
              <Receipt className="size-3.5" />
              Fakturačné údaje
            </Link>
            <Link
              href="/dashboard/settings/marketing"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-fuchsia-500/30 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
            >
              <Megaphone className="size-3.5" />
              Marketing
            </Link>
          </div>
        </div>
      </Reveal>

      <form onSubmit={handleSave} className="space-y-6 pb-28">
        {/* Cover + avatar */}
        <Reveal delay={60}>
        <Card
          id="verification-avatar"
          className="card-lift scroll-mt-28 overflow-hidden rounded-3xl border-white/8 bg-card/70 backdrop-blur-md"
        >
          <div className="relative h-36 bg-gradient-to-br from-violet-600/40 via-fuchsia-600/20 to-background md:h-44">
            {coverPreview ? (
              <Image
                src={coverPreview}
                alt="Titulná fotka"
                fill
                className="object-cover"
                unoptimized
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute bottom-3 right-3 flex gap-2">
              {coverPreview ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={coverUploading}
                  onClick={() => void handleCoverRemove()}
                  className="rounded-full border-white/20 bg-black/50 text-white backdrop-blur-md hover:bg-black/70"
                >
                  <X className="size-4" />
                  Odstrániť
                </Button>
              ) : null}
              <label className="inline-flex cursor-pointer">
                <span
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 text-sm text-white backdrop-blur-md hover:bg-black/70",
                    coverUploading && "pointer-events-none opacity-50"
                  )}
                >
                  {coverUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                  Titulná fotka
                </span>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={coverUploading}
                  onChange={handleCoverSelect}
                />
              </label>
            </div>
          </div>
          <CardHeader className="pt-4">
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Camera className="size-4 text-primary" />
              Profilová fotka
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Titulná fotka je banner hore na verejnom profile. Profilovka je kruhový
              avatar (max 5 MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-2 border-border/50">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="Avatar" fill className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                    <User className="size-10 text-muted-foreground/50" />
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="inline-flex w-fit cursor-pointer">
                  <span
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      uploading && "pointer-events-none opacity-50"
                    )}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Nahrávam…
                      </>
                    ) : (
                      <>
                        <Upload className="size-4" />
                        Nahrať profilovku
                      </>
                    )}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploading}
                    onChange={handleAvatarSelect}
                  />
                </label>
                <p className="text-xs text-muted-foreground/60">
                  Odporúčaný pomer 1:1
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </Reveal>

        {/* Main profile card */}
        <Reveal delay={140}>
        <Card className="card-lift rounded-3xl border-white/8 bg-card/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <User className="size-4 text-primary" />
              Základné informácie
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Tvoje meno a popis sa zobrazia na verejnej stránke.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Typ umelca</p>
              <div className="grid grid-cols-3 gap-2">
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
            </div>

            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm text-muted-foreground">
                {getArtistNameFieldLabel(artistKind)}
                {getArtistNameFieldHint(artistKind) ? (
                  <span className="ml-1 text-zinc-600">
                    ({getArtistNameFieldHint(artistKind)})
                  </span>
                ) : null}
              </label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={
                  artistKind === "band"
                    ? "The Vibes"
                    : artistKind === "dj_band"
                      ? "Nova Collective"
                      : "DJ Nova"
                }
              />
            </div>

            <div id="verification-identity" className="grid scroll-mt-28 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="realFirstName" className="text-sm text-muted-foreground">
                  Krstné meno
                </label>
                <Input
                  id="realFirstName"
                  value={realFirstName}
                  onChange={(e) => setRealFirstName(e.target.value)}
                  placeholder="Ján"
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="realLastName" className="text-sm text-muted-foreground">
                  Priezvisko
                </label>
                <Input
                  id="realLastName"
                  value={realLastName}
                  onChange={(e) => setRealLastName(e.target.value)}
                  placeholder="Novák"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm text-muted-foreground">
                Telefónne číslo
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+421 900 123 456"
                  autoComplete="tel"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground/60">
                Telefón nie je verejný — slúži len na internú komunikáciu.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  {showRealName ? (
                    <Eye className="size-4 text-violet-300" />
                  ) : (
                    <EyeOff className="size-4 text-zinc-500" />
                  )}
                  Zobraziť skutočné meno na verejnom profile
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
                  Keď je zapnuté, vedľa umeleckého mena sa na katalógu a profile
                  zobrazí aj tvoje krstné meno a priezvisko.
                </p>
              </div>
              <Switch
                checked={showRealName}
                onCheckedChange={setShowRealName}
                aria-label="Zobraziť skutočné meno verejne"
              />
            </div>

            {/* Location */}
            <div id="verification-location" className="space-y-2 scroll-mt-28">
              <label className="text-sm text-muted-foreground">Lokalita</label>
              <div className="grid grid-cols-[auto_1fr] gap-2 sm:grid-cols-[minmax(0,9rem)_1fr]">
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
                          ? "bg-primary/15 text-primary"
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
                  placeholder="Vyber mesto alebo napíš miesto…"
                  searchPlaceholder="Hľadať mesto, dedinku, hotel…"
                  emptyText="Nič sa nenašlo — napíš vlastné miesto."
                  icon={<MapPin className="size-4" />}
                  creatable
                  createLabel={(q) => `Použiť „${q}“ ako moje miesto`}
                />
              </div>
              <p className="text-xs text-muted-foreground/60">
                {cityName
                  ? formatLocation(cityName, country)
                  : "Vyber mesto zo zoznamu, alebo napíš konkrétnu dedinku či miesto."}
              </p>
            </div>

            <div
              id="verification-residence"
              className="scroll-mt-28 space-y-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4"
            >
              <label
                htmlFor="permanentAddress"
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Lock className="size-3.5 text-zinc-500" />
                Trvalé bydlisko
              </label>
              <Input
                id="permanentAddress"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
                placeholder="Ulica, číslo, mesto, PSČ"
                autoComplete="street-address"
              />
              <p className="text-xs text-zinc-500">
                Súkromné — nezobrazuje sa na verejnom profile. Slúži len na
                overenie adminom.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm text-muted-foreground">
                Bio / Popis
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Stručne o sebe – štýl, skúsenosti, čo ponúkaš…"
                rows={4}
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base text-foreground placeholder:text-muted-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="publicSlug" className="text-sm text-muted-foreground">
                Verejné URL pre zdieľanie tvojho profilu
              </label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <LinkIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
                  <Input
                    id="publicSlug"
                    value={
                      publicSlug
                        ? getPublicDjDisplayPath(publicSlug)
                        : "Profil ešte nemá verejný odkaz"
                    }
                    readOnly
                    disabled
                    className="pl-9 text-zinc-400"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!publicSlug}
                  className="shrink-0 rounded-[0.75rem]"
                  aria-label="Skopírovať odkaz"
                  onClick={async () => {
                    if (!publicSlug) return;
                    const full = getPublicDjUrl(publicSlug);
                    try {
                      await navigator.clipboard.writeText(full);
                      setSlugCopied(true);
                      showToast("Odkaz skopírovaný", "success");
                      setTimeout(() => setSlugCopied(false), 2000);
                    } catch {
                      showToast("Kopírovanie zlyhalo", "error");
                    }
                  }}
                >
                  {slugCopied ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                Vlastnú landing page nastavíš v{" "}
                <Link
                  href="/dashboard/page-builder"
                  className="text-violet-300 hover:underline"
                >
                  Moja stránka
                </Link>{" "}
                (/djs/{publicSlug || "…"}).
              </p>
              <p className="text-xs text-muted-foreground/60">
                Odkaz nie je možné zmeniť — môžeš ho len skopírovať a zdieľať.
              </p>
            </div>
          </CardContent>
        </Card>
        </Reveal>

        {/* Gallery: photos + videos */}
        <Reveal delay={190}>
        <Card
          id="verification-photos"
          className="card-lift scroll-mt-28 rounded-3xl border-white/8 bg-card/70 backdrop-blur-md"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Images className="size-4 text-primary" />
              Galéria fotiek a videí
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Ukáž klientom svoje akcie — fotky z eventov a videá s tvojím
              vystúpením sa zobrazia priamo na verejnom profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Fotky{" "}
                  <span className="text-muted-foreground/60">
                    ({galleryUrls.length}/{MAX_GALLERY_PHOTOS})
                  </span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={galleryUploading || galleryUrls.length >= MAX_GALLERY_PHOTOS}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  {galleryUploading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Nahrávam…
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      Pridať fotky
                    </>
                  )}
                </Button>
                <input
                  ref={galleryInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleGallerySelect}
                />
              </div>

              {galleryUrls.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {galleryUrls.map((url) => (
                    <div
                      key={url}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30"
                    >
                      <Image
                        src={url}
                        alt="Galéria"
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryPhoto(url)}
                        className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-muted-foreground/60">
                  Zatiaľ žiadne fotky z akcií. Pridaj pár záberov, nech ťa
                  klienti vidia v akcii.
                </p>
              )}
            </div>

            {/* Videos */}
            <div className="space-y-3 border-t border-white/5 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                  Videá{" "}
                  <span className="text-muted-foreground/60">
                    ({videoUrls.filter(Boolean).length}/{MAX_VIDEOS})
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      videoUploading ||
                      videoUrls.filter(Boolean).length >= MAX_VIDEOS
                    }
                    onClick={() => videoInputRef.current?.click()}
                  >
                    {videoUploading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Nahrávam…
                      </>
                    ) : (
                      <>
                        <Upload className="size-3.5" />
                        Nahrať video
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={videoUrls.length >= MAX_VIDEOS}
                    onClick={addVideoField}
                  >
                    <Plus className="size-3.5" />
                    Pridať odkaz
                  </Button>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleVideoFileSelect}
                  />
                </div>
              </div>

              {videoUrls.length > 0 ? (
                <div className="space-y-3">
                  {videoUrls.map((url, i) => {
                    const embed = url.trim() ? getVideoEmbedUrl(url.trim()) : null;
                    const isFile = url.trim() ? isDirectVideoFile(url.trim()) : false;
                    return (
                      <div
                        key={i}
                        className="space-y-2 rounded-[0.75rem] border border-white/8 bg-black/20 p-3"
                      >
                        {isFile ? (
                          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                            <video
                              src={url}
                              controls
                              playsInline
                              preload="metadata"
                              className="absolute inset-0 size-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <Video className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                              <Input
                                value={url}
                                onChange={(e) =>
                                  updateVideoField(i, e.target.value)
                                }
                                placeholder="youtube.com/watch?v=… alebo vimeo.com/…"
                                className="pl-9"
                              />
                            </div>
                            {embed && (
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                                <Play className="size-3.5" />
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-zinc-500">
                            {isFile
                              ? "Nahrané video (MP4 / WebM / MOV)"
                              : "Odkaz na YouTube / Vimeo"}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeVideoField(i)}
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-muted-foreground/60">
                  Nahraj video súbor (max 50 MB) alebo vlož odkaz na YouTube /
                  Vimeo.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </Reveal>

        {/* Social links card */}
        <Reveal delay={230}>
        <Card
          id="verification-social"
          className="card-lift scroll-mt-28 rounded-3xl border-white/8 bg-card/70 backdrop-blur-md"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <Music className="size-4 text-primary" />
              Siete a Hudba
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Pridaj odkazy na svoje profily na sociálnych sieťach a hudobných platformách.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="instagram" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <svg className="size-4 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
                Instagram
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/40">
                  @
                </span>
                <Input
                  id="instagram"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="instagram.com/tvojprofil"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="soundcloud" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Music className="size-4 text-orange-400" />
                SoundCloud
              </label>
              <Input
                id="soundcloud"
                value={soundcloudUrl}
                onChange={(e) => setSoundcloudUrl(e.target.value)}
                placeholder="soundcloud.com/tvojprofil"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="youtube" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <svg className="size-4 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                  <path d="m10 15 5-3-5-3z" />
                </svg>
                YouTube
              </label>
              <Input
                id="youtube"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="youtube.com/@tvojkanal"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="websiteUrl"
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Globe className="size-4 text-sky-400" />
                Vlastná web stránka
              </label>
              <Input
                id="websiteUrl"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.tvoja-stranka.sk"
              />
              <p className="text-xs text-muted-foreground/60">
                Na verejnom profile sa zobrazí hore ako tlačidlo „Web stránka“.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="googleMapsUrl"
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <MapPin className="size-4 text-emerald-400" />
                Link na Google Maps
              </label>
              <Input
                id="googleMapsUrl"
                type="url"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/… alebo https://www.google.com/maps/…"
                aria-invalid={mapsUrlInvalid}
                className={cn(
                  mapsUrlInvalid &&
                    "border-red-500/50 focus-visible:border-red-500 focus-visible:ring-red-500/30"
                )}
              />
              {mapsUrlInvalid ? (
                <p className="text-xs text-red-400">{GOOGLE_MAPS_URL_ERROR}</p>
              ) : (
                <p className="text-xs text-muted-foreground/60">
                  Povolené sú len odkazy začínajúce na maps.app.goo.gl alebo
                  www.google.com/maps. Na profile sa zobrazí „Recenzie na Google“.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </Reveal>

        {/* Plan info card */}
        <Reveal delay={260}>
        <Card className="card-lift rounded-3xl border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-card/70 to-card/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              <FileText className="size-4 text-primary" />
              Tvoj plán
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {getPlanDisplayName(profile)}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {hasPremiumAccess(profile)
                    ? isTrialActive(profile)
                      ? `Trial: zostáva ${getTrialDaysLeft(profile)} dní. Potom ${formatPremiumPrice()}.`
                      : "Všetky Premium funkcie odomknuté."
                    : `Free: profil a katalóg. Premium funkcie za ${formatPremiumPrice()} (prvých ${TRIAL_DAYS} dní zadarmo pri registrácii).`}
                </p>
              </div>
              {!hasPremiumAccess(profile) && (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 rounded-full border-amber-500/30 bg-amber-500/10 text-amber-400 transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-500/20"
                  onClick={() => {
                    showToast(
                      `Platba Premium (${PREMIUM_PRICE_LABEL}/mes.) pribudne čoskoro. Zatiaľ ťa môžeme aktivovať manuálne.`,
                      "info"
                    );
                  }}
                >
                  Premium {PREMIUM_PRICE_LABEL}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </Reveal>

        <Reveal delay={260}>
          <Card className="rounded-3xl border-white/8 bg-card/70 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-foreground">
                <Receipt className="size-4 text-primary" />
                Fakturačné údaje
              </CardTitle>
              <CardDescription>
                Tieto údaje používaš pri faktúrach. Ulož ich samostatne tlačidlom
                nižšie.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BillingProfileForm compact />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={280}>
          <div className="pt-2">
            <VerificationRequestSection />
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div className="pt-2">
            <DeleteAccountSection variant="dj" />
          </div>
        </Reveal>

        {/* Sticky save bar — always visible while scrolling the form */}
        <div className="sticky bottom-4 z-30 flex justify-end pt-2">
          <div className="glass flex items-center gap-3 rounded-full px-2 py-2 shadow-[0_20px_50px_-15px_oklch(0_0_0/0.7)]">
            <span className="hidden pl-3 text-xs text-zinc-400 sm:inline">
              Nezabudni uložiť zmeny
            </span>
            <Button
              type="submit"
              disabled={saving || mapsUrlInvalid}
              className="h-11 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-7 text-sm font-semibold text-white shadow-[0_12px_36px_-10px_oklch(0.6_0.26_295/0.9)] transition-all duration-300 hover:shadow-[0_12px_44px_-6px_oklch(0.6_0.26_295)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Ukladám…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Uložiť zmeny
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      <AvatarCropperDialog
        open={cropperOpen}
        onOpenChange={(next) => {
          setCropperOpen(next);
          if (!next) setPendingFile(null);
        }}
        file={pendingFile}
        onConfirm={handleCropConfirm}
        confirming={uploading}
      />
    </div>
  );
}
