import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Manual activity log entry — simulates the "telemetry" a VS Code extension
// would normally stream in. Good enough for a local demo without building
// a full editor extension.
export async function POST(req: NextRequest) {
  try {
    const { profileId, teamId, description, minutesActive } = await req.json();
    if (!profileId || !teamId) {
      return NextResponse.json({ error: "profileId and teamId are required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("activity_logs").insert({
      profile_id: profileId,
      team_id: teamId,
      source: "manual",
      description: description || null,
      minutes_active: minutesActive || 0,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to log activity" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const teamId = req.nextUrl.searchParams.get("teamId");
    if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("activity_logs")
      .select("*, profiles(full_name)")
      .eq("team_id", teamId)
      .order("occurred_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({ logs: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load activity" }, { status: 500 });
  }
}
