"use client";

import { useEffect, useState } from "react";

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const HOLD_MS = 2300; // how long the welcome stays on screen
const EXIT_MS = 800; // slide-up duration (matches animate-intro-out)

/**
 * Full-screen welcome shown once after login:
 * "Good evening / Welcome, <name>" fades in, holds, then slides up.
 * onReveal fires as it starts sliding (so the page underneath can animate in),
 * onFinish fires when it has fully gone. Tap anywhere to skip.
 */
export default function WelcomeIntro({
  name,
  onReveal,
  onFinish,
}: {
  name: string | null;
  onReveal: () => void;
  onFinish: () => void;
}) {
  const [leaving, setLeaving] = useState(false);

  function leave() {
    if (leaving) return;
    setLeaving(true);
    onReveal();
    setTimeout(onFinish, EXIT_MS);
  }

  // Start the timer only once the name has loaded, so it's never cut short.
  useEffect(() => {
    if (!name) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(leave, reduced ? 700 : HOLD_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return (
    <div
      onClick={leave}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-ink text-paper cursor-pointer ${
        leaving ? "animate-intro-out" : ""
      }`}
      role="dialog"
      aria-label={name ? `Welcome, ${name}` : "Welcome"}
    >
      {/* Moving colour glows */}
      <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-signal/50 blur-3xl animate-blob" />
      <div
        className="absolute -bottom-40 -right-24 w-[30rem] h-[30rem] rounded-full bg-amber/30 blur-3xl animate-blob"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-signal-light/25 blur-3xl animate-blob"
        style={{ animationDelay: "-11s" }}
      />

      <div className="relative px-6 text-center max-w-3xl">
        <div className="mx-auto mb-6 w-12 h-12 rounded-2xl btn-accent flex items-center justify-center font-display font-700 text-lg animate-pop">
          CC
        </div>
        <p
          className="font-mono text-xs sm:text-sm uppercase tracking-[0.3em] text-paper/60 animate-fade-up"
          style={{ animationDelay: "150ms" }}
        >
          {timeGreeting()}
        </p>
        <h1 className="font-display font-700 leading-tight mt-3 text-4xl sm:text-6xl break-words">
          <span className="inline-block animate-fade-up" style={{ animationDelay: "300ms" }}>
            Welcome,
          </span>{" "}
          {name && (
            <span className="inline-block text-gradient animate-fade-up" style={{ animationDelay: "550ms" }}>
              {name}
            </span>
          )}
        </h1>
        <p className="mt-4 text-paper/70 text-sm sm:text-base animate-fade-up" style={{ animationDelay: "850ms" }}>
          Let&apos;s build something great today.
        </p>

        {/* Progress line */}
        <div className="mx-auto mt-8 h-[3px] w-40 rounded-full bg-paper/15 overflow-hidden">
          {name && <div className="h-full bg-gradient-to-r from-signal-light to-amber animate-grow" />}
        </div>
      </div>

      <p
        className="absolute bottom-6 inset-x-0 text-center font-mono text-[11px] text-paper/40 animate-fade-in"
        style={{ animationDelay: "1200ms" }}
      >
        tap anywhere to skip
      </p>
    </div>
  );
}
