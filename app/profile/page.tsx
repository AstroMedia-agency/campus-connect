"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

const DEFAULT_SKILLS = ["frontend", "backend", "database", "design", "ml", "devops"];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [skills, setSkills] = useState<Record<string, number>>({});
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [attendance, setAttendance] = useState(100);
  const [backlogs, setBacklogs] = useState(0);
  const [githubUsername, setGithubUsername] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setSkills(data.skills && Object.keys(data.skills).length ? data.skills : {});
        setWeeklyHours(data.weekly_hours ?? 10);
        setAttendance(data.attendance_pct ?? 100);
        setBacklogs(data.backlogs ?? 0);
        setGithubUsername(data.github_username || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  function setSkillLevel(skill: string, level: number) {
    setSkills((prev) => ({ ...prev, [skill]: level }));
  }

  async function handleSave() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        skills,
        weekly_hours: weeklyHours,
        attendance_pct: attendance,
        backlogs,
        github_username: githubUsername || null,
      })
      .eq("id", userData.user?.id);
    setSaving(false);
  }

  if (loading) return <div className="p-6 font-mono text-sm">Loading...</div>;

  return (
    <main>
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-700 mb-6">Your profile</h1>

        <label className="block font-mono text-xs text-ink/50 mb-1">Full name</label>
        <input
          className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none mb-5"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <label className="block font-mono text-xs text-ink/50 mb-2">
          Skill matrix — rate 0 (none) to 5 (expert)
        </label>
        <div className="space-y-3 mb-6">
          {DEFAULT_SKILLS.map((skill) => (
            <div key={skill} className="flex items-center gap-4">
              <span className="w-24 font-mono text-sm capitalize">{skill}</span>
              <input
                type="range"
                min={0}
                max={5}
                value={skills[skill] || 0}
                onChange={(e) => setSkillLevel(skill, Number(e.target.value))}
                className="flex-1 accent-signal"
              />
              <span className="w-6 text-right font-mono text-sm">{skills[skill] || 0}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div>
            <label className="block font-mono text-xs text-ink/50 mb-1">Weekly hours</label>
            <input
              type="number"
              className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block font-mono text-xs text-ink/50 mb-1">Attendance %</label>
            <input
              type="number"
              className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
              value={attendance}
              onChange={(e) => setAttendance(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block font-mono text-xs text-ink/50 mb-1">Backlogs</label>
            <input
              type="number"
              className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
              value={backlogs}
              onChange={(e) => setBacklogs(Number(e.target.value))}
            />
          </div>
        </div>

        <label className="block font-mono text-xs text-ink/50 mb-1">
          GitHub username (optional, for commit telemetry)
        </label>
        <input
          className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none mb-6"
          value={githubUsername}
          onChange={(e) => setGithubUsername(e.target.value)}
          placeholder="e.g. octocat"
        />

        <p className="text-xs text-ink/50 font-mono mb-6 border border-line p-3">
          Overdue-task email reminders go to the address you signed up with — nothing to set up here.
        </p>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-ink text-paper font-mono text-sm px-5 py-3 hover:bg-signal transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </main>
  );
}
