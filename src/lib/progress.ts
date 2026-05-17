import { supabase } from "@/integrations/supabase/client";
import type { EmotionKey } from "@/data/emotions";

export async function logProgress(opts: {
  userId: string;
  activity: "flashcards" | "match" | "camera" | "scenario";
  emotion: EmotionKey;
  correct: boolean;
}) {
  // Upsert with manual increment
  const { data: existing } = await supabase
    .from("progress")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("activity", opts.activity)
    .eq("emotion", opts.emotion)
    .maybeSingle();

  if (existing) {
    await supabase.from("progress").update({
      attempts: (existing as any).attempts + 1,
      correct: (existing as any).correct + (opts.correct ? 1 : 0),
      last_at: new Date().toISOString(),
    }).eq("id", (existing as any).id);
  } else {
    await supabase.from("progress").insert({
      user_id: opts.userId,
      activity: opts.activity,
      emotion: opts.emotion,
      attempts: 1,
      correct: opts.correct ? 1 : 0,
    });
  }
}
