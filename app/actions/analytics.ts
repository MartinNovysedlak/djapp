"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";

export type FuzzySongStat = {
  display_title: string;
  display_artist: string;
  request_count: number;
  cluster_key: string;
};

export type BookingActivityStats = {
  accepted_total: number;
  pending_total: number;
  this_week: number;
  this_month: number;
  next_30_days: number;
  live_requests_total: number;
  planner_songs_total: number;
  by_month: { month: string; count: number }[];
};

export type DjAnalyticsBundle = {
  mustPlay: FuzzySongStat[];
  blacklist: FuzzySongStat[];
  live: FuzzySongStat[];
  activity: BookingActivityStats;
};

async function requireDj() {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false as const, error: "Musíš byť prihlásený." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role === "client") {
    return { ok: false as const, error: "Analytika je len pre účinkujúcich." };
  }

  return { ok: true as const, supabase };
}

function mapFuzzyRows(data: unknown): FuzzySongStat[] {
  if (!Array.isArray(data)) return [];
  return data.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      display_title: String(r.display_title ?? "—"),
      display_artist: String(r.display_artist ?? "—"),
      request_count: Number(r.request_count ?? 0),
      cluster_key: String(r.cluster_key ?? ""),
    };
  });
}

export async function getDjAnalytics(): Promise<
  { ok: true; data: DjAnalyticsBundle } | { ok: false; error: string }
> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const [mustPlay, blacklist, live, activity] = await Promise.all([
    auth.supabase.rpc("dj_fuzzy_song_top", {
      p_source: "must_play",
      p_limit: 10,
      p_threshold: 0.65,
    }),
    auth.supabase.rpc("dj_fuzzy_song_top", {
      p_source: "do_not_play",
      p_limit: 10,
      p_threshold: 0.65,
    }),
    auth.supabase.rpc("dj_fuzzy_song_top", {
      p_source: "live",
      p_limit: 10,
      p_threshold: 0.65,
    }),
    auth.supabase.rpc("dj_booking_activity_stats"),
  ]);

  if (mustPlay.error || blacklist.error || live.error || activity.error) {
    console.error("[getDjAnalytics]", {
      mustPlay: mustPlay.error,
      blacklist: blacklist.error,
      live: live.error,
      activity: activity.error,
    });
    return { ok: false, error: "Štatistiky sa nepodarilo načítať." };
  }

  const raw = (activity.data ?? {}) as Record<string, unknown>;
  const byMonthRaw = Array.isArray(raw.by_month) ? raw.by_month : [];

  return {
    ok: true,
    data: {
      mustPlay: mapFuzzyRows(mustPlay.data),
      blacklist: mapFuzzyRows(blacklist.data),
      live: mapFuzzyRows(live.data),
      activity: {
        accepted_total: Number(raw.accepted_total ?? 0),
        pending_total: Number(raw.pending_total ?? 0),
        this_week: Number(raw.this_week ?? 0),
        this_month: Number(raw.this_month ?? 0),
        next_30_days: Number(raw.next_30_days ?? 0),
        live_requests_total: Number(raw.live_requests_total ?? 0),
        planner_songs_total: Number(raw.planner_songs_total ?? 0),
        by_month: byMonthRaw.map((row) => {
          const r = row as Record<string, unknown>;
          return {
            month: String(r.month ?? ""),
            count: Number(r.count ?? 0),
          };
        }),
      },
    },
  };
}
