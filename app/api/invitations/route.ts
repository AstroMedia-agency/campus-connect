import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getUserFromRequest } from "@/lib/authFromRequest";
import { sendReminderEmail } from "@/lib/email";
import { formTeamsFromAccepted } from "@/lib/formTeamsFromAccepted";

const ELIGIBLE_MIN_ATTENDANCE = 70;

// GET /api/invitations?projectId=... -> every invitation for a project, with the student's name.
export async function GET(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("project_invitations")
      .select("*, profiles!project_invitations_profile_id_fkey(full_name), teams(name)")
      .eq("project_id", projectId)
      .order("invited_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ invitations: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load invitations" }, { status: 500 });
  }
}

// POST { projectId, profileIds: string[] } -> invite the selected eligible students.
// Sends each one an email and creates the in-app notification (the invitation row itself).
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

    const { projectId, profileIds } = await req.json();
    if (!projectId || !Array.isArray(profileIds) || profileIds.length === 0) {
      return NextResponse.json({ error: "Select at least one candidate." }, { status: 400 });
    }

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, title, description, required_skills, team_size")
      .eq("id", projectId)
      .single();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Re-check eligibility on the server — never trust the browser's list alone.
    const { data: students } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, attendance_pct, backlogs")
      .in("id", profileIds);
    const eligible = (students || []).filter(
      (s: any) => s.role === "student" && s.attendance_pct >= ELIGIBLE_MIN_ATTENDANCE && s.backlogs === 0
    );

    const { data: existing } = await supabaseAdmin
      .from("project_invitations")
      .select("profile_id, status")
      .eq("project_id", projectId)
      .in("profile_id", eligible.map((s: any) => s.id));
    const statusById = new Map((existing || []).map((e: any) => [e.profile_id, e.status]));

    // Skip students already pending/accepted; re-invite only those who declined or were never invited.
    const toInvite = eligible.filter((s: any) => {
      const st = statusById.get(s.id);
      return !st || st === "declined";
    });

    if (toInvite.length === 0) {
      return NextResponse.json({
        invited: 0,
        emailed: 0,
        message: "Everyone selected is already invited, already accepted, or not eligible.",
      });
    }

    const now = new Date().toISOString();
    const { error: upsertError } = await supabaseAdmin.from("project_invitations").upsert(
      toInvite.map((s: any) => ({
        project_id: projectId,
        profile_id: s.id,
        invited_by: user.id,
        status: "pending",
        team_id: null,
        invited_at: now,
        responded_at: null,
      })),
      { onConflict: "project_id,profile_id" }
    );
    if (upsertError) throw upsertError;

    // Email link: APP_URL if you set one after deploying, otherwise the address
    // the app is running on right now (http://localhost:3000 in development).
    const appUrl = process.env.APP_URL || req.nextUrl.origin;
    let emailed = 0;
    const errors: string[] = [];

    for (const s of toInvite as any[]) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(s.id);
      const email = userData?.user?.email;
      if (!email) {
        errors.push(`${s.full_name}: no email on file`);
        continue;
      }
      const subject = `You're invited to join "${project.title}" on CampusConnect`;
      const body =
        `Hi ${s.full_name},\n\n` +
        `You have been invited to join the project "${project.title}".\n` +
        (project.description ? `\nAbout the project: ${project.description}\n` : "") +
        `\nRequired skills: ${(project.required_skills || []).join(", ") || "not specified"}\n` +
        `Team size: ${project.team_size}\n\n` +
        `Log in and open your invitations to accept or decline:\n${appUrl}/invitations\n\n` +
        `Teams are formed from the students who accept.\n\n— CampusConnect`;
      try {
        await sendReminderEmail(email, subject, body);
        emailed++;
      } catch (err: any) {
        errors.push(`${s.full_name}: ${err.message}`);
      }
    }

    return NextResponse.json({ invited: toInvite.length, emailed, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send invitations" }, { status: 500 });
  }
}

// PATCH { invitationId, action: "accept" | "decline" } -> the invited student responds.
// When nobody on the project is still "pending", teams are formed automatically
// from the accepted students.
export async function PATCH(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

    const { invitationId, action } = await req.json();
    if (!invitationId || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "invitationId and a valid action are required" }, { status: 400 });
    }

    const { data: invite } = await supabaseAdmin
      .from("project_invitations")
      .select("*")
      .eq("id", invitationId)
      .single();
    if (!invite) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    if (invite.profile_id !== user.id) {
      return NextResponse.json({ error: "This invitation belongs to another student." }, { status: 403 });
    }
    if (invite.status !== "pending") {
      return NextResponse.json({ error: `You already ${invite.status} this invitation.` }, { status: 400 });
    }

    const status = action === "accept" ? "accepted" : "declined";
    const { error: updateError } = await supabaseAdmin
      .from("project_invitations")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", invitationId);
    if (updateError) throw updateError;

    // Auto team formation: once every invited student has answered.
    const { count: pendingCount } = await supabaseAdmin
      .from("project_invitations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", invite.project_id)
      .eq("status", "pending");

    let teamsFormed: { team: { name: string }; members: string[] }[] = [];
    if ((pendingCount || 0) === 0) {
      teamsFormed = await formTeamsFromAccepted(invite.project_id);
    }

    return NextResponse.json({ status, pendingLeft: pendingCount || 0, teamsFormed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to respond" }, { status: 500 });
  }
}
