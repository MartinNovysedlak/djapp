"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { getFilledSocialLinks } from "@/lib/verification";
import { getArtistPlanBadge } from "@/lib/dj-display";
import { getVideoEmbedUrl, isDirectVideoFile } from "@/lib/video";

type ProfileLike = {
  id: string;
  full_name?: string | null;
  real_first_name?: string | null;
  real_last_name?: string | null;
  phone?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  gallery_urls?: string[] | null;
  video_urls?: string[] | null;
  public_slug?: string | null;
  artist_kind?: string | null;
  social_links?: Record<string, string> | null;
  bio?: string | null;
  plan_type?: string | null;
  trial_ends_at?: string | null;
  premium_until?: string | null;
  is_verified?: boolean | null;
  verified_at?: string | null;
  created_at?: string | null;
  google_maps_url?: string | null;
  show_real_name?: boolean | null;
};

type BillingLike = {
  legal_name?: string | null;
  street_address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  ico?: string | null;
  dic?: string | null;
  registration_note?: string | null;
} | null;

export type AdminBookingRow = {
  id: string;
  event_date: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  event_type?: string | null;
  event_location?: string | null;
  status?: string | null;
  type?: string | null;
  title?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  price?: number | null;
  created_at?: string | null;
};

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-1.5 last:border-0">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="break-words text-right text-zinc-200">
        {value?.trim() || "—"}
      </dd>
    </div>
  );
}

function bookingLabel(b: AdminBookingRow) {
  if (b.type === "blockout") return b.title || "Blokovaný termín";
  return b.title || b.event_type || b.client_name || "Akcia";
}

