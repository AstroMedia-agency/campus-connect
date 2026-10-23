"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Returns the logged-in user's id and display name (from the profiles table),
// used for the "Welcome, <name>" greeting. Falls back to the part of the email
// before "@" if the profile has no name yet.
export function useCurrentProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user || cancelled) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      setName(profile?.full_name?.trim() || user.email?.split("@")[0] || "there");
    }

    load();
    // Profile page fires this after "Save profile", so a changed name shows at once.
    window.addEventListener("profile-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("profile-changed", load);
    };
  }, []);

  return { userId, name };
}
