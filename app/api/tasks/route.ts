import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { scheduleAndDetectDrift, TaskNode } from "@/lib/dag";

export async function POST(req: NextRequest) {
  try {
    const { projectId, teamId, title, duration_days, depends_on, assigned_to } = await req.json();
    if (!projectId || !teamId || !title) {
      return NextResponse.json({ error: "projectId, teamId, and title are required" }, { status: 400 });
    }

    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .insert({
        project_id: projectId,
        team_id: teamId,
        title,
        duration_days: duration_days || 1,
        assigned_to: assigned_to || null,
      })
      .select()
      .single();
    if (error) throw error;

    const depIds: string[] = depends_on || [];
    if (depIds.length) {
      const rows = depIds.map((depId) => ({ task_id: task.id, depends_on_task_id: depId }));
      const { error: depError } = await supabaseAdmin.from("task_dependencies").insert(rows);
      if (depError) throw depError;
    }

    return NextResponse.json({ task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create task" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const teamId = req.nextUrl.searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("team_id", teamId);
    if (error) throw error;

    const { data: deps, error: depError } = await supabaseAdmin
      .from("task_dependencies")
      .select("*")
      .in("task_id", (tasks || []).map((t) => t.id));
    if (depError) throw depError;

    const { data: team } = await supabaseAdmin
      .from("teams")
      .select("*, projects(start_date)")
      .eq("id", teamId)
      .single();

    const nodes: TaskNode[] = (tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      duration_days: t.duration_days,
      status: t.status,
      depends_on: (deps || [])
        .filter((d: any) => d.task_id === t.id)
        .map((d: any) => d.depends_on_task_id),
    }));

    if (nodes.length === 0) {
      return NextResponse.json({ tasks: [], drifted: [], critical: [], totalDays: 0 });
    }

    const startDate = team?.projects?.start_date || new Date().toISOString().slice(0, 10);
    const { scheduled, driftedTaskIds, critical, totalDays } = scheduleAndDetectDrift(nodes, startDate);

    return NextResponse.json({
      tasks: scheduled,
      drifted: driftedTaskIds,
      critical,
      totalDays,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load tasks" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { taskId, status } = await req.json();
    if (!taskId || !status) {
      return NextResponse.json({ error: "taskId and status are required" }, { status: 400 });
    }
    const update: any = { status };
    if (status === "done") update.actual_finish = new Date().toISOString().slice(0, 10);

    const { error } = await supabaseAdmin.from("tasks").update(update).eq("id", taskId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update task" }, { status: 500 });
  }
}