export function AdminDjProfilePanel({
  profile,
  permanentAddress,
  billing,
  email,
  bookings = [],
}: {
  profile: ProfileLike;
  permanentAddress?: string | null;
  billing?: BillingLike;
  email?: string | null;
  bookings?: AdminBookingRow[];
}) {
  const gallery = Array.isArray(profile.gallery_urls)
    ? profile.gallery_urls.filter(Boolean)
    : [];
  const videos = Array.isArray(profile.video_urls)
    ? profile.video_urls.filter(Boolean)
    : [];
  const social = getFilledSocialLinks(
    profile.social_links && typeof profile.social_links === "object"
      ? profile.social_links
      : null
  );

  const today = new Date().toISOString().slice(0, 10);
  const past = bookings.filter(
    (b) => b.event_date && b.event_date < today && b.type !== "blockout"
  );
  const upcoming = bookings.filter(
    (b) => b.event_date && b.event_date >= today && b.type !== "blockout"
  );
  const blockouts = bookings.filter((b) => b.type === "blockout");

  return (
    <div className="space-y-5">
      {profile.cover_url ? (
        <div className="relative h-36 overflow-hidden rounded-3xl border border-white/10 md:h-44">
          <Image
            src={profile.cover_url}
            alt="Titulná fotka"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-white/10">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-white/5 text-xs text-zinc-500">
              Bez fotky
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-white">
              {profile.full_name || "Bez mena"}
            </h2>
            {profile.is_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-300">
                <BadgeCheck className="size-3.5" />
                Overený
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-400">
                Neoverený
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-zinc-400">
              {getArtistPlanBadge(
                profile.plan_type || "free",
                profile.artist_kind,
                {
                  trial_ends_at: profile.trial_ends_at,
                  premium_until: profile.premium_until,
                }
              )}
            </span>
          </div>
          {profile.public_slug ? (
            <Link
              href={`/djs/${profile.public_slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm text-violet-300 hover:underline"
            >
              Verejný profil
              <ExternalLink className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-card/60 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Identita</h3>
          <dl className="space-y-1 text-sm">
            <Row label="Email" value={email} />
            <Row label="Umelecké meno" value={profile.full_name} />
            <Row
              label="Skutočné meno"
              value={`${profile.real_first_name || ""} ${profile.real_last_name || ""}`.trim()}
            />
            <Row
              label="Verejné skutočné meno"
              value={profile.show_real_name ? "Áno" : "Nie"}
            />
            <Row label="Telefón" value={profile.phone} />
            <Row label="Typ" value={profile.artist_kind} />
            <Row label="Lokalita" value={profile.location} />
            <Row label="Trvalé bydlisko (súkromné)" value={permanentAddress} />
            <Row
              label="Overené"
              value={
                profile.verified_at
                  ? new Date(profile.verified_at).toLocaleString("sk-SK")
                  : profile.is_verified
                    ? "Áno"
                    : "Nie"
              }
            />
          </dl>
        </section>

        <section className="rounded-3xl border border-white/10 bg-card/60 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Sociálne siete
          </h3>
          {social.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {social.map((item) => (
                <li key={item.key} className="flex justify-between gap-3">
                  <span className="capitalize text-zinc-500">{item.key}</span>
                  <a
                    href={
                      item.url.startsWith("http")
                        ? item.url
                        : `https://${item.url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-right text-violet-300 hover:underline"
                  >
                    {item.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Bez odkazov.</p>
          )}
        </section>
      </div>

      {profile.bio ? (
        <section className="rounded-3xl border border-white/10 bg-card/60 p-5">
          <h3 className="mb-2 text-sm font-semibold text-white">Bio</h3>
          <p className="whitespace-pre-wrap text-sm text-zinc-300">
            {profile.bio}
          </p>
        </section>
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-card/60 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Kalendár a akcie
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <BookingList title={`Nadchádzajúce (${upcoming.length})`} items={upcoming} />
          <BookingList title={`Minulé (${past.length})`} items={past} />
          <BookingList title={`Blokované (${blockouts.length})`} items={blockouts} />
        </div>
        {bookings.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Žiadne záznamy v kalendári.</p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-white/10 bg-card/60 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Galéria ({gallery.length})
        </h3>
        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {gallery.map((url) => (
              <div
                key={url}
                className="relative aspect-square overflow-hidden rounded-2xl border border-white/10"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Bez fotiek.</p>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-card/60 p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Videá ({videos.length})
        </h3>
        {videos.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {videos.map((url) => {
              const embed = getVideoEmbedUrl(url);
              return (
                <div key={url} className="space-y-2">
                  {embed ? (
                    <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
                      <iframe
                        src={embed}
                        title="Video"
                        className="size-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : isDirectVideoFile(url) ? (
                    <video
                      src={url}
                      controls
                      className="aspect-video w-full rounded-2xl border border-white/10 bg-black"
                    />
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm text-violet-300 hover:underline"
                    >
                      {url}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Bez videí.</p>
        )}
      </section>

      {billing ? (
        <section className="rounded-3xl border border-white/10 bg-card/60 p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Fakturačné údaje
          </h3>
          <dl className="space-y-1 text-sm">
            <Row label="Obchodné meno" value={billing.legal_name} />
            <Row label="Ulica" value={billing.street_address} />
            <Row
              label="Mesto / PSČ"
              value={`${billing.city || ""} ${billing.postal_code || ""}`.trim()}
            />
            <Row label="IČO" value={billing.ico} />
            <Row label="DIČ" value={billing.dic} />
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function BookingList({
  title,
  items,
}: {
  title: string;
  items: AdminBookingRow[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-600">—</p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {items.slice(0, 25).map((b) => (
            <li
              key={b.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
            >
              <p className="font-medium text-zinc-200">{bookingLabel(b)}</p>
              <p className="text-[11px] text-zinc-500">
                {b.event_date}
                {b.start_time ? ` · ${b.start_time}` : ""}
                {b.status ? ` · ${b.status}` : ""}
              </p>
              {b.event_location ? (
                <p className="truncate text-[11px] text-zinc-600">
                  {b.event_location}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
