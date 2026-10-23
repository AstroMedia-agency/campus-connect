import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Reads the logged-in user's access token from the "Authorization: Bearer <token>"
// header and asks Supabase who it belongs to. Used where the server must be sure
// WHO is calling (e.g. only the invited student may accept their own invitation).
export async function getUserFromRequest(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
