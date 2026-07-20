import { ImageResponse } from "next/og";
import { createClient } from "@/utils/supabase/server";
import { getDjStageName } from "@/lib/dj-display";

export const alt = "DJ App — profil DJ-a";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ slug: string }>;
};

function starsLabel(avg: number) {
  const full = Math.round(avg);
  return "★".repeat(Math.min(5, Math.max(0, full))) + "☆".repeat(Math.max(0, 5 - full));
}

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: dj } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, location")
    .eq("public_slug", slug)
    .maybeSingle();

  const djName = getDjStageName(dj ?? { full_name: null }, "DJ");
  const location = dj?.location?.trim() || null;

  let ratingAvg = 0;
  let ratingCount = 0;
  if (dj?.id) {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("dj_id", dj.id);
    const rows = reviews ?? [];
    ratingCount = rows.length;
    if (ratingCount > 0) {
      ratingAvg =
        rows.reduce((sum, r) => sum + (r.rating as number), 0) / ratingCount;
    }
  }

  const initials = djName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Inter from Google Fonts (woff) for a clean sans look in the OG card.
  let interRegular: ArrayBuffer | undefined;
  let interBold: ArrayBuffer | undefined;
  try {
    const [reg, bold] = await Promise.all([
      fetch(
        "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.woff"
      ).then((r) => (r.ok ? r.arrayBuffer() : undefined)),
      fetch(
        "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.woff"
      ).then((r) => (r.ok ? r.arrayBuffer() : undefined)),
    ]);
    interRegular = reg;
    interBold = bold;
  } catch {
    // Fallback to system default if font fetch fails.
  }

  const fonts = [
    interRegular
      ? {
          name: "Inter",
          data: interRegular,
          style: "normal" as const,
          weight: 400 as const,
        }
      : null,
    interBold
      ? {
          name: "Inter",
          data: interBold,
          style: "normal" as const,
          weight: 700 as const,
        }
      : null,
  ].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 400 | 700;
  }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0A0A0A",
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 70% -10%, rgba(139,92,246,0.28), transparent 60%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(217,70,239,0.12), transparent 55%)",
          fontFamily: fonts.length ? "Inter" : "system-ui, sans-serif",
          color: "white",
          padding: 56,
          position: "relative",
        }}
      >
        {/* Glass card */}
        <div
          style={{
            display: "flex",
            flex: 1,
            borderRadius: 32,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.45)",
            padding: 48,
            alignItems: "center",
            gap: 48,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 28,
              border: "3px solid rgba(255,255,255,0.15)",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, rgba(139,92,246,0.55), rgba(217,70,239,0.35))",
              flexShrink: 0,
            }}
          >
            {dj?.avatar_url ? (
              <img
                src={dj.avatar_url}
                alt=""
                width={220}
                height={220}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
              />
            ) : (
              <span
                style={{
                  fontSize: 72,
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {initials}
              </span>
            )}
          </div>

          {/* Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 16,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 22,
                color: "rgba(196,181,253,0.9)",
                fontWeight: 400,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background:
                    "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(217,70,239,0.2))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                ♫
              </span>
              DJ App
            </div>

            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: "white",
              }}
            >
              {djName}
            </div>

            {location && (
              <div
                style={{
                  fontSize: 24,
                  color: "rgba(161,161,170,1)",
                  display: "flex",
                }}
              >
                📍 {location}
              </div>
            )}

            {ratingCount > 0 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginTop: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    color: "#fbbf24",
                    letterSpacing: "0.08em",
                  }}
                >
                  {starsLabel(ratingAvg)}
                </span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: "#fcd34d",
                  }}
                >
                  {ratingAvg.toFixed(1)}
                </span>
                <span style={{ fontSize: 22, color: "rgba(161,161,170,1)" }}>
                  ({ratingCount}{" "}
                  {ratingCount === 1 ? "hodnotenie" : "hodnotení"})
                </span>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 22,
                  color: "rgba(161,161,170,0.9)",
                }}
              >
                Zatiaľ bez hodnotení · Zarezervuj si termín
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 28,
            fontSize: 20,
            color: "rgba(113,113,122,1)",
          }}
        >
          <span>Event DJ · Recenzie · Rezervácie</span>
          <span>djs/{slug}</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length ? fonts : undefined,
    }
  );
}
