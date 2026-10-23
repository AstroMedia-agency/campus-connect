"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (loginError) {
      setError(loginError.message);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-10">
      <form onSubmit={handleLogin} className="max-w-sm w-full space-y-4 card p-6 sm:p-8 shadow-lift animate-fade-up">
        <a href="/" className="flex items-center gap-2 font-display font-700 mb-4"><span className="w-8 h-8 rounded-xl btn-accent text-paper text-sm flex items-center justify-center">CC</span>CampusConnect</a>
        <h1 className="font-display text-2xl font-700 mb-2">Log in</h1>
        {error && <p className="text-drift text-sm font-mono">{error}</p>}
        <input
          type="email"
          className="w-full field px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full field px-3 py-2"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          disabled={loading}
          className="w-full btn-accent text-paper font-mono text-sm py-3 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
        <p className="text-sm text-ink/60">
          No account yet?{" "}
          <a href="/signup" className="text-signal underline">
            Sign up
          </a>
        </p>
      </form>
    </main>
  );
}
