"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  // In-app notification: number of invitations waiting for this student's reply.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // Set when this Navbar unmounts (page change, or React dev mode's double-mount),
    // so a subscribe() that finishes AFTER unmount doesn't leave a stray channel behind.
    let cancelled = false;

    async function loadCount() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) return;
      const { count } = await supabase
        .from("project_invitations")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", userId)
        .eq("status", "pending");
      setPendingCount(count || 0);
    }

    async function subscribe() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId || cancelled) return;
      // A new invitation shows up on the badge instantly, without a refresh.
      // The random suffix gives every Navbar its own channel. Supabase hands back
      // an EXISTING channel when the name repeats, and adding .on() to one that is
      // already subscribed is what caused the runtime error.
      channel = supabase
        .channel(`invites-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "project_invitations", filter: `profile_id=eq.${userId}` },
          () => loadCount()
        )
        .subscribe();
    }

    loadCount();
    subscribe();
    window.addEventListener("invitations-changed", loadCount);
    return () => {
      cancelled = true;
      window.removeEventListener("invitations-changed", loadCount);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="border-b border-line px-6 py-4 flex items-center justify-between font-mono text-sm">
      <Link href="/dashboard" className="font-display font-700 text-base">
        CampusConnect
      </Link>
      <div className="flex gap-6 items-center">
        <Link href="/dashboard" className="hover:text-signal">
          Projects
        </Link>
        <Link href="/students" className="hover:text-signal">
          Find candidates
        </Link>
        <Link href="/invitations" className="hover:text-signal flex items-center gap-1">
          Invitations
          {pendingCount > 0 && (
            <span className="bg-signal text-paper text-xs px-1.5 leading-5 rounded-full">{pendingCount}</span>
          )}
        </Link>
        <Link href="/profile" className="hover:text-signal">
          Profile
        </Link>
        <button onClick={handleLogout} className="hover:text-drift">
          Log out
        </button>
      </div>
    </nav>
  );
}
