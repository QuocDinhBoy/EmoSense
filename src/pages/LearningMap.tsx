import { Link } from "react-router-dom";
import { Lock, Play, Star, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Icon3D, type Icon3DName } from "@/components/Icon3D";
import {
  STAGES,
  ALL_LESSONS,
  lessonHref,
  type Lesson,
  type LessonActivity,
} from "@/data/lessons";
import { getLessonState, useLessonProgressTick } from "@/lib/lessonProgress";
import { cn } from "@/lib/utils";

/* ─── Map activity → 3D icon name ─── */
const ACTIVITY_ICON: Record<LessonActivity, Icon3DName> = {
  flashcards: "flashcards",
  match: "match",
  scenario: "scenarios",
  camera: "camera",
  journal: "journal",
};

const ACTIVITY_LABEL: Record<LessonActivity, string> = {
  flashcards: "Thẻ học",
  match: "Ghép",
  scenario: "Tình huống",
  camera: "Camera",
  journal: "Nhật ký",
};

/* ─── Stage icon (dùng icon 3D thay số) ─── */
const STAGE_ICON: Icon3DName[] = [
  "sparkles", // Stage 1
  "star",     // Stage 2
  "learn",    // Stage 3
  "scenarios",// Stage 4
  "camera",   // Stage 5
  "heart",    // Stage 6
];

