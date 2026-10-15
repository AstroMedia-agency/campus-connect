import { createClient } from "@supabase/supabase-js";

// Uses the service role key so API routes can bypass RLS for the
// team-formation / DAG / report-generation logic that reads across students.
// NEVER expose this key on the client — it only lives in server-side route files.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
