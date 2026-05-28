import { useEffect, useMemo, useState } from "react";
import { pickEmotions, type EmotionKey, getEmotion } from "@/data/emotions";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { notify } from "@/lib/notify";
import { useSpeak, vibrate } from "@/lib/speech";
import { getLessonById, lessonHref, ALL_LESSONS } from "@/data/lessons";
import { bumpLesson } from "@/lib/lessonProgress";
import { SmartImage } from "@/components/SmartImage";

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

const MatchingGame = () => {
  const [params] = useSearchParams();
  const lessonId = params.get("lesson");
  const lesson = useMemo(() => (lessonId ? getLessonById(lessonId) : undefined), [lessonId]);
  const useReal = lesson?.imageMode === "real";

  const pool = useMemo(() => {
    const filtered = pickEmotions(lesson?.emotions);
    // Mặc định 6 cảm xúc nếu không truyền lesson
    return lesson ? filtered : filtered.slice(0, 6);
  }, [lesson]);

  const [labels, setLabels] = useState(() => shuffle(pool));
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [wrongKey, setWrongKey] = useState<string | null>(null);
  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak } = useSpeak();

  // Reset khi đổi lesson
  useEffect(() => {
    setLabels(shuffle(pool));
    setMatched({});
    setSelected(null);
    setCompleted(false);
    setWrongKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Phát hiện hoàn thành dựa trên state thực — đáng tin cậy
  useEffect(() => {
    if (Object.keys(matched).length === pool.length && !completed && pool.length > 0) {
      setCompleted(true);
      notify.success("Hoàn thành! Tuyệt vời 🎉");
      speak("Hoàn thành! Tuyệt vời");
      vibrate([20, 50, 20]);
      const reward = lesson ? lesson.reward : 3;
      if (user) addStars(reward);
      if (lesson) bumpLesson(lesson.id, lesson.threshold, true);
    }
  }, [matched, pool.length, completed, speak, addStars, user, lesson]);

  const onFace = (key: string) => {
    if (selected === key) {
      setSelected(null);
      return;
    }
    setSelected(key);
    speak(getEmotion(key as EmotionKey).label);
  };

  const onLabel = async (key: string) => {
    if (!selected) {
      speak("Chọn một khuôn mặt trước nhé");
      notify.info("Chọn một khuôn mặt trước nhé");
      return;
    }
    const correct = selected === key;
    if (user) await logProgress({ userId: user.id, activity: "match", emotion: selected as EmotionKey, correct });
    if (correct) {
      const newMatched = { ...matched, [selected]: key };
      setMatched(newMatched);
      vibrate(15);
      const label = getEmotion(selected as EmotionKey).label;
      speak(`Đúng rồi! ${label}`);
      notify.success("Ghép đúng rồi! ⭐");
      if (user) await addStars(1);
      if (lesson) bumpLesson(lesson.id, lesson.threshold, true);
      setSelected(null);
    } else {
      vibrate([10, 40, 10]);
      setWrongKey(key);
      window.setTimeout(() => setWrongKey(k => (k === key ? null : k)), 500);
      speak("Thử lại nhé");
      notify.info("Gần đúng rồi! Thử lại nhé 💛");
    }
  };

  const reset = () => {
    setMatched({});
    setLabels(shuffle(pool));
    setSelected(null);
    setCompleted(false);
    setWrongKey(null);
  };

  const nextLessonHref = (() => {
    if (!lesson) return "/app/learn";
    const idx = ALL_LESSONS.findIndex(l => l.id === lesson.id);
    const next = ALL_LESSONS[idx + 1];
    return next ? lessonHref(next) : "/app/learn";
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            {lesson ? lesson.title : "Ghép cảm xúc"}
          </h1>
          <p className="text-muted-foreground">
            Chạm vào khuôn mặt, rồi chạm vào từ phù hợp.{useReal && " Ảnh người thật."}
          </p>
          {lesson?.tip && (
            <p className="text-sm text-foreground/70 mt-1">💡 {lesson.tip}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm text-muted-foreground">
            {Object.keys(matched).length}/{pool.length}
          </span>
          <Button variant="outline" onClick={reset}>
            <RotateCcw /> Chơi lại
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card-soft p-5 space-y-3">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Khuôn mặt
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {pool.map(e => {
              const done = !!matched[e.key];
              const isSel = selected === e.key;
              return (
                <motion.button
                  key={e.key}
                  whileTap={{ scale: 0.94 }}
                  disabled={done}
                  onClick={() => onFace(e.key)}
                  aria-label={done ? `${e.label} — đã ghép` : e.label}
                  aria-pressed={isSel}
                  className={`relative aspect-square min-h-[88px] rounded-3xl bg-card shadow-soft flex items-center justify-center p-2 border-4 overflow-hidden transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${
                    isSel ? "border-primary ring-4 ring-primary/30" : "border-transparent"
                  } ${done ? "opacity-50" : "hover:shadow-float"}`}
                >
                  {useReal ? (
                    <SmartImage
                      sources={e.realImages}
                      fallback={e.image}
                      alt={e.label}
                      className="rounded-2xl"
                    />
                  ) : (
                    <img
                      src={e.image}
                      alt={e.label}
                      loading="lazy"
                      width={160}
                      height={160}
                      className="w-full h-full object-contain drop-shadow-[0_8px_12px_hsl(218_60%_40%/0.25)]"
                    />
                  )}
                  {done && (
                    <Check
                      className="absolute top-1 right-1 w-6 h-6 text-foreground bg-card rounded-full p-1"
                      aria-hidden
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="card-soft p-5 space-y-3">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Từ ngữ
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {labels.map(e => {
              const done = Object.values(matched).includes(e.key);
              const isWrong = wrongKey === e.key;
              return (
                <motion.button
                  key={e.key}
                  whileTap={{ scale: 0.94 }}
                  animate={isWrong ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
                  transition={{ duration: 0.45 }}
                  disabled={done}
                  onClick={() => onLabel(e.key)}
                  aria-label={done ? `${e.label} — đã ghép` : e.label}
                  className={`min-h-[64px] rounded-2xl bg-card border-2 shadow-soft px-4 py-5 font-display text-xl font-bold transition-colors hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${
                    done
                      ? "opacity-50 line-through border-border"
                      : isWrong
                      ? "border-destructive bg-destructive/10"
                      : "border-border"
                  }`}
                >
                  {e.label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {completed && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card-3d p-6 bg-gradient-mint text-center space-y-3"
          >
            <h2 className="font-display text-2xl font-bold">
              Hoàn thành! +{lesson?.reward ?? 3} ngôi sao 🌟
            </h2>
            <p className="text-foreground/80">Bạn đã ghép đúng tất cả cảm xúc.</p>
            <div className="flex flex-wrap justify-center gap-3">
              {lesson && (
                <Button asChild variant="hero" size="lg">
                  <Link to={nextLessonHref}>Bài tiếp theo</Link>
                </Button>
              )}
              <Button variant={lesson ? "soft" : "hero"} size="lg" onClick={reset}>
                <RotateCcw /> Chơi lại
              </Button>
              <Button asChild variant="soft" size="lg">
                <Link to="/app/learn">Bản đồ học</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchingGame;
