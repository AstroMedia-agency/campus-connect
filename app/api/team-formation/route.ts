import { NextRequest, NextResponse } from "next/server";
import { formTeamsFromAccepted } from "@/lib/formTeamsFromAccepted";

// POST { projectId } -> "Form teams now" button.
// Forms teams immediately from students who have ACCEPTED their invitation and
// are not in a team yet — useful when some invited students never reply.
// (Teams also form automatically once every invited student has responded.)
export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const teams = await formTeamsFromAccepted(projectId);
    if (teams.length === 0) {
      return NextResponse.json(
        {
          error:
            "No accepted candidates waiting for a team. Invite eligible students and wait for them to accept.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ teams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Team formation failed" }, { status: 500 });
  }
}
