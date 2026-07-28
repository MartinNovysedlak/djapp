"use client";

import dynamic from "next/dynamic";

const HomeBelowFold = dynamic(() => import("./HomeBelowFold"), {
  ssr: false,
  loading: () => (
    <div className="mt-32 space-y-8 animate-pulse md:mt-44">
      <div className="mx-auto h-8 w-56 rounded-xl bg-white/5" />
      <div className="h-48 rounded-3xl bg-white/[0.03]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-3xl bg-white/[0.03]" />
        <div className="h-40 rounded-3xl bg-white/[0.03]" />
      </div>
    </div>
  ),
});

export function HomeBelowFoldLoader() {
  return <HomeBelowFold />;
}
