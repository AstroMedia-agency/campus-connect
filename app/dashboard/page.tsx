"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";
import WelcomeIntro from "@/components/WelcomeIntro";
import { useCurrentProfile } from "@/lib/useCurrentProfile";

type Project = {
  id: string;
  title: string;
  description: string | null;
  required_skills: string[];
  team_size: number;
  start_date: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { userId, name } = useCurrentProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);

  // Welcome sequence: "pending" (deciding) -> "playing" (full-screen welcome)
  // -> "revealed" (page content animates in). Plays once per login session.
  const [intro, setIntro] = useState<"pending" | "playing" | "revealed">("pending");
  const [introVisible, setIntroVisible] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (!userId || decided.current) return;
    decided.current = true;
    const key = `cc-welcome-${userId}`;
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      // storage blocked (private mode etc.) - just play the intro
    }
    if (seen) {
      setIntro("revealed");
    } else {
      setIntro("playing");
      setIntroVisible(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("project_invitations")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", userId)
      .eq("status", "pending")
      .then(({ count }) => setPendingInvites(count || 0));
  }, [userId]);

  // Each block of the page fades up a little after the previous one.
  const reveal = (step: number) =>
    intro === "revealed"
      ? { className: "animate-fade-up", style: { animationDelay: `${step * 110}ms` } }
      : { className: "opacity-0", style: undefined };
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [teamSize, setTeamSize] = useState(4);
  const [creating, setCreating] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.push("/login");
        return;
      }
      await loadProjects();
      setLoading(false);
    }
    init();
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    setProjects((data as Project[]) || []);
  }

  async function handleSuggestSkills() {
    if (description.trim().length < 10) {
      setSuggestMsg("Write a longer description first (10+ characters).");
      return;
    }
    setSuggesting(true);
    setSuggestMsg(null);
    const res = await fetch("/api/extract-skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    const data = await res.json();
    setSuggesting(false);
    if (data.error) {
      setSuggestMsg(data.error);
      return;
    }
    setSkillsInput((data.skills || []).join(", "));
    setSuggestMsg(
      data.method === "ai" ? "Suggested by AI from your description." : "Suggested by keyword match (no AI key set)."
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const requiredSkills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await supabase.from("projects").insert({
      title,
      description,
      required_skills: requiredSkills,
      team_size: teamSize,
      created_by: userData.user?.id,
    });

    setTitle("");
    setDescription("");
    setSkillsInput("");
    setShowForm(false);
    setCreating(false);
    loadProjects();
  }

  const introOverlay = introVisible ? (
    <WelcomeIntro name={name} onReveal={() => setIntro("revealed")} onFinish={() => setIntroVisible(false)} />
  ) : null;

  if (loading)
    return (
      <>
        {introOverlay}
        {!introVisible && <PageLoader />}
      </>
    );

  const r0 = reveal(0), r1 = reveal(1), r2 = reveal(2), r3 = reveal(3);
  const totalSkills = new Set(projects.flatMap((p) => p.required_skills || [])).size;

  return (
    <main>
      {introOverlay}
      <div className={r0.className} style={r0.style}>
        <Navbar />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className={`mb-6 ${r1.className}`} style={r1.style}>
          <p className="font-mono text-xs uppercase tracking-widest text-signal">Dashboard</p>
          <h1 className="font-display text-3xl sm:text-4xl font-700 break-words mt-1">
            Welcome, <span className="text-gradient">{name || "there"}</span>
          </h1>
          <p className="text-ink/60 text-sm mt-2">
            Here are your projects. Open one to invite candidates, manage tasks and track progress.
          </p>
        </div>

        {/* Quick stats */}
        <div className={`grid grid-cols-3 gap-3 mb-8 ${r2.className}`} style={r2.style}>
          <div className="card p-3 sm:p-4">
            <div className="font-display text-2xl sm:text-3xl font-700">{projects.length}</div>
            <div className="font-mono text-[11px] sm:text-xs text-ink/50">projects</div>
          </div>
          <Link href="/invitations" className="card p-3 sm:p-4 hover:shadow-lift hover:-translate-y-0.5 transition-all">
            <div className={`font-display text-2xl sm:text-3xl font-700 ${pendingInvites ? "text-signal" : ""}`}>
              {pendingInvites}
            </div>
            <div className="font-mono text-[11px] sm:text-xs text-ink/50">pending invites</div>
          </Link>
          <div className="card p-3 sm:p-4">
            <div className="font-display text-2xl sm:text-3xl font-700">{totalSkills}</div>
            <div className="font-mono text-[11px] sm:text-xs text-ink/50">skill areas</div>
          </div>
        </div>

        <div className={`flex flex-wrap items-center justify-between gap-3 mb-5 ${r3.className}`} style={r3.style}>
          <h2 className="font-display text-xl sm:text-2xl font-700">Projects</h2>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-accent text-paper font-mono text-sm px-4 py-2"
          >
            {showForm ? "Cancel" : "+ New project"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="card p-4 sm:p-5 mb-8 space-y-3 animate-fade-up">
            <input
              className="w-full field px-3 py-2"
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="w-full field px-3 py-2"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="flex-1 min-w-0 field px-3 py-2"
                placeholder="Required skills, comma separated (e.g. frontend, backend, design)"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={handleSuggestSkills}
                disabled={suggesting}
                className="font-mono text-xs border border-line px-3 py-2 hover:border-signal hover:text-signal transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {suggesting ? "..." : "Suggest from description"}
              </button>
            </div>
            {suggestMsg && <p className="font-mono text-xs text-ink/50">{suggestMsg}</p>}
            <div className="flex items-center gap-3">
              <label className="font-mono text-sm text-ink/60">Team size</label>
              <input
                type="number"
                min={2}
                max={10}
                className="w-20 field px-3 py-2"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
              />
            </div>
            <button
              disabled={creating}
              className="w-full sm:w-auto btn-accent text-paper font-mono text-sm px-4 py-2 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create project"}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {projects.length === 0 && (
            <p className={`card p-6 text-center text-ink/50 font-mono text-sm ${reveal(4).className}`} style={reveal(4).style}>
              No projects yet. Click “+ New project” to create your first one.
            </p>
          )}
          {projects.map((p, i) => (
            <a
              key={p.id}
              href={`/projects/${p.id}`}
              className={`group block card p-4 sm:p-5 hover:-translate-y-0.5 hover:shadow-lift hover:border-signal/40 transition-all duration-300 ${reveal(4 + i).className}`}
              style={reveal(4 + i).style}
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <h2 className="font-display font-600 break-words group-hover:text-signal transition-colors">
                  {p.title} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </h2>
                <span className="chip px-2 py-0.5">team of {p.team_size}</span>
              </div>
              {p.description && <p className="text-sm text-ink/60 mt-1">{p.description}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {(p.required_skills || []).map((s) => (
                  <span key={s} className="chip px-2.5 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
