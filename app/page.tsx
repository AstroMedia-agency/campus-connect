import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-xl w-full">
        <div className="font-mono text-xs uppercase tracking-widest text-signal mb-4">
          skill-matrix × dag × telemetry
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-700 leading-tight mb-4">
          Teams that balance themselves.
          <br />
          Deadlines that flag their own drift.
        </h1>
        <p className="text-ink/70 mb-8 leading-relaxed">
          CampusConnect pairs students by complementary skills, models your project
          as a dependency graph instead of a to-do list, and turns real coding
          activity into a fair contribution report — automatically.
        </p>
        <div className="flex gap-3">
          <Link
            href="/signup"
            className="px-5 py-3 bg-ink text-paper font-mono text-sm rounded-none hover:bg-signal transition-colors"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="px-5 py-3 border border-ink font-mono text-sm hover:border-signal hover:text-signal transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
