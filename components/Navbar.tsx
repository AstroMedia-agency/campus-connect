"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const router = useRouter();

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
