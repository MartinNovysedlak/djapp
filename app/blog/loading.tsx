export default function BlogLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="space-y-3 animate-pulse">
        <div className="h-3 w-16 rounded bg-white/5" />
        <div className="h-9 w-72 max-w-full rounded-xl bg-white/5" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-white/[0.04]" />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-72 animate-pulse rounded-3xl bg-white/[0.03]"
          />
        ))}
      </div>
    </div>
  );
}
