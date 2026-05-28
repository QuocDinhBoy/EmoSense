import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  display_name: string;
  avatar: string;
  reduced_motion: boolean;
  large_text: boolean;
  sound_on: boolean;
  stars: number;
  level: number;
  streak: number;
  last_active_date: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile((data as any) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: tự cập nhật khi profile (stars/level/streak…) thay đổi
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          setProfile(payload.new as any);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Daily streak bookkeeping
  useEffect(() => {
    if (!profile || !user) return;
    const today = new Date().toISOString().slice(0, 10);
    if (profile.last_active_date === today) return;
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
    const newStreak = profile.last_active_date === yesterday ? profile.streak + 1 : 1;
    supabase.from("profiles").update({ last_active_date: today, streak: newStreak }).eq("id", user.id).then(refresh);
  }, [profile, user, refresh]);

  const update = async (patch: Partial<Profile>) => {
    if (!user) return;
    await supabase.from("profiles").update(patch).eq("id", user.id);
    refresh();
  };

  const addStars = async (n: number) => {
    if (!user || !profile) return;
    await supabase.from("profiles").update({ stars: profile.stars + n }).eq("id", user.id);
    refresh();
  };

  return { profile, loading, refresh, update, addStars };
}
