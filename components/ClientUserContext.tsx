"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  clearClientAuthCache,
  getClientAuthCache,
  setClientAuthCache,
} from "@/lib/nav-cache";

export type ClientProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "dj" | "client";
};

type ClientUser = { id: string; email?: string };

type ClientUserContextValue = {
  user: ClientUser | null;
  profile: ClientProfile | null;
  loading: boolean;
  setProfile: Dispatch<SetStateAction<ClientProfile | null>>;
};

const ClientUserContext = createContext<ClientUserContextValue | null>(null);

function initialFromCache() {
  const cached = getClientAuthCache<ClientProfile>();
  if (!cached) {
    return {
      user: null as ClientUser | null,
      profile: null as ClientProfile | null,
      loading: true,
    };
  }
  return {
    user: cached.user,
    profile: cached.profile,
    loading: false,
  };
}

export function ClientUserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const seeded = initialFromCache();
  const [user, setUser] = useState<ClientUser | null>(seeded.user);
  const [profile, setProfile] = useState<ClientProfile | null>(seeded.profile);
  const [loading, setLoading] = useState(seeded.loading);

  const loadProfile = useCallback(
    async (sessionUser: ClientUser) => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .eq("id", sessionUser.id)
        .maybeSingle();

      if (data) {
        const loaded = data as ClientProfile;
        setProfile(loaded);
        setClientAuthCache(sessionUser, loaded);
        if (loaded.role === "dj") {
          router.push("/dashboard/profile");
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
        clearClientAuthCache();
        setUser(null);
        setProfile(null);
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
          clearClientAuthCache();
          setUser(null);
          setProfile(null);
          router.push("/login");
          return;
        }
        const next = { id: session.user.id, email: session.user.email };
        setUser((prev) =>
          prev?.id === next.id && prev?.email === next.email ? prev : next
        );
      }
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [router, loadProfile]);

  const value = useMemo(
    () => ({ user, profile, loading, setProfile }),
    [user, profile, loading]
  );

  return (
    <ClientUserContext.Provider value={value}>
      {children}
    </ClientUserContext.Provider>
  );
}

export function useClientUser() {
  const ctx = useContext(ClientUserContext);
  if (!ctx) {
    throw new Error("useClientUser must be used within ClientUserProvider");
  }
  return ctx;
}
