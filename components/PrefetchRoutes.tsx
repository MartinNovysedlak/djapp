"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Warm the Next.js client router cache for dashboard links so the first
 * click does not wait on a Vercel RSC round-trip.
 */
export function PrefetchRoutes({ hrefs }: { hrefs: readonly string[] }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let i = 0;

    const tick = () => {
      if (cancelled || i >= hrefs.length) return;
      const href = hrefs[i++];
      try {
        router.prefetch(href);
      } catch {
        // ignore
      }
      // Stagger slightly so we don't stampede the network on mount.
      window.setTimeout(tick, 40);
    };

    const start = window.setTimeout(tick, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [router, hrefs]);

  return null;
}
