"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import PageLoader from "@/components/PageLoader";

type Invitation = {
  id: string;
  project_id: string;
  status: "pending" | "accepted" | "declined";
  team_id: string | null;
  invited_at: string;
  projects: { title: string; description: string | null; required_skills: string[]; team_size: number } | null;
  teams: { name: string } | null;
};

export default function InvitationsPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        router.push("/login");
        return;
      }
      await loadInvites(session.session.user.id);
      setLoading(false);
    }
    init();
  }, []);

  async function loadInvites(userId: string) {
    const { data } = await supabase
      .from("project_invitations")
      .select("id, project_id, status, team_id, invited_at, projects(title, description, required_skills, team_size), teams(name)")
      .eq("profile_id", userId)
      .order("invited_at", { ascending: false });
    setInvites((data as any) || []);
  }

  async function respond(invitationId: string, action: "accept" | "decline") {
    setBusyId(invitationId);
    setMsg(null);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch("/api/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ invitationId, action }),
    });
    const data = await res.json();
    setBusyId(null);

    if (data.error) {
      setMsg(data.error);
    } else if (data.status === "declined") {
      setMsg("Invitation declined.");
    } else if (data.teamsFormed?.length) {
      setMsg(`Accepted! Teams have been formed: ${data.teamsFormed.map((t: any) => t.team.name).join(", ")}.`);
    } else {
      setMsg(
        `Accepted! Your team will be formed once the other invited students respond` +
          (data.pendingLeft ? ` (${data.pendingLeft} still pending).` : ".")
      );
    }
    if (session.session) await loadInvites(session.session.user.id);
    window.dispatchEvent(new Event("invitations-changed")); // refresh the navbar badge
  }

  if (loading) return <PageLoader />;

  const pending = invites.filter((i) => i.status === "pending");
  const answered = invites.filter((i) => i.status !== "pending");

  return (
    <main>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-up">
        <h1 className="font-display text-2xl font-700 mb-1">Invitations</h1>
        <p className="text-ink/60 mb-6 text-sm">
          Project invitations sent to you. Teams are formed only from students who accept.
        </p>

        {msg && <p className="font-mono text-xs text-signal mb-4">{msg}</p>}

        <h2 className="font-display font-600 mb-2">Waiting for your reply ({pending.length})</h2>
        <div className="space-y-3 mb-10">
          {pending.length === 0 && <p className="font-mono text-xs text-ink/50">No pending invitations.</p>}
          {pending.map((inv) => (
            <div key={inv.id} className="border border-signal p-4">
              <div className="font-display font-600">{inv.projects?.title}</div>
              {inv.projects?.description && <p className="text-sm text-ink/60 mt-1">{inv.projects.description}</p>}
              <div className="font-mono text-xs text-ink/50 mt-2">
                skills: {(inv.projects?.required_skills || []).join(", ") || "—"} · team size{" "}
                {inv.projects?.team_size} · invited {new Date(inv.invited_at).toLocaleDateString()}
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2 mt-3">
                <button
                  onClick={() => respond(inv.id, "accept")}
                  disabled={busyId === inv.id}
                  className="btn-accent text-paper font-mono text-xs px-4 py-2 disabled:opacity-50"
                >
                  {busyId === inv.id ? "..." : "Accept"}
                </button>
                <button
                  onClick={() => respond(inv.id, "decline")}
                  disabled={busyId === inv.id}
                  className="border border-line font-mono text-xs px-4 py-2 hover:border-drift hover:text-drift disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-display font-600 mb-2">Answered</h2>
        <div className="space-y-2">
          {answered.length === 0 && <p className="font-mono text-xs text-ink/50">Nothing here yet.</p>}
          {answered.map((inv) => (
            <div key={inv.id} className="card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-medium">{inv.projects?.title}</div>
                <div className="font-mono text-xs text-ink/50">
                  {inv.status === "declined"
                    ? "declined"
                    : inv.teams
                    ? `accepted · placed in ${inv.teams.name}`
                    : "accepted · waiting for team formation"}
                </div>
              </div>
              {inv.status === "accepted" && (
                <Link href={`/projects/${inv.project_id}`} className="font-mono text-xs text-signal">
                  Open project →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