/* ─── Component ─── */
const LearningMap = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const tick = useLessonProgressTick();
  const [serverCorrect, setServerCorrect] = useState<Record<string, number>>({});
  const [journalCount, setJournalCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const currentRef = useRef<HTMLDivElement>(null);

  /* ─── Data loading ─── */
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
    setServerCorrect(totals);
    setJournalCount(journalRes.count ?? 0);
    setLoaded(true);
  };

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`progress-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "progress", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "journal_entries", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ─── Compute lesson states ─── */
  void tick;
  const lessonStateFor = (l: Lesson) => {
    const ls = getLessonState(l.id);
    const serverActivityKey = l.activity === "scenario" ? "scenario" : l.activity;
    const serverHits = l.activity === "journal" ? journalCount : (serverCorrect[serverActivityKey] ?? 0);
    return {
      correct: Math.max(ls.correct, serverHits),
      done: ls.done || serverHits >= l.threshold,
    };
  };

  const computed = (() => {
    let firstUndoneFound = false;
    return ALL_LESSONS.map((l) => {
      const s = lessonStateFor(l);
      let status: "done" | "current" | "locked" = "locked";
      if (s.done) status = "done";
      else if (!firstUndoneFound) { status = "current"; firstUndoneFound = true; }
      return { lesson: l, ...s, status };
    });
  })();

  const map = new Map(computed.map((c) => [c.lesson.id, c]));
  const totalDone = computed.filter((c) => c.status === "done").length;
  const pct = Math.round((totalDone / ALL_LESSONS.length) * 100);
  const currentLesson = computed.find((c) => c.status === "current");

  /* ─── Scroll to current on load ─── */
  useEffect(() => {
    if (loaded && currentRef.current) {
      setTimeout(() => {
        currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, [loaded]);

  /* ─── Skeleton ─── */
  if (!loaded) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-10 w-2/3 bg-muted rounded-2xl animate-pulse" />
          <div className="h-5 w-1/2 bg-muted rounded-xl animate-pulse" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-soft p-6 animate-pulse space-y-3">
            <div className="h-6 w-1/3 bg-muted rounded" />
            <div className="h-4 w-2/3 bg-muted rounded" />
            <div className="h-14 w-full bg-muted rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ─── Hero header ─── */}
      <section className="card-3d p-6 md:p-8 bg-gradient-sky">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-card shadow-soft flex items-center justify-center shrink-0 p-2">
            <Icon3D name="trophy" size={44} alt="Lộ trình" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              Lộ trình của {profile?.display_name ?? "bạn"}
            </h1>
            <p className="text-foreground/70 text-sm md:text-base">
              6 chặng · {ALL_LESSONS.length} bài · nhẹ nhàng từng bước nhỏ
            </p>
          </div>
        </div>

        {/* Overall progress */}
        <div className="rounded-2xl bg-card/80 backdrop-blur p-4 shadow-soft border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon3D name="star" size={20} />
              <span className="font-display text-sm font-bold">Tiến trình tổng</span>
            </div>
            <span className="font-display text-sm text-muted-foreground tabular-nums">
              {totalDone}/{ALL_LESSONS.length} bài · {pct}%
            </span>
          </div>
          <div
            className="h-3 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Tiến trình ${pct}%`}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {currentLesson && (
            <p className="text-xs text-muted-foreground mt-2">
              Tiếp theo: <strong>{currentLesson.lesson.title}</strong>
            </p>
          )}
        </div>
      </section>

      {/* ─── Stages timeline ─── */}
      <div className="space-y-6">
        {STAGES.map((stage, sIdx) => {
          const stageLessons = stage.lessons.map((l) => map.get(l.id)!).filter(Boolean);
          const doneInStage = stageLessons.filter((c) => c.status === "done").length;
          const totalInStage = stage.lessons.length;
          const stageDone = doneInStage === totalInStage;
          const stageHasCurrent = stageLessons.some((c) => c.status === "current");
          const stageLocked = !stageHasCurrent && !stageDone && !stageLessons.some((c) => c.status === "done");
          const stagePct = Math.round((doneInStage / totalInStage) * 100);
          const stageIcon = STAGE_ICON[sIdx] ?? "sparkles";

          return (
            <motion.section
              key={stage.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.06, duration: 0.4 }}
              className={cn("relative", stageLocked && "opacity-50")}
            >
              <div
                className={cn(
                  "card-3d overflow-hidden transition-all",
                  stageHasCurrent && "ring-2 ring-primary/30",
                )}
              >
                {/* ─── Stage header ─── */}
                <header className={cn("p-5 md:p-6 flex items-center gap-4", stage.bg)}>
                  {/* 3D icon node thay cho số */}
                  <div
                    className={cn(
                      "shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-soft border-2 p-2",
                      stageDone
                        ? "bg-gradient-mint border-secondary"
                        : stageHasCurrent
                        ? "bg-card border-primary"
                        : "bg-card border-border",
                    )}
                  >
                    {stageDone ? (
                      <Icon3D name="trophy" size={36} alt="Hoàn thành" />
                    ) : (
                      <Icon3D name={stageIcon} size={36} alt={stage.title} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-xs text-foreground/60 uppercase tracking-wide">
                        Chặng {stage.n}
                      </span>
                      {stageDone && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="inline-flex items-center gap-1 rounded-full bg-card/80 px-2.5 py-0.5 text-xs font-display shadow-soft"
                        >
                          ✨ Hoàn thành
                        </motion.span>
                      )}
                    </div>
                    <h2 className="font-display text-lg md:text-xl font-bold">{stage.title}</h2>
                    <p className="text-foreground/70 text-sm">{stage.childDesc}</p>

                    {/* Mini progress */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-card/60 overflow-hidden max-w-[200px]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            stageDone ? "bg-secondary" : "bg-primary/60",
                          )}
                          style={{ width: `${stagePct}%` }}
                        />
                      </div>
                      <span className="text-xs font-display text-foreground/60 tabular-nums">
                        {doneInStage}/{totalInStage}
                      </span>
                    </div>
                  </div>
                </header>

                {/* ─── Lessons ─── */}
                <div className="p-4 md:p-5 grid gap-3">
                  {stage.lessons.map((lesson) => {
                    const s = map.get(lesson.id)!;
                    const isCurrent = s.status === "current";
                    const isDone = s.status === "done";
                    const isLocked = s.status === "locked";
                    const iconName = ACTIVITY_ICON[lesson.activity];

                    return (
                      <div key={lesson.id} ref={isCurrent ? currentRef : undefined}>
                        {isLocked ? (
                          <div
                            className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/40 opacity-60 cursor-not-allowed"
                            aria-label={`Bài ${lesson.n}: ${lesson.title} (chưa mở khoá)`}
                          >
                            <LessonNode3D status="locked" iconName={iconName} />
                            <LessonInfo lesson={lesson} status="locked" />
                            <div className="shrink-0 w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                              <Lock className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        ) : (
                          <Link
                            to={lessonHref(lesson)}
                            aria-label={`Bài ${lesson.n}: ${lesson.title}${isDone ? " (đã hoàn thành)" : " (đang học)"}`}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
                              "hover:shadow-float active:scale-[0.98]",
                              isDone && "bg-card border-secondary/40 hover:border-secondary/60",
                              isCurrent && "bg-card border-primary/50 shadow-soft ring-2 ring-primary/20",
                            )}
                          >
                            <LessonNode3D status={s.status} iconName={iconName} />
                            <LessonInfo lesson={lesson} status={s.status} />
                            {isDone && (
                              <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-mint shadow-soft flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-secondary-foreground" />
                              </div>
                            )}
                            {isCurrent && (
                              <Button
                                variant="hero"
                                size="sm"
                                className="shrink-0 pointer-events-none gap-1"
                                tabIndex={-1}
                                aria-hidden
                              >
                                <Play className="w-4 h-4" /> Học
                              </Button>
                            )}
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          );
        })}
      </div>

      {/* ─── End celebration ─── */}
      {pct === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-3d p-8 bg-gradient-mint text-center space-y-4"
        >
          <div className="w-20 h-20 mx-auto rounded-3xl bg-card shadow-float flex items-center justify-center p-2">
            <Icon3D name="trophy" size={56} alt="Chúc mừng" />
          </div>
          <h2 className="font-display text-2xl font-bold">
            Chúc mừng! Bạn đã hoàn thành toàn bộ lộ trình! 🎉
          </h2>
          <p className="text-foreground/70">
            Bạn có thể ôn lại bất kỳ bài nào bằng cách chạm vào nó.
          </p>
          <Button asChild variant="hero" size="lg">
            <Link to="/app/rewards">Xem phần thưởng</Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
};

/* ─── Sub-components ─── */

/** Node 3D cho mỗi lesson — dùng ảnh 3D thay cho Lucide icon */
function LessonNode3D({
  status,
  iconName,
}: {
  status: "done" | "current" | "locked";
  iconName: Icon3DName;
}) {
  return (
    <div
      className={cn(
        "shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center p-2 transition-all",
        status === "done" && "bg-gradient-mint shadow-soft",
        status === "current" && "bg-gradient-sky shadow-soft",
        status === "locked" && "bg-muted/60",
      )}
    >
      <Icon3D
        name={iconName}
        size={32}
        className={cn(status === "locked" && "opacity-40 grayscale")}
      />
    </div>
  );
}

function LessonInfo({
  lesson,
  status,
}: {
  lesson: Lesson;
  status: "done" | "current" | "locked";
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h3
          className={cn(
            "font-display font-bold text-base truncate",
            status === "locked" && "text-muted-foreground",
          )}
        >
          {lesson.title}
        </h3>
        <span
          className={cn(
            "text-[10px] font-display rounded-full px-2 py-0.5 shrink-0",
            lesson.imageMode === "real"
              ? "bg-secondary/30 text-secondary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {lesson.imageMode === "real" ? "Ảnh thật" : "Hoạt hình"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground truncate">{lesson.desc}</p>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs text-muted-foreground font-display inline-flex items-center gap-1">
          <Icon3D name="star" size={12} /> +{lesson.reward}
        </span>
        <span className="text-xs text-muted-foreground font-display">
          {ACTIVITY_LABEL[lesson.activity]}
        </span>
        <span className="text-xs text-muted-foreground font-display">
          {lesson.threshold} câu
        </span>
      </div>
    </div>
  );
}

export default LearningMap;
