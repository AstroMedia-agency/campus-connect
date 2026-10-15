import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fetchRecentCommits, MINUTES_PER_COMMIT } from "@/lib/github";

// POST { teamId, repo? } — repo overrides the team's saved github_repo if provided.
// Matches each commit's GitHub author login against team members' profiles.github_username,
// then inserts one activity_log row per new commit (deduped by commit_sha).
export async function POST(req: NextRequest) {
  try {
    const { teamId, repo } = await req.json();
    if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

    const { data: team, error: teamError } = await supabaseAdmin
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();
    if (teamError || !team) throw teamError || new Error("Team not found");

    const repoToUse = repo || team.github_repo;
    if (!repoToUse) {
      return NextResponse.json(
        { error: "No repo set. Provide one as 'owner/repo' (e.g. octocat/Hello-World)." },
        { status: 400 }
      );
    }

    // Save the repo on the team for next time, if it changed
    if (repo && repo !== team.github_repo) {
      await supabaseAdmin.from("teams").update({ github_repo: repo }).eq("id", teamId);
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from("team_members")
      .select("profile_id, profiles(github_username, full_name)")
      .eq("team_id", teamId);
    if (membersError) throw membersError;

    const usernameToProfile = new Map<string, string>();
    (members || []).forEach((m: any) => {
      if (m.profiles?.github_username) {
        usernameToProfile.set(m.profiles.github_username.toLowerCase(), m.profile_id);
      }
    });

    if (usernameToProfile.size === 0) {
      return NextResponse.json(
        { error: "No team members have a GitHub username set on their profile yet." },
        { status: 400 }
      );
    }

    const commits = await fetchRecentCommits(repoToUse);

    const rows = commits
      .filter((c) => c.authorLogin && usernameToProfile.has(c.authorLogin.toLowerCase()))
      .map((c) => ({
        profile_id: usernameToProfile.get(c.authorLogin!.toLowerCase()),
        team_id: teamId,
        source: "github" as const,
        description: c.message,
        minutes_active: MINUTES_PER_COMMIT,
        commit_sha: c.sha,
        occurred_at: c.date,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ inserted: 0, message: "No matching commits found for this team's members." });
    }

    // Dedup on commit_sha via upsert (ignoreDuplicates) so re-running this never double-counts.
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("activity_logs")
      .upsert(rows, { onConflict: "commit_sha", ignoreDuplicates: true })
      .select();
    if (insertError) throw insertError;

    return NextResponse.json({ inserted: inserted?.length || 0, totalCommitsChecked: commits.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "GitHub sync failed" }, { status: 500 });
  }
}
