export default function DjsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 md:px-6">
      <div className="space-y-3 animate-pulse">
        <div className="h-9 w-56 rounded-xl bg-white/5" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-white/[0.04]" />
      </div>
      <div className="h-24 animate-pulse rounded-3xl bg-white/[0.03]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-3xl bg-white/[0.03]"
          />
        ))}
      </div>
    </div>
  );
}
