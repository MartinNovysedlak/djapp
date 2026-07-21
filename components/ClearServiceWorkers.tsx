"use client";

import { useEffect } from "react";

/** Removes leftover PWA service workers / caches from earlier experiments. */
export function ClearServiceWorkers() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister();
    });

    if ("caches" in window) {
      void caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith("btv-")) void caches.delete(key);
        }
      });
    }
  }, []);

  return null;
}
