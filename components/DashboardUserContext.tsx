"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  clearDashboardAuthCache,
  getDashboardAuthCache,
  setDashboardAuthCache,
} from "@/lib/nav-cache";

export type DashboardProfile = {
  id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  public_slug: string | null;
  location: string | null;
  google_maps_url: string | null;
  plan_type: string;
  trial_ends_at?: string | null;
  premium_until?: string | null;
  role: "dj" | "client";
  artist_kind?: "dj" | "band" | "dj_band" | null;
  social_links: Record<string, string> | null;
  gallery_urls: string[] | null;
  video_urls: string[] | null;
  phone: string | null;
  real_first_name: string | null;
  real_last_name: string | null;
  show_real_name: boolean;
};

type DashboardUser = { id: string; email?: string };

type DashboardUserContextValue = {
  user: DashboardUser | null;
  profile: DashboardProfile | null;
  loading: boolean;
  setProfile: (
    updater:
      | DashboardProfile
      | ((prev: DashboardProfile | null) => DashboardProfile | null)
  ) => void;
  refreshProfile: () => Promise<void>;
};

const DashboardUserContext = createContext<DashboardUserContextValue | null>(
  null
);

function initialFromCache() {
  const cached = getDashboardAuthCache<DashboardProfile>();
  if (!cached) {
    return { user: null as DashboardUser | null, profile: null as DashboardProfile | null, loading: true };
  }
  return {
    user: cached.user,
    profile: cached.profile,
    loading: false,
  };
}

/**
 * Fetches the authenticated user + profile once per dashboard session.
 * Hydrates instantly from an in-memory cache so revisiting /dashboard/*
 * does not flash a full-page spinner.
 */
export function DashboardUserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const seeded = initialFromCache();
  const [user, setUser] = useState<DashboardUser | null>(seeded.user);
  const [profile, setProfileState] = useState<DashboardProfile | null>(
    seeded.profile
  );
  const [loading, setLoading] = useState(seeded.loading);

  const setProfile = useCallback(
    (
      updater:
        | DashboardProfile
        | ((prev: DashboardProfile | null) => DashboardProfile | null)
    ) => {
      setProfileState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (user && next) setDashboardAuthCache(user, next);
        return next;
      });
    },
    [user]
  );

  const loadProfile = useCallback(
    async (sessionUser: DashboardUser) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (data) {
        const loaded = data as DashboardProfile;
        setProfileState(loaded);
        setDashboardAuthCache(sessionUser, loaded);
        if (loaded.role === "client") {
          router.push("/client-dashboard");
        }
        return;
      }

      if (!error) {
        const { data: created } = await supabase
          .from("profiles")
          .upsert({ id: sessionUser.id })
          .select()
          .single();
        if (created) {
          setProfileState(created as DashboardProfile);
          setDashboardAuthCache(sessionUser, created);
        }
      }
    },
    [router]
  );

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user;
      if (!active) return;

      if (!sessionUser) {
        clearDashboardAuthCache();
        setUser(null);
        setProfileState(null);
        setLoading(false);
        router.push("/login");
        return;
      }

      const nextUser = { id: sessionUser.id, email: sessionUser.email };
      setUser(nextUser);
      await loadProfile(nextUser);
      if (active) setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        if (!session?.user) {
          clearDashboardAuthCache();
          setUser(null);
          setProfileState(null);
          router.push("/login");
          return;
        }
        setUser((prev) => {
          const next = { id: session.user.id, email: session.user.email };
          return prev?.id === next.id && prev?.email === next.email
            ? prev
            : next;
        });
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      setProfile,
      refreshProfile,
    }),
    [user, profile, loading, setProfile, refreshProfile]
  );

  return (
    <DashboardUserContext.Provider value={value}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useDashboardUser() {
  const ctx = useContext(DashboardUserContext);
  if (!ctx) {
    throw new Error("useDashboardUser must be used within DashboardUserProvider");
  }
  return ctx;
}
