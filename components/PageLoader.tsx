// Small centred spinner shown while a page loads its data.
export default function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-9 h-9 rounded-full border-[3px] border-mist border-t-signal animate-spin" />
      <p className="font-mono text-xs text-ink/50 animate-fade-in">Loading…</p>
    </div>
  );
}
