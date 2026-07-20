export default function ClientDashboardLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-pulse px-4 pt-6">
      <div className="h-8 w-40 rounded-xl bg-white/5" />
      <div className="h-4 w-64 rounded-lg bg-white/[0.04]" />
      <div className="mt-4 h-32 rounded-3xl bg-white/[0.03]" />
      <div className="h-32 rounded-3xl bg-white/[0.03]" />
    </div>
  );
}
