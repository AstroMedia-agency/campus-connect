import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { formTeams, Student } from "@/lib/teamFormation";

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("role", "student");
    if (profilesError) throw profilesError;

    const students: Student[] = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.full_name,
      skills: p.skills || {},
      weekly_hours: p.weekly_hours,
      attendance_pct: p.attendance_pct,
      backlogs: p.backlogs,
    }));

    const requiredSkills: string[] = project.required_skills || [];
    const teams = formTeams(students, requiredSkills, project.team_size);

    if (teams.length === 0 || teams.every((t) => t.members.length === 0)) {
      return NextResponse.json(
        { error: "No eligible students available (check attendance/backlogs/skills data)." },
        { status: 400 }
      );
    }

    // Persist teams + members
    const createdTeams = [];
    for (let i = 0; i < teams.length; i++) {
      const { data: teamRow, error: teamError } = await supabaseAdmin
        .from("teams")
        .insert({ project_id: projectId, name: `Team ${i + 1}` })
        .select()
        .single();
      if (teamError) throw teamError;

      const memberRows = teams[i].members.map((m) => ({
        team_id: teamRow.id,
        profile_id: m.id,
      }));
      if (memberRows.length) {
        const { error: memberError } = await supabaseAdmin.from("team_members").insert(memberRows);
        if (memberError) throw memberError;
      }

      createdTeams.push({
        team: teamRow,
        members: teams[i].members.map((m) => m.name),
        skillCoverage: teams[i].skillCoverage,
      });
    }

    return NextResponse.json({ teams: createdTeams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Team formation failed" }, { status: 500 });
  }
}
