import Link from "next/link";

// Landing page: staggered entrance + an animated task graph that "draws itself".

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

const FEATURES = [
  {
    title: "Balanced teams",
    text: "Students are matched by complementary skills, attendance and backlogs, so no team is stacked.",
    icon: (
      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 20c0-3 3-5 6-5s6 2 6 5m-2-5c1-.6 2.4-1 4-1 3 0 6 2 6 5" />
    ),
  },
  {
    title: "Tasks as a graph",
    text: "Dependencies, the critical path and late (drifting) tasks are worked out for you, live.",
    icon: <path d="M5 6h4v4H5zM15 4h4v4h-4zM15 16h4v4h-4zM9 8h3l3-2M9 8h3l3 10" />,
  },
  {
    title: "Fair reports",
    text: "Real GitHub commits and logged work turn into an evidence-based contribution report.",
    icon: <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />,
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Floating background glows */}
      <div className="pointer-events-none absolute -top-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-signal/15 blur-3xl animate-blob" />
      <div
        className="pointer-events-none absolute top-20 -right-40 w-[30rem] h-[30rem] rounded-full bg-amber/20 blur-3xl animate-blob"
        style={{ animationDelay: "-7s" }}
      />

      {/* Top bar */}
      <header className="relative max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2 font-display font-700">
          <span className="w-8 h-8 rounded-xl btn-accent text-paper flex items-center justify-center text-sm">CC</span>
          CampusConnect
        </div>
        <Link href="/login" className="font-mono text-sm hover:text-signal">
          Log in →
        </Link>
      </header>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-12 grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full border border-signal/20 bg-mist px-3 py-1 font-mono text-[11px] sm:text-xs uppercase tracking-widest text-signal animate-fade-up"
            style={delay(100)}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-signal node-pulse" />
            skill-matrix × dag × telemetry
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-700 leading-[1.05] mt-5">
            <span className="block animate-fade-up" style={delay(250)}>
              Teams that
            </span>
            <span className="block text-gradient animate-fade-up" style={delay(400)}>
              balance themselves.
            </span>
            <span className="block text-2xl sm:text-3xl lg:text-4xl text-ink/80 mt-3 animate-fade-up" style={delay(550)}>
              Deadlines that flag their own drift.
            </span>
          </h1>
          <p className="text-ink/65 mt-5 leading-relaxed max-w-lg animate-fade-up" style={delay(700)}>
            CampusConnect pairs students by complementary skills, models your project as a dependency graph
            instead of a to-do list, and turns real coding activity into a fair contribution report,
            automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8 animate-fade-up" style={delay(850)}>
            <Link
              href="/signup"
              className="btn-accent text-center text-paper font-mono text-sm px-6 py-3 rounded-xl"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="text-center font-mono text-sm px-6 py-3 rounded-xl border border-ink/15 bg-white/70 hover:border-signal hover:text-signal transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* Animated task graph */}
        <div className="relative animate-fade-up" style={delay(500)}>
          <div className="card shadow-lift rounded-3xl p-4 sm:p-6">
            <div className="flex items-center justify-between font-mono text-[11px] text-ink/50 mb-2">
              <span>project · task graph</span>
              <span className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-line" />
                <span className="w-2 h-2 rounded-full bg-line" />
                <span className="w-2 h-2 rounded-full bg-signal" />
              </span>
            </div>
            <svg viewBox="0 0 460 300" className="w-full h-auto" role="img" aria-label="Animated project task graph">
              <defs>
                <linearGradient id="launch" x1="0" x2="1">
                  <stop offset="0" stopColor="#1E7A62" />
                  <stop offset="1" stopColor="#2FB38E" />
                </linearGradient>
              </defs>
              {/* edges draw in one after another */}
              <g fill="none" strokeWidth="2" strokeLinecap="round">
                <path d="M106 150 C120 150 120 75 134 75" stroke="#D3D7CF" pathLength={1} strokeDasharray="1" className="animate-draw" style={delay(900)} />
                <path d="M106 150 C120 150 120 225 134 225" stroke="#1E7A62" pathLength={1} strokeDasharray="1" className="animate-draw" style={delay(1000)} />
                <path d="M226 75 C240 75 240 150 254 150" stroke="#D3D7CF" pathLength={1} strokeDasharray="1" className="animate-draw" style={delay(1300)} />
                <path d="M226 225 C240 225 240 150 254 150" stroke="#1E7A62" pathLength={1} strokeDasharray="1" className="animate-draw" style={delay(1400)} />
                <path d="M346 150 H354" stroke="#1E7A62" pathLength={1} strokeDasharray="1" className="animate-draw" style={delay(1700)} />
              </g>
              {/* "work flowing" along the critical path */}
              <g fill="none" stroke="#2FB38E" strokeWidth="2" strokeDasharray="4 8" opacity=".9" className="animate-fade-in" style={delay(2100)}>
                <path d="M106 150 C120 150 120 225 134 225" className="animate-flow" />
                <path d="M226 225 C240 225 240 150 254 150" className="animate-flow" />
              </g>
              {/* nodes pop in */}
              {[
                { x: 60, y: 150, label: "Design", crit: true, d: 700 },
                { x: 180, y: 75, label: "API", crit: false, d: 1150 },
                { x: 180, y: 225, label: "Frontend", crit: true, d: 1250 },
                { x: 300, y: 150, label: "Tests", crit: true, d: 1550 },
              ].map((n) => (
                <g key={n.label} className="origin-box animate-pop" style={delay(n.d)}>
                  <rect x={n.x - 46} y={n.y - 20} width="92" height="40" rx="12" fill="#fff" stroke={n.crit ? "#1E7A62" : "#D3D7CF"} strokeWidth={n.crit ? 2 : 1.5} />
                  <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="14" fontFamily="Inter, sans-serif" fill="#101418">
                    {n.label}
                  </text>
                </g>
              ))}
              <g className="origin-box animate-pop" style={delay(1850)}>
                <rect x="354" y="130" width="92" height="40" rx="12" fill="url(#launch)" />
                <text x="400" y="155" textAnchor="middle" fontSize="14" fontWeight="600" fontFamily="Inter, sans-serif" fill="#fff">
                  Launch
                </text>
              </g>
              {/* drifting warning on the API task */}
              <g className="origin-box animate-pop" style={delay(2300)}>
                <circle cx="222" cy="57" r="9" fill="#C2492D" />
                <text x="222" y="61.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">!</text>
              </g>
            </svg>
          </div>

          {/* floating info chips */}
          <div
            className="absolute -top-4 left-4 sm:-left-6 card rounded-xl px-3 py-2 font-mono text-[11px] sm:text-xs flex items-center gap-2 animate-fade-up"
            style={delay(2000)}
          >
            <span className="w-2 h-2 rounded-full bg-signal" /> Team 1 · balanced
          </div>
          <div className="absolute -bottom-5 right-4 sm:-right-4 animate-fade-up" style={delay(2400)}>
            <div className="card rounded-xl px-3 py-2 font-mono text-[11px] sm:text-xs animate-float">
              critical path · <span className="text-signal font-medium">6 days</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pb-16 grid sm:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="card p-5 hover:-translate-y-1 hover:shadow-lift transition-all duration-300 animate-fade-up"
            style={delay(1000 + i * 150)}
          >
            <div className="w-10 h-10 rounded-xl bg-mist text-signal flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {f.icon}
              </svg>
            </div>
            <h3 className="font-display font-600">{f.title}</h3>
            <p className="text-sm text-ink/60 mt-1 leading-relaxed">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
