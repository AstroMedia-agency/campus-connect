import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

// GET /api/students?skill=ml&minLevel=3
// Candidate discovery: shortlist students whose skill matrix meets a threshold,
// also respecting the academic gatekeeper (attendance >= 70%, 0 backlogs).
export async function GET(req: NextRequest) {
  try {
    const skill = req.nextUrl.searchParams.get("skill");
    const minLevel = Number(req.nextUrl.searchParams.get("minLevel") || 1);

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, skills, attendance_pct, backlogs, weekly_hours")
      .eq("role", "student");
    if (error) throw error;

    let results = (profiles || []).filter(
      (p: any) => p.attendance_pct >= 70 && p.backlogs === 0
    );

    if (skill) {
      results = results.filter((p: any) => (p.skills?.[skill] || 0) >= minLevel);
      results.sort((a: any, b: any) => (b.skills?.[skill] || 0) - (a.skills?.[skill] || 0));
    }

    return NextResponse.json({ students: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
