export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 animate-pulse p-4 md:p-0">
      <div className="h-8 w-48 rounded-xl bg-white/5" />
      <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
      <div className="mt-6 h-40 rounded-3xl bg-white/[0.03]" />
      <div className="h-40 rounded-3xl bg-white/[0.03]" />
    </div>
  );
}
