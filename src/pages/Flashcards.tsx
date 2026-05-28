import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EMOTIONS, pickEmotions } from "@/data/emotions";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronLeft, ChevronRight, Check, Sparkles, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { notify } from "@/lib/notify";
import { useSpeak, vibrate } from "@/lib/speech";
import { getLessonById, lessonHref, ALL_LESSONS } from "@/data/lessons";
import { bumpLesson } from "@/lib/lessonProgress";
import { SmartImage } from "@/components/SmartImage";

const Flashcards = () => {
  const [params] = useSearchParams();
  const lessonId = params.get("lesson");
  const lesson = useMemo(() => (lessonId ? getLessonById(lessonId) : undefined), [lessonId]);

  const deck = useMemo(() => pickEmotions(lesson?.emotions), [lesson]);
  const useReal = lesson?.imageMode === "real";

  const [i, setI] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [interacted, setInteracted] = useState(false);
  const [showCartoonHint, setShowCartoonHint] = useState(false);
  const e = deck[i % deck.length];
  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak, stop } = useSpeak();

  // Reset khi đổi lesson
  useEffect(() => {
    setI(0);
    setSeen(new Set());
    setShowCartoonHint(false);
  }, [lessonId]);

  // Đọc khi đổi thẻ — chỉ sau khi user đã tương tác (tránh autoplay block)
  useEffect(() => {
    stop();
    if (interacted && e) speak(`${e.label}. ${e.description}`);
    return () => stop();
  }, [i, e?.label, e?.description, speak, stop, interacted]);

  // Phím tắt: ←/→ chuyển thẻ, Space đọc
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) return;
      if (ev.key === "ArrowRight") {
        setInteracted(true);
        setI(v => (v + 1) % deck.length);
      } else if (ev.key === "ArrowLeft") {
        setInteracted(true);
        setI(v => (v - 1 + deck.length) % deck.length);
      } else if (ev.key === " ") {
        ev.preventDefault();
        setInteracted(true);
        if (e) speak(`${e.label}. ${e.description}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [e?.label, e?.description, speak, deck.length]);

  if (!e) return null;

  const allLearned = seen.size === deck.length;

  const learned = async () => {
    setInteracted(true);
    vibrate(15);
    if (user && !seen.has(e.key)) {
      await logProgress({ userId: user.id, activity: "flashcards", emotion: e.key, correct: true });
      await addStars(1);
      setSeen(s => new Set(s).add(e.key));
      notify.success("⭐ +1 ngôi sao");
    }
    if (lesson) bumpLesson(lesson.id, lesson.threshold, true);
    setI((i + 1) % deck.length);
  };

  // Determine "next lesson" if completed
  const nextLessonHref = (() => {
    if (!lesson) return "/app/learn";
    const idx = ALL_LESSONS.findIndex(l => l.id === lesson.id);
    const next = ALL_LESSONS[idx + 1];
    return next ? lessonHref(next) : "/app/learn";
  })();

  if (allLearned) {
    return (
      <div className="max-w-xl mx-auto card-3d p-8 text-center space-y-5 bg-gradient-mint">
        <Sparkles className="w-12 h-12 mx-auto text-primary" />
        <h1 className="font-display text-3xl font-bold">Tuyệt vời! Bạn đã học xong tất cả thẻ 🎉</h1>
        <p className="text-foreground/80">
          {lesson ? `+${lesson.reward} sao thưởng cho bài học này.` : "Hãy thử trò chơi ghép hoặc tình huống nhé."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="hero" size="lg">
            <Link to={nextLessonHref}>{lesson ? "Bài tiếp theo" : "Chơi ghép"}</Link>
          </Button>
          <Button asChild variant="soft" size="lg">
            <Link to="/app/learn">Bản đồ học</Link>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setSeen(new Set());
              setI(0);
            }}
          >
            Học lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          {lesson ? lesson.title : "Thẻ học"}
        </h1>
        <p className="text-muted-foreground">
          Thẻ {i + 1} / {deck.length} · Đã học {seen.size}
          {useReal && " · Ảnh người thật"}
        </p>
        {lesson?.tip && (
          <p className="text-sm text-foreground/70 mt-1 max-w-md mx-auto">💡 {lesson.tip}</p>
        )}
      </div>

      <div className="relative h-[480px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${e.key}-${useReal ? "real" : "cart"}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 card-3d p-6 flex flex-col items-center justify-center text-center gap-4"
          >
            {/* Image area */}
            <div className="w-56 h-56 rounded-3xl overflow-hidden bg-muted/50 shadow-soft flex items-center justify-center">
              {useReal && !showCartoonHint ? (
                <SmartImage
                  sources={e.realImages}
                  fallback={e.image}
                  alt={`Khuôn mặt ${e.label}`}
                  className="rounded-3xl"
                />
              ) : (
                <img
                  src={e.image}
                  alt={e.label}
                  width={320}
                  height={320}
                  className="w-full h-full object-contain drop-shadow-[0_24px_28px_hsl(218_60%_40%/0.3)]"
                />
              )}
            </div>

            <h2 className="font-display text-4xl font-bold">{e.label}</h2>
            <p className="text-base text-muted-foreground max-w-md">{e.description}</p>

            {useReal && e.faceCues?.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-2 max-w-md">
                {e.faceCues.map(c => (
                  <li
                    key={c}
                    className="text-xs font-display rounded-full bg-muted px-3 py-1 text-muted-foreground"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant="soft"
                size="lg"
                onClick={() => {
                  setInteracted(true);
                  speak(`${e.label}. ${e.description}`);
                }}
                aria-label={`Nghe đọc ${e.label}`}
              >
                <Volume2 /> Nghe đọc
              </Button>
              {useReal && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowCartoonHint(v => !v)}
                  aria-pressed={showCartoonHint}
                >
                  <Eye /> {showCartoonHint ? "Ảnh thật" : "Đối chiếu hoạt hình"}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            setInteracted(true);
            setI((i - 1 + deck.length) % deck.length);
          }}
          aria-label="Thẻ trước (phím ←)"
        >
          <ChevronLeft /> Trước
        </Button>
        <Button variant="hero" size="lg" onClick={learned}>
          <Check /> Mình hiểu rồi
        </Button>
        <Button
          variant="soft"
          size="lg"
          onClick={() => {
            setInteracted(true);
            setI((i + 1) % deck.length);
          }}
          aria-label="Thẻ tiếp theo (phím →)"
        >
          Tiếp <ChevronRight />
        </Button>
      </div>
    </div>
  );
};

export default Flashcards;
