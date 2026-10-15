"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

type Project = { id: string; title: string; description: string; required_skills: string[]; team_size: number };
type TeamRow = { id: string; name: string; github_repo: string | null };
type Member = { profile_id: string; full_name: string };
type Task = {
  id: string;
  title: string;
  duration_days: number;
  status: "todo" | "in_progress" | "done";
  depends_on: string[];
  planned_start?: string;
  planned_finish?: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drifted, setDrifted] = useState<string[]>([]);
  const [critical, setCritical] = useState<string[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [formingTeams, setFormingTeams] = useState(false);
  const [teamFormationMsg, setTeamFormationMsg] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDuration, setTaskDuration] = useState(3);
  const [taskDeps, setTaskDeps] = useState<string[]>([]);
  const [taskAssignee, setTaskAssignee] = useState("");

  const [logMinutes, setLogMinutes] = useState(30);
  const [logDesc, setLogDesc] = useState("");
  const [logProfile, setLogProfile] = useState("");

  const [report, setReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [githubRepo, setGithubRepo] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [activityCount, setActivityCount] = useState(0);
  const [lastAutoCheck, setLastAutoCheck] = useState<string | null>(null);

  const [remindMsg, setRemindMsg] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.push("/login");
        return;
      }
      await loadProject();
      await loadTeams();
    }
    init();
  }, [projectId]);

  useEffect(() => {
    if (selectedTeam) {
      loadMembers(selectedTeam);
      loadTasks(selectedTeam);
      loadActivityCount(selectedTeam);
      const team = teams.find((t) => t.id === selectedTeam);
      setGithubRepo(team?.github_repo || "");
    }
  }, [selectedTeam, teams]);

  // Supabase Realtime: live-refresh the task board and activity count when
  // anything changes for this team, from any browser tab/user — no custom
  // WebSocket server needed, Postgres change events do the work.
  useEffect(() => {
    if (!selectedTeam) return;
    const channel = supabase
      .channel(`team-${selectedTeam}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `team_id=eq.${selectedTeam}` },
        () => loadTasks(selectedTeam)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs", filter: `team_id=eq.${selectedTeam}` },
        () => loadActivityCount(selectedTeam)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTeam]);

  // Auto-poll GitHub for new commits every 90s while this page is open and a
  // repo is set — this is the practical substitute for a push-triggered
  // webhook, since a webhook needs a public URL and this app runs locally.
  useEffect(() => {
    if (!selectedTeam || !githubRepo.trim()) return;
    const interval = setInterval(() => {
      handleGithubSync(true);
    }, 90000);
    return () => clearInterval(interval);
  }, [selectedTeam, githubRepo]);

  // Once per page load, check for drifting tasks and fire email reminders
  // (the API route itself guards against re-notifying the same task twice
  // in one day, so this is safe to run automatically).
  useEffect(() => {
    if (!selectedTeam) return;
    fetch("/api/notify-drift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeam }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.sent > 0) setRemindMsg(`Auto-sent ${data.sent} email reminder(s) for overdue tasks.`);
      })
      .catch(() => {});
  }, [selectedTeam]);

  async function loadProject() {
    const { data } = await supabase.from("projects").select("*").eq("id", projectId).single();
    setProject(data);
  }

  async function loadTeams() {
    const { data } = await supabase.from("teams").select("*").eq("project_id", projectId);
    setTeams(data || []);
    if (data && data.length && !selectedTeam) setSelectedTeam(data[0].id);
  }

  async function loadMembers(teamId: string) {
    const { data } = await supabase
      .from("team_members")
      .select("profile_id, profiles(full_name)")
      .eq("team_id", teamId);
    const mapped = (data || []).map((d: any) => ({ profile_id: d.profile_id, full_name: d.profiles.full_name }));
    setMembers(mapped);
    if (mapped.length) {
      setTaskAssignee(mapped[0].profile_id);
      setLogProfile(mapped[0].profile_id);
    }
  }

  async function loadTasks(teamId: string) {
    const res = await fetch(`/api/tasks?teamId=${teamId}`);
    const data = await res.json();
    setTasks(data.tasks || []);
    setDrifted(data.drifted || []);
    setCritical(data.critical || []);
    setTotalDays(data.totalDays || 0);
  }

  async function handleFormTeams() {
    setFormingTeams(true);
    setTeamFormationMsg(null);
    const res = await fetch("/api/team-formation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    setFormingTeams(false);
    if (data.error) {
      setTeamFormationMsg(data.error);
      return;
    }
    setTeamFormationMsg(`Formed ${data.teams.length} team(s).`);
    await loadTeams();
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        teamId: selectedTeam,
        title: taskTitle,
        duration_days: taskDuration,
        depends_on: taskDeps,
        assigned_to: taskAssignee || null,
      }),
    });
    setTaskTitle("");
    setTaskDuration(3);
    setTaskDeps([]);
    loadTasks(selectedTeam);
  }

  async function handleStatusChange(taskId: string, status: string) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    if (selectedTeam) loadTasks(selectedTeam);
  }

  async function loadActivityCount(teamId: string) {
    const res = await fetch(`/api/activity?teamId=${teamId}`);
    const data = await res.json();
    setActivityCount((data.logs || []).length);
  }

  async function handleGithubSync(silent = false) {
    if (!selectedTeam || !githubRepo.trim()) return;
    if (!silent) {
      setSyncing(true);
      setSyncMsg(null);
    }
    const res = await fetch("/api/github-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeam, repo: githubRepo.trim() }),
    });
    const data = await res.json();
    setSyncing(false);
    const now = new Date().toLocaleTimeString();
    setLastAutoCheck(now);
    if (data.error) {
      if (!silent) setSyncMsg(data.error);
      return;
    }
    setSyncMsg(
      `${silent ? "Auto-checked" : "Synced"} at ${now}. ${data.inserted} new commit${
        data.inserted === 1 ? "" : "s"
      } logged (checked ${data.totalCommitsChecked} recent commits).`
    );
    loadActivityCount(selectedTeam);
  }

  async function handleSendReminders() {
    if (!selectedTeam) return;
    setReminding(true);
    setRemindMsg(null);
    const res = await fetch("/api/notify-drift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeam }),
    });
    const data = await res.json();
    setReminding(false);
    if (data.error) {
      setRemindMsg(data.error);
      return;
    }
    if (data.sent === 0) {
      setRemindMsg(data.message || "No reminders needed right now — nothing is overdue, or already notified today.");
    } else {
      setRemindMsg(
        `Sent ${data.sent} email reminder(s).` +
          (data.errors?.length ? ` ${data.errors.length} failed — check phone numbers/API keys.` : "")
      );
    }
  }

  async function handleLogActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam || !logProfile) return;
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: logProfile,
        teamId: selectedTeam,
        description: logDesc,
        minutesActive: logMinutes,
      }),
    });
    setLogDesc("");
    loadActivityCount(selectedTeam);
  }

  async function handleGenerateReport() {
    if (!selectedTeam) return;
    setGeneratingReport(true);
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeam }),
    });
    const data = await res.json();
    setGeneratingReport(false);
    setReport(data.report?.content || data.error);
  }

  const columns: { key: Task["status"]; label: string }[] = [
    { key: "todo", label: "To do" },
    { key: "in_progress", label: "In progress" },
    { key: "done", label: "Done" },
  ];

  if (!project) return <div className="p-6 font-mono text-sm">Loading...</div>;

  return (
    <main>
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-700 mb-1">{project.title}</h1>
        <p className="text-ink/60 mb-6">{project.description}</p>

        {/* Team formation */}
        <section className="border border-line p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-600">Teams</h2>
            <button
              onClick={handleFormTeams}
              disabled={formingTeams}
              className="bg-ink text-paper font-mono text-xs px-3 py-2 hover:bg-signal transition-colors disabled:opacity-50"
            >
              {formingTeams ? "Forming..." : "Run team formation"}
            </button>
          </div>
          {teamFormationMsg && <p className="font-mono text-xs text-signal mb-3">{teamFormationMsg}</p>}
          <div className="flex gap-2 flex-wrap">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTeam(t.id)}
                className={`font-mono text-xs px-3 py-1.5 border ${
                  selectedTeam === t.id ? "border-signal text-signal" : "border-line"
                }`}
              >
                {t.name}
              </button>
            ))}
            {teams.length === 0 && (
              <p className="text-ink/50 font-mono text-xs">
                No teams yet — run team formation to auto-assign students by skill.
              </p>
            )}
          </div>
        </section>

        {selectedTeam && (
          <>
            {/* Members */}
            <section className="mb-8">
              <h2 className="font-display font-600 mb-2">Members</h2>
              <div className="flex gap-2 flex-wrap">
                {members.map((m) => (
                  <span key={m.profile_id} className="font-mono text-xs border border-line px-2 py-1">
                    {m.full_name}
                  </span>
                ))}
              </div>
            </section>

            {/* Task creation */}
            <section className="border border-line p-5 mb-8">
              <h2 className="font-display font-600 mb-3">Add task</h2>
              <form onSubmit={handleCreateTask} className="grid grid-cols-2 gap-3 mb-3">
                <input
                  className="col-span-2 border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
                <div>
                  <label className="block font-mono text-xs text-ink/50 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
                    value={taskDuration}
                    onChange={(e) => setTaskDuration(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs text-ink/50 mb-1">Assign to</label>
                  <select
                    className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                  >
                    {members.map((m) => (
                      <option key={m.profile_id} value={m.profile_id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block font-mono text-xs text-ink/50 mb-1">
                    Depends on (ctrl/cmd-click to select multiple)
                  </label>
                  <select
                    multiple
                    className="w-full border border-line px-3 py-2 bg-transparent focus:border-signal outline-none h-24"
                    value={taskDeps}
                    onChange={(e) =>
                      setTaskDeps(Array.from(e.target.selectedOptions).map((o) => o.value))
                    }
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="col-span-2 bg-signal text-paper font-mono text-sm py-2">
                  Add task
                </button>
              </form>
            </section>

            {/* Kanban board with DAG info */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-600">Task board</h2>
                <span className="font-mono text-xs text-ink/50">
                  critical path: {totalDays} day{totalDays !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {columns.map((col) => (
                  <div key={col.key} className="border border-line p-3 min-h-[120px]">
                    <h3 className="font-mono text-xs uppercase tracking-wide text-ink/50 mb-2">
                      {col.label}
                    </h3>
                    <div className="space-y-2">
                      {tasks
                        .filter((t) => t.status === col.key)
                        .map((t) => {
                          const isCritical = critical.includes(t.id);
                          const isDrifted = drifted.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              className={`border p-2 text-sm ${
                                isDrifted
                                  ? "border-drift bg-drift/5"
                                  : isCritical
                                  ? "border-signal"
                                  : "border-line"
                              }`}
                            >
                              <div className="font-medium">{t.title}</div>
                              <div className="font-mono text-xs text-ink/50 mt-1">
                                {t.duration_days}d
                                {t.planned_finish ? ` · due ${t.planned_finish}` : ""}
                                {isCritical ? " · critical path" : ""}
                              </div>
                              {isDrifted && (
                                <div className="font-mono text-xs text-drift mt-1">⚠ drifting — past due</div>
                              )}
                              <select
                                value={t.status}
                                onChange={(e) => handleStatusChange(t.id, e.target.value)}
                                className="mt-2 w-full font-mono text-xs border border-line bg-transparent"
                              >
                                <option value="todo">To do</option>
                                <option value="in_progress">In progress</option>
                                <option value="done">Done</option>
                              </select>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* GitHub commit telemetry */}
            <section className="border border-line p-5 mb-8">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-600">GitHub commit telemetry</h2>
                <span className="font-mono text-xs text-ink/50 node-pulse rounded-full px-2">
                  {activityCount} logged session{activityCount !== 1 ? "s" : ""} · live
                </span>
              </div>
              <p className="text-xs text-ink/50 mb-3 font-mono">
                Set each member's GitHub username on their Profile page first. Then sync a repo — commits
                by matching usernames become real activity log entries automatically.
                {githubRepo.trim() && " Auto-checks every 90s while this page stays open."}
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-line px-3 py-2 bg-transparent focus:border-signal outline-none font-mono text-sm"
                  placeholder="owner/repo (e.g. octocat/Hello-World)"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                />
                <button
                  onClick={() => handleGithubSync(false)}
                  disabled={syncing}
                  className="bg-ink text-paper font-mono text-xs px-4 hover:bg-signal transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {syncing ? "Syncing..." : "Sync commits"}
                </button>
              </div>
              {syncMsg && <p className="font-mono text-xs text-signal mt-2">{syncMsg}</p>}
              {lastAutoCheck && !syncMsg && (
                <p className="font-mono text-xs text-ink/40 mt-2">Last checked at {lastAutoCheck}</p>
              )}
            </section>

            {/* Email drift reminders */}
            <section className="border border-line p-5 mb-8">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-display font-600">Email deadline reminders</h2>
                <button
                  onClick={handleSendReminders}
                  disabled={reminding}
                  className="bg-ink text-paper font-mono text-xs px-3 py-2 hover:bg-signal transition-colors disabled:opacity-50"
                >
                  {reminding ? "Sending..." : "Send reminders now"}
                </button>
              </div>
              <p className="text-xs text-ink/50 mb-2 font-mono">
                Sent to each student's signup email automatically — no per-student setup needed.
                Overdue (drifting) tasks are auto-checked once when this page loads, and you can trigger it
                manually anytime — at most one reminder per task per day.
              </p>
              {remindMsg && <p className="font-mono text-xs text-signal mt-2">{remindMsg}</p>}
            </section>

            {/* Activity log */}
            <section className="border border-line p-5 mb-8">
              <h2 className="font-display font-600 mb-3">Log activity manually</h2>
              <p className="text-xs text-ink/50 mb-3 font-mono">
                For work that doesn't show up as commits (research, design, planning).
              </p>
              <form onSubmit={handleLogActivity} className="grid grid-cols-3 gap-3">
                <select
                  className="border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
                  value={logProfile}
                  onChange={(e) => setLogProfile(e.target.value)}
                >
                  {members.map((m) => (
                    <option key={m.profile_id} value={m.profile_id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  className="border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
                  placeholder="Minutes active"
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(Number(e.target.value))}
                />
                <input
                  className="border border-line px-3 py-2 bg-transparent focus:border-signal outline-none"
                  placeholder="What did you work on?"
                  value={logDesc}
                  onChange={(e) => setLogDesc(e.target.value)}
                />
                <button className="col-span-3 bg-ink text-paper font-mono text-sm py-2 hover:bg-signal transition-colors">
                  Log session
                </button>
              </form>
            </section>

            {/* Report */}
            <section className="border border-line p-5 mb-16">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-600">Contribution report</h2>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="bg-ink text-paper font-mono text-xs px-3 py-2 hover:bg-signal transition-colors disabled:opacity-50"
                >
                  {generatingReport ? "Generating..." : "Generate report"}
                </button>
              </div>
              {report && (
                <pre className="whitespace-pre-wrap font-mono text-sm bg-ink/[0.03] p-4 border border-line">
                  {report}
                </pre>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
