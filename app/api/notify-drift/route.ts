import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { scheduleAndDetectDrift, TaskNode } from "@/lib/dag";
import { sendReminderEmail } from "@/lib/email";

// POST { teamId } — finds tasks that are drifting (past due, not done), and
// emails each assignee a reminder, once per day per task (tracked via
// tasks.last_notified_at so this is safe to call repeatedly / automatically).
//
// Uses each student's signup email (fetched via Supabase Auth admin API) —
// no per-student setup required, unlike the earlier WhatsApp approach.
export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();
    if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("*, projects(title, start_date)")
      .eq("id", teamId)
      .single();
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const { data: tasks } = await supabaseAdmin.from("tasks").select("*").eq("team_id", teamId);
    const { data: deps } = await supabaseAdmin
      .from("task_dependencies")
      .select("*")
      .in("task_id", (tasks || []).map((t) => t.id));

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ sent: 0, message: "No tasks yet." });
    }

    const nodes: TaskNode[] = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      duration_days: t.duration_days,
      status: t.status,
      depends_on: (deps || []).filter((d: any) => d.task_id === t.id).map((d: any) => d.depends_on_task_id),
    }));

    const startDate = team.projects.start_date;
    const { driftedTaskIds } = scheduleAndDetectDrift(nodes, startDate);

    const today = new Date().toISOString().slice(0, 10);
    const toNotify = tasks.filter(
      (t: any) =>
        driftedTaskIds.includes(t.id) &&
        t.assigned_to &&
        t.last_notified_at !== today
    );

    if (toNotify.length === 0) {
      return NextResponse.json({ sent: 0, message: "No new drift reminders needed right now." });
    }

    const assigneeIds = [...new Set(toNotify.map((t: any) => t.assigned_to))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", assigneeIds);
    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));

    let sent = 0;
    const errors: string[] = [];

    for (const task of toNotify) {
      const profile = profileById.get(task.assigned_to);
      if (!profile) continue;

      // Look up the student's signup email via Supabase Auth — no separate
      // "email" field needed on profiles, it stays in sync automatically.
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(task.assigned_to);
      const email = userData?.user?.email;
      if (userError || !email) {
        errors.push(`${profile.full_name}: no email on file`);
        continue;
      }

      const subject = `Reminder: "${task.title}" is overdue`;
      const body =
        `Hi ${profile.full_name},\n\n` +
        `Your task "${task.title}" on project "${team.projects.title}" is past its planned ` +
        `finish date and is still marked "${task.status.replace("_", " ")}".\n\n` +
        `Please update its status or check in with your team.\n\n— CampusConnect`;

      try {
        await sendReminderEmail(email, subject, body);
        await supabaseAdmin.from("tasks").update({ last_notified_at: today }).eq("id", task.id);
        sent++;
      } catch (err: any) {
        errors.push(`${profile.full_name}: ${err.message}`);
      }
    }

    return NextResponse.json({ sent, skipped: toNotify.length - sent, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send reminders" }, { status: 500 });
  }
}
