"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";

const SKILLS = ["frontend", "backend", "database", "design", "ml", "devops"];

type StudentResult = {
  id: string;
  full_name: string;
  skills: Record<string, number>;
  attendance_pct: number;
  backlogs: number;
  weekly_hours: number;
};

export default function StudentsPage() {
  const router = useRouter();
  const [skill, setSkill] = useState("");
  const [minLevel, setMinLevel] = useState(3);
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.push("/login");
        return;
      }
      await search();
      setLoading(false);
    }
    init();
  }, []);

  async function search() {
    const params = new URLSearchParams();
    if (skill) {
      params.set("skill", skill);
      params.set("minLevel", String(minLevel));
    }
    const res = await fetch(`/api/students?${params.toString()}`);
    const data = await res.json();
    setResults(data.students || []);
  }

  if (loading) return <PageLoader />;

  return (
    <main>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-up">
        <h1 className="font-display text-2xl font-700 mb-1">Find candidates</h1>
        <p className="text-ink/60 mb-6 text-sm">
          Search eligible students (attendance ≥ 70%, no backlogs) by domain skill.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end mb-8">
          <div className="flex-1">
            <label className="block font-mono text-xs text-ink/50 mb-1">Skill domain</label>
            <select
              className="w-full field px-3 py-2"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            >
              <option value="">All students</option>
              {SKILLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          {skill && (
            <div>
              <label className="block font-mono text-xs text-ink/50 mb-1">Min level</label>
              <input
                type="number"
                min={1}
                max={5}
                className="w-full sm:w-20 field px-3 py-2"
                value={minLevel}
                onChange={(e) => setMinLevel(Number(e.target.value))}
              />
            </div>
          )}
          <button
            onClick={search}
            className="w-full sm:w-auto bg-ink text-paper shadow-soft font-mono text-sm px-4 py-2 hover:bg-signal transition-colors"
          >
            Search
          </button>
        </div>

        <div className="space-y-2">
          {results.length === 0 && (
            <p className="font-mono text-xs text-ink/50">No eligible students match this filter.</p>
          )}
          {results.map((s) => (
            <div key={s.id} className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-medium">{s.full_name}</div>
                <div className="font-mono text-xs text-ink/50">
                  attendance {s.attendance_pct}% · {s.weekly_hours}h/week available
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(s.skills || {})
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className={`font-mono text-xs border rounded-full px-2.5 py-0.5 ${
                        k === skill ? "border-signal bg-mist text-signal" : "border-line bg-white"
                      }`}
                    >
                      {k}:{v}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
