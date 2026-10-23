import { supabaseAdmin } from "@/lib/supabaseServer";
import { formTeams, Student } from "@/lib/teamFormation";

export type FormedTeam = {
  team: { id: string; name: string };
  members: string[];
  skillCoverage: Record<string, number>;
};

/**
 * Forms balanced teams for a project using ONLY students who accepted their
 * invitation and are not yet placed in a team. Uses the same balancing
 * algorithm as before (lib/teamFormation.ts) — only the input pool changed.
 *
 * Existing teams are never touched, so tasks/activity already added to them
 * stay safe. Students accepted later go into new teams on the next run.
 */
export async function formTeamsFromAccepted(projectId: string): Promise<FormedTeam[]> {
  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (projectError || !project) throw new Error("Project not found");

  const { data: invites, error: invitesError } = await supabaseAdmin
    .from("project_invitations")
    .select("id, profile_id")
    .eq("project_id", projectId)
    .eq("status", "accepted")
    .is("team_id", null);
  if (invitesError) throw invitesError;
  if (!invites || invites.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("id", invites.map((i) => i.profile_id));
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
  const teams = formTeams(students, requiredSkills, project.team_size).filter(
    (t) => t.members.length > 0
  );
  if (teams.length === 0) return [];

  // Continue numbering after any teams this project already has.
  const { count: existingCount } = await supabaseAdmin
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const created: FormedTeam[] = [];
  for (let i = 0; i < teams.length; i++) {
    const { data: teamRow, error: teamError } = await supabaseAdmin
      .from("teams")
      .insert({ project_id: projectId, name: `Team ${(existingCount || 0) + i + 1}` })
      .select()
      .single();
    if (teamError) throw teamError;

    const memberIds = teams[i].members.map((m) => m.id);
    const { error: memberError } = await supabaseAdmin
      .from("team_members")
      .insert(memberIds.map((id) => ({ team_id: teamRow.id, profile_id: id })));
    if (memberError) throw memberError;

    // Mark these invitations as placed. This update also fires a realtime
    // event AFTER the team exists, so open project pages refresh and show it.
    const { error: linkError } = await supabaseAdmin
      .from("project_invitations")
      .update({ team_id: teamRow.id })
      .eq("project_id", projectId)
      .in("profile_id", memberIds);
    if (linkError) throw linkError;

    created.push({
      team: { id: teamRow.id, name: teamRow.name },
      members: teams[i].members.map((m) => m.name),
      skillCoverage: teams[i].skillCoverage,
    });
  }

  return created;
}
