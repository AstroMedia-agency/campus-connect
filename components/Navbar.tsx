"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCurrentProfile } from "@/lib/useCurrentProfile";

const LINKS = [
  { href: "/dashboard", label: "Projects" },
  { href: "/students", label: "Find candidates" },
  { href: "/invitations", label: "Invitations" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { name } = useCurrentProfile();
  const [pendingCount, setPendingCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the phone menu whenever the page changes.
  useEffect(() => setMenuOpen(false), [pathname]);

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
      // already subscribed causes a runtime error.
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
    // Forget that the welcome was shown, so it plays again on the next login.
    try {
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("cc-welcome-"))
        .forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // storage unavailable - nothing to clear
    }
    await supabase.auth.signOut();
    router.push("/login");
  }

  const badge = (extra = "") =>
    pendingCount > 0 ? (
      <span className={`bg-signal text-paper text-xs px-1.5 leading-5 rounded-full ${extra}`}>{pendingCount}</span>
    ) : null;

  const linkClass = (href: string) =>
    `hover:text-signal ${pathname?.startsWith(href) ? "text-signal" : ""}`;

  return (
    <nav className="sticky top-0 z-40 border-b border-line/80 bg-paper/75 backdrop-blur-md font-mono text-sm">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="font-display font-700 text-base shrink-0 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg btn-accent text-paper text-xs flex items-center justify-center">CC</span>
          CampusConnect
        </Link>

        {/* Desktop / tablet: everything in one row */}
        <div className="hidden md:flex gap-6 items-center">
          {name && (
            <span className="text-ink/60 truncate max-w-[220px]" title={name}>
              Welcome, <span className="text-gradient font-medium">{name}</span>
            </span>
          )}
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`${linkClass(l.href)} flex items-center gap-1`}>
              {l.label}
              {l.href === "/invitations" && badge()}
            </Link>
          ))}
          <button onClick={handleLogout} className="hover:text-drift">
            Log out
          </button>
        </div>

        {/* Phone: menu button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden relative p-2 -mr-2"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
          {!menuOpen && pendingCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-signal rounded-full" />
          )}
        </button>
      </div>

      {/* Phone: greeting always visible under the top bar */}
      {name && (
        <div className="md:hidden px-4 pb-3 -mt-1 text-xs text-ink/60 truncate">
          Welcome, <span className="text-ink font-medium">{name}</span>
        </div>
      )}

      {/* Phone: dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-line px-4 py-2 flex flex-col">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`${linkClass(l.href)} py-3 border-b border-line/60 flex items-center justify-between`}
            >
              {l.label}
              {l.href === "/invitations" && badge()}
            </Link>
          ))}
          <button onClick={handleLogout} className="py-3 text-left hover:text-drift">
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
