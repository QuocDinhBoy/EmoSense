import { useState } from "react";
import { STORIES, type Story } from "@/data/stories";
import { EMOTIONS, type EmotionKey, getEmotion } from "@/data/emotions";
import { EmotionBubble } from "@/components/EmotionBubble";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, BookOpen, RotateCcw, Star, Volume2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { useSpeak, vibrate } from "@/lib/speech";
import { Icon3D } from "@/components/Icon3D";
import { cn } from "@/lib/utils";

type Phase = "select" | "playing" | "complete";

const StoryMode = () => {
  const [phase, setPhase] = useState<Phase>("select");
  const [story, setStory] = useState<Story | null>(null);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [pick, setPick] = useState<EmotionKey | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak } = useSpeak();

  const scene = story?.scenes[sceneIdx];
  const totalScenes = story?.scenes.length ?? 0;
  const isCorrect = pick === scene?.answer;

  const startStory = (s: Story) => {
    setStory(s);
    setSceneIdx(0);
    setPick(null);
    setScore(0);
    setAnswered(false);
    setPhase("playing");
    setTimeout(() => speak(s.scenes[0].text), 300);
  };

  const choose = async (k: EmotionKey) => {
    if (answered || !scene) return;
    setPick(k);
    setAnswered(true);
    const correct = k === scene.answer;
    if (correct) {
      vibrate(15);
      setScore((s) => s + 1);
    }
    speak(correct ? `Đúng rồi! ${scene.why}` : `${scene.why}`);
    if (user) {
      await logProgress({ userId: user.id, activity: "scenario", emotion: scene.answer, correct });
    }
  };

  const nextScene = () => {
    if (!story) return;
    const next = sceneIdx + 1;
    if (next >= story.scenes.length) {
      setPhase("complete");
      if (user && score > 0) addStars(score * 2);
      speak(`Hết truyện! Bạn đúng ${score} trên ${totalScenes} cảnh.`);
    } else {
      setSceneIdx(next);
      setPick(null);
      setAnswered(false);
      setTimeout(() => speak(story.scenes[next].text), 200);
    }
  };

  const backToList = () => {
    setPhase("select");
    setStory(null);
  };

  /* ─── Story selection ─── */
  if (phase === "select") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Icon3D name="scenarios" size={40} />
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Truyện cảm xúc</h1>
            <p className="text-muted-foreground">Đọc truyện và đoán cảm xúc nhân vật qua từng cảnh.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {STORIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => startStory(s)}
              className="card-soft p-5 text-left hover:shadow-float transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-sky shadow-soft flex items-center justify-center shrink-0 group-hover:-rotate-3 transition-transform">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-display text-muted-foreground">
                      {s.scenes.length} cảnh
                    </span>
                    <span className="text-xs font-display text-muted-foreground">
                      Nhân vật: {s.character}
                    </span>
                    <DifficultyBadge level={s.difficulty} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ─── Complete ─── */
  if (phase === "complete" && story) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card-3d p-8 bg-gradient-mint text-center space-y-4"
        >
          <Mascot size={120} message="Tuyệt vời! Bạn đã đọc xong truyện!" />
          <h2 className="font-display text-2xl font-bold">
            {story.title} — Hoàn thành! 🎉
          </h2>
          <div className="flex justify-center gap-4">
            <div className="rounded-2xl bg-card/80 px-4 py-2 shadow-soft">
              <p className="font-display text-2xl font-bold">{score}/{totalScenes}</p>
              <p className="text-xs text-muted-foreground">Câu đúng</p>
            </div>
            <div className="rounded-2xl bg-card/80 px-4 py-2 shadow-soft">
              <p className="font-display text-2xl font-bold">+{score * 2}</p>
              <p className="text-xs text-muted-foreground">Ngôi sao</p>
            </div>
          </div>

          <div className="card-soft p-4 text-left bg-gradient-sky">
            <p className="font-display font-bold text-sm mb-1">💡 Bài học</p>
            <p className="text-sm">{story.moral}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="hero" size="lg" onClick={backToList}>
              <BookOpen className="w-4 h-4" /> Chọn truyện khác
            </Button>
            <Button variant="soft" size="lg" onClick={() => startStory(story)}>
              <RotateCcw className="w-4 h-4" /> Đọc lại
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ─── Playing ─── */
  if (!story || !scene) return null;
  const correctEmotion = getEmotion(scene.answer);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{story.title}</h1>
          <p className="text-sm text-muted-foreground">
            Cảnh {sceneIdx + 1}/{totalScenes} · Nhân vật: {story.character}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-3 py-1.5 font-display text-sm shadow-soft">
            <Star className="w-4 h-4 text-accent" /> {score}/{totalScenes}
          </span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {story.scenes.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all",
              i < sceneIdx ? "bg-secondary" : i === sceneIdx ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      {/* Scene text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sceneIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="card-3d p-6 md:p-8 bg-gradient-bubble relative"
        >
          <p className="font-display text-xl md:text-2xl leading-relaxed pr-14">
            {scene.text}
          </p>
          <button
            type="button"
            onClick={() => speak(scene.text)}
            aria-label="Nghe đọc"
            className="absolute top-4 right-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-card shadow-soft border border-border hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            <Volume2 className="w-5 h-5 text-primary" />
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Question */}
      <div className="card-soft p-5 space-y-4">
        <p className="font-display font-bold text-lg">
          {story.character} đang cảm thấy thế nào?
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {EMOTIONS.map((e) => (
            <EmotionBubble
              key={e.key}
              emotion={e}
              size="sm"
              selected={pick === e.key}
              onClick={() => choose(e.key)}
              speakOnClick={false}
            />
          ))}
        </div>
      </div>

      {/* Feedback */}
      {answered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "card-soft p-5",
            isCorrect ? "bg-gradient-mint" : "bg-gradient-sunshine",
          )}
        >
          <p className="font-display text-xl font-bold mb-1">
            {isCorrect ? "Đúng rồi! 🌟" : "Suy nghĩ tốt lắm 💛"}
          </p>
          {!isCorrect && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display text-sm">Đáp án:</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 border border-border">
                <img src={correctEmotion.image} alt="" className="w-6 h-6 object-contain" />
                <strong className="font-display text-sm">{correctEmotion.label}</strong>
              </span>
            </div>
          )}
          <p className="text-foreground/80 text-sm">{scene.why}</p>
          <Button variant="hero" size="lg" className="mt-4" onClick={nextScene}>
            {sceneIdx + 1 >= totalScenes ? "Xem kết quả" : "Cảnh tiếp theo"} <ChevronRight />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

/* ─── Sub-components ─── */
function DifficultyBadge({ level }: { level: 1 | 2 | 3 }) {
  const config = {
    1: { label: "Dễ", color: "bg-gradient-mint" },
    2: { label: "Vừa", color: "bg-gradient-sky" },
    3: { label: "Khó", color: "bg-gradient-sunshine" },
  };
  const c = config[level];
  return (
    <span className={cn("text-[10px] font-display rounded-full px-2 py-0.5", c.color)}>
      {c.label}
    </span>
  );
}

export default StoryMode;
