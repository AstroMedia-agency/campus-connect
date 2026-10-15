"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "faculty">("student");
  const [regNo, setRegNo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.user) {
      setError(signUpError?.message || "Sign up failed.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      role,
      reg_no: regNo || null,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSignup} className="max-w-sm w-full space-y-4">
        <h1 className="font-display text-2xl font-700 mb-2">Create account</h1>
        {error && <p className="text-drift text-sm font-mono">{error}</p>}

        <input
          className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
          placeholder="Register number (optional)"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
        />
        <select
          className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
          value={role}
          onChange={(e) => setRole(e.target.value as "student" | "faculty")}
        >
          <option value="student">Student</option>
          <option value="faculty">Faculty</option>
        </select>
        <input
          type="email"
          className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
        <button
          disabled={loading}
          className="w-full bg-ink text-paper font-mono text-sm py-3 hover:bg-signal transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>
        <p className="text-sm text-ink/60">
          Already have an account?{" "}
          <a href="/login" className="text-signal underline">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
