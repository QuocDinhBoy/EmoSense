import { Link } from "react-router-dom";
import { CheckCircle2, Lock, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Activity = "flashcards" | "match" | "camera" | "scenario" | "journal";

interface LessonDef {
  n: number;
  title: string;
  desc: string;
  to: string;
  activity: Activity;
  /** Số lần làm đúng cần để coi là hoàn thành */
  threshold: number;
  /** Số sao thưởng gợi ý */
  reward: number;
}

const lessons: LessonDef[] = [
  { n: 1, title: "Làm quen cảm xúc", desc: "Vui, Buồn, Giận", to: "/app/flashcards", activity: "flashcards", threshold: 3, reward: 3 },
  { n: 2, title: "Thêm cảm xúc nữa", desc: "Sợ, Ngạc nhiên, Bình yên", to: "/app/flashcards", activity: "flashcards", threshold: 6, reward: 3 },
  { n: 3, title: "Ghép khuôn mặt", desc: "Khuôn mặt ↔ Cảm xúc", to: "/app/match", activity: "match", threshold: 3, reward: 4 },
  { n: 4, title: "Thể hiện cảm xúc", desc: "Luyện qua camera", to: "/app/camera", activity: "camera", threshold: 1, reward: 5 },
  { n: 5, title: "Tình huống thực tế", desc: "Câu chuyện tình huống", to: "/app/scenarios", activity: "scenario", threshold: 2, reward: 4 },
  { n: 6, title: "Giờ kể chuyện", desc: "Đọc & cảm nhận", to: "/app/scenarios", activity: "scenario", threshold: 4, reward: 4 },
  { n: 7, title: "Bình tĩnh lại", desc: "Ghi nhật ký cảm xúc", to: "/app/journal", activity: "journal", threshold: 1, reward: 5 },
];

const LearningMap = () => {
  const { user } = useAuth();
  const [correctByActivity, setCorrectByActivity] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (!user) { setLoaded(true); return; }
    const [progressRes, journalRes] = await Promise.all([
      supabase.from("progress").select("activity, correct").eq("user_id", user.id),
      supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    const totals: Record<string, number> = {};
    (progressRes.data ?? []).forEach((r: any) => {
      totals[r.activity] = (totals[r.activity] ?? 0) + (r.correct ?? 0);
    });
    totals["journal"] = journalRes.count ?? 0;
    setCorrectByActivity(totals);
    setLoaded(true);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`progress-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "progress", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Tính trạng thái: done nếu đã đạt threshold, current nếu là bài đầu tiên chưa done, locked nếu bài trước chưa đụng tới
  const computed = (() => {
    let firstUndone = -1;
    return lessons.map((l, i) => {
      const correct = correctByActivity[l.activity] ?? 0;
      const done = correct >= l.threshold;
      let status: "done" | "current" | "locked" = "locked";
      if (done) status = "done";
      else if (firstUndone === -1) {
        status = "current";
        firstUndone = i;
      } else status = "locked";
      return { ...l, status, correct };
    });
  })();

  const doneCount = computed.filter(l => l.status === "done").length;
  const pct = Math.round((doneCount / lessons.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Bản đồ học tập của bạn</h1>
        <p className="text-muted-foreground text-lg">Mỗi ngày một bước nhỏ thôi nhé.</p>
      </div>

      <div className="card-soft p-4 md:p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display font-bold text-sm">Tiến trình</span>
          <span className="font-display text-sm text-muted-foreground">{doneCount}/{lessons.length} bài</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-gradient-mint transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="relative">
        {!loaded ? (
          <div className="grid gap-5 md:grid-cols-2" aria-busy="true" aria-label="Đang tải tiến trình">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card-soft p-6 flex items-center gap-5 animate-pulse">
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-1/2 bg-muted rounded" />
                  <div className="h-4 w-2/3 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {computed.map((l, i) => {
              const locked = l.status === "locked";
              const done = l.status === "done";
              const Tag: any = locked ? "div" : Link;
              return (
                <motion.div key={l.n} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Tag
                    to={l.to}
                    aria-label={`Bài ${l.n}: ${l.title}${done ? " (đã hoàn thành)" : locked ? " (chưa mở)" : ""}`}
                    className={`card-soft p-6 flex items-center gap-5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${locked ? "opacity-60" : "hover:shadow-float"}`}
                  >
                    <div className={`shrink-0 w-16 h-16 rounded-2xl shadow-soft flex items-center justify-center font-display text-2xl font-bold ${
                      done ? "bg-gradient-mint" : locked ? "bg-muted" : "bg-gradient-sky"
                    }`}>
                      {l.n}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-xl font-bold">{l.title}</h3>
                      <p className="text-muted-foreground">{l.desc}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground font-display">⭐ +{l.reward} sao</span>
                    </div>
                    {done && <CheckCircle2 className="w-7 h-7 text-emo-calm shrink-0" aria-hidden />}
                    {locked && <Lock className="w-6 h-6 text-muted-foreground shrink-0" aria-hidden />}
                    {l.status === "current" && <Play className="w-7 h-7 text-primary shrink-0" aria-hidden />}
                  </Tag>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningMap;
