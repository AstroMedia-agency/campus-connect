import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

type MemberSummary = {
  name: string;
  minutesActive: number;
  activityCount: number;
  tasksDone: number;
  tasksAssigned: number;
};

function ruleBasedReport(projectTitle: string, members: MemberSummary[]): string {
  const lines = [`Contribution report — ${projectTitle}`, ""];
  members.forEach((m) => {
    const hours = (m.minutesActive / 60).toFixed(1);
    const completion = m.tasksAssigned
      ? Math.round((m.tasksDone / m.tasksAssigned) * 100)
      : 0;
    lines.push(
      `${m.name}: logged ${hours}h of active work across ${m.activityCount} sessions. ` +
        `Completed ${m.tasksDone}/${m.tasksAssigned} assigned tasks (${completion}%).`
    );
  });
  lines.push(
    "",
    "This report is generated directly from logged activity and task-completion data, " +
      "without peer input, to minimize evaluation bias."
  );
  return lines.join("\n");
}

async function aiReport(projectTitle: string, members: MemberSummary[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return ruleBasedReport(projectTitle, members);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content:
              `Write an objective, evidence-based student contribution report for the project "${projectTitle}". ` +
              `Use only the data below — do not invent details. For each student, note their active work time, ` +
              `number of activity sessions, and task completion rate. Keep it factual and neutral, one short ` +
              `paragraph per student, no grades or rankings.\n\nData:\n${JSON.stringify(members, null, 2)}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const text = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");
    return text || ruleBasedReport(projectTitle, members);
  } catch {
    return ruleBasedReport(projectTitle, members);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { teamId } = await req.json();
    if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("*, projects(title, id)")
      .eq("id", teamId)
      .single();
    if (teamError || !team) throw teamError || new Error("Team not found");

    const { data: members, error: membersError } = await supabaseAdmin
      .from("team_members")
      .select("profile_id, profiles(full_name)")
      .eq("team_id", teamId);
    if (membersError) throw membersError;

    const { data: logs } = await supabaseAdmin
      .from("activity_logs")
      .select("*")
      .eq("team_id", teamId);

    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("team_id", teamId);

    const summaries: MemberSummary[] = (members || []).map((m: any) => {
      const myLogs = (logs || []).filter((l: any) => l.profile_id === m.profile_id);
      const myTasks = (tasks || []).filter((t: any) => t.assigned_to === m.profile_id);
      return {
        name: m.profiles.full_name,
        minutesActive: myLogs.reduce((sum: number, l: any) => sum + (l.minutes_active || 0), 0),
        activityCount: myLogs.length,
        tasksDone: myTasks.filter((t: any) => t.status === "done").length,
        tasksAssigned: myTasks.length,
      };
    });

    const content = await aiReport(team.projects.title, summaries);

    const { data: report, error: reportError } = await supabaseAdmin
      .from("reports")
      .insert({ project_id: team.projects.id, team_id: teamId, content })
      .select()
      .single();
    if (reportError) throw reportError;

    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate report" }, { status: 500 });
  }
}
