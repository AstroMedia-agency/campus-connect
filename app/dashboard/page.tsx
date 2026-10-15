"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

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
  const [projects, setProjects] = useState<Project[]>([]);
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

  if (loading) return <div className="p-6 font-mono text-sm">Loading...</div>;

  return (
    <main>
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-2xl font-700">Projects</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-ink text-paper font-mono text-sm px-4 py-2 hover:bg-signal transition-colors"
          >
            {showForm ? "Cancel" : "+ New project"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="border border-line p-5 mb-8 space-y-3">
            <input
              className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
                placeholder="Required skills, comma separated (e.g. frontend, backend, design)"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={handleSuggestSkills}
                disabled={suggesting}
                className="font-mono text-xs border border-line px-3 hover:border-signal hover:text-signal transition-colors disabled:opacity-50 whitespace-nowrap"
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
                className="w-20 border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
              />
            </div>
            <button
              disabled={creating}
              className="bg-signal text-paper font-mono text-sm px-4 py-2 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create project"}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {projects.length === 0 && (
            <p className="text-ink/50 font-mono text-sm">No projects yet. Create one above.</p>
          )}
          {projects.map((p) => (
            <a
              key={p.id}
              href={`/projects/${p.id}`}
              className="block border border-line p-4 hover:border-signal transition-colors"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-600">{p.title}</h2>
                <span className="font-mono text-xs text-ink/50">team of {p.team_size}</span>
              </div>
              {p.description && <p className="text-sm text-ink/60 mt-1">{p.description}</p>}
              <div className="flex gap-2 mt-2">
                {(p.required_skills || []).map((s) => (
                  <span key={s} className="font-mono text-xs border border-line px-2 py-0.5">
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
