import { useEffect, useMemo, useState } from "react";
import { EMOTIONS, type EmotionKey, getEmotion } from "@/data/emotions";
import { EmotionBubble } from "@/components/EmotionBubble";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Volume2, BookOpen, Star, RotateCcw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { useSpeak, vibrate } from "@/lib/speech";
import { SCENES, scenesByLevel, sceneImage } from "@/data/scenarios";
import { STORIES, type Story } from "@/data/stories";
import { getLessonById, lessonHref, ALL_LESSONS } from "@/data/lessons";
import { bumpLesson } from "@/lib/lessonProgress";
import { SmartImage } from "@/components/SmartImage";
import { Mascot } from "@/components/Mascot";
import { cn } from "@/lib/utils";

const Scenarios = () => {
  const [params] = useSearchParams();
  const lessonId = params.get("lesson");
  const lesson = useMemo(() => (lessonId ? getLessonById(lessonId) : undefined), [lessonId]);

  // Nếu có lesson → chỉ hiện tab tình huống đơn, không hiện tab truyện
  const showTabs = !lesson;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {showTabs ? (
        <Tabs defaultValue="single" className="space-y-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">Tình huống cảm xúc</h1>
              <p className="text-muted-foreground">Đọc và đoán cảm xúc nhân vật.</p>
            </div>
            <TabsList>
              <TabsTrigger value="single" className="font-display text-sm">Tình huống</TabsTrigger>
              <TabsTrigger value="story" className="font-display text-sm">Truyện nâng cao</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="single">
            <SingleScenario lesson={lesson} lessonId={lessonId} />
          </TabsContent>
          <TabsContent value="story">
            <StorySection />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold">
                {lesson ? lesson.title : "Tình huống cảm xúc"}
              </h1>
              <p className="text-muted-foreground">
                {lesson?.scenarioLevel === 3
                  ? "Có thể có 2 cảm xúc cùng lúc – chọn cảm xúc rõ nhất."
                  : "Đọc câu chuyện nhỏ rồi chọn một cảm xúc."}
              </p>
            </div>
          </div>
          <SingleScenario lesson={lesson} lessonId={lessonId} />
        </>
      )}
    </div>
  );
};

export default Scenarios;

/* ═══════════════════════════════════════════════════════════════════
   SingleScenario — Tình huống đơn lẻ (logic cũ)
   ═══════════════════════════════════════════════════════════════════ */

function SingleScenario({ lesson, lessonId }: { lesson: any; lessonId: string | null }) {
  const scenes = useMemo(() => {
    if (lesson?.scenarioLevel) return scenesByLevel(lesson.scenarioLevel);
    return SCENES.filter(s => s.level <= 2);
  }, [lesson]);

  const [i, setI] = useState(0);
  const [pick, setPick] = useState<EmotionKey | null>(null);
  const [hasFailedThisScene, setHasFailedThisScene] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const scene = scenes[i % Math.max(scenes.length, 1)];
  const isCorrect = (k: EmotionKey | null) => !!k && (k === scene.answer || k === scene.alt);
  const correctEmotion = scene ? getEmotion(scene.answer) : EMOTIONS[0];
  const altEmotion = scene?.alt ? getEmotion(scene.alt) : null;
  const correct = isCorrect(pick);

  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak, stop } = useSpeak();

  useEffect(() => { setI(0); setPick(null); setHasFailedThisScene(false); setDoneCount(0); }, [lessonId]);
  useEffect(() => { stop(); if (interacted && scene) speak(scene.text); return () => stop(); }, [i, scene?.text, speak, stop, interacted]);

  const choose = async (k: EmotionKey) => {
    if (pick) return;
    setInteracted(true);
    setPick(k);
    const ok = isCorrect(k);
    if (user) await logProgress({ userId: user.id, activity: "scenario", emotion: scene.answer, correct: ok });
    if (ok) { vibrate(15); if (!hasFailedThisScene) { await addStars(2); setDoneCount(c => c + 1); if (lesson) bumpLesson(lesson.id, lesson.threshold, true); } }
    else { setHasFailedThisScene(true); }
    setTimeout(() => speak(`${ok ? "Đúng rồi. " : "Suy nghĩ tốt lắm. "}${scene.why}`), 200);
  };

  const next = () => { setPick(null); setHasFailedThisScene(false); setI((i + 1) % scenes.length); };
  const retry = () => setPick(null);

  const nextLessonHref = (() => {
    if (!lesson) return "/app/learn";
    const idx = ALL_LESSONS.findIndex(l => l.id === lesson.id);
    const n = ALL_LESSONS[idx + 1];
    return n ? lessonHref(n) : "/app/learn";
  })();

  if (!scene) return <div className="card-soft p-8 text-center"><p className="font-display">Chưa có tình huống.</p></div>;

  const useImage = lesson?.imageMode === "real";
  const sceneImg = useImage ? sceneImage(scene) : undefined;
  const lessonComplete = lesson ? doneCount >= lesson.threshold : false;

  return (
    <div className="space-y-6">
      {lesson && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 font-display text-sm shadow-soft">
          ⭐ {doneCount}/{lesson.threshold}
        </span>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card-3d overflow-hidden bg-gradient-bubble">
          {useImage && sceneImg && <div className="aspect-[16/9] bg-muted"><SmartImage sources={[sceneImg]} fallback={correctEmotion.image} alt="Minh hoạ" className="" /></div>}
          <div className="p-6 md:p-8 relative">
            <p className="font-display text-2xl md:text-3xl leading-relaxed pr-14">{scene.text}</p>
            <button type="button" onClick={() => { setInteracted(true); speak(scene.text); }} aria-label="Nghe đọc" className="absolute top-4 right-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-card shadow-soft border border-border hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40">
              <Volume2 className="w-5 h-5 text-primary" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {EMOTIONS.map(e => <EmotionBubble key={e.key} emotion={e} size="sm" selected={pick === e.key} onClick={() => choose(e.key)} speakOnClick={false} />)}
      </div>

      {pick && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`card-soft p-6 ${correct ? "bg-gradient-mint" : "bg-gradient-sunshine"}`}>
          <p className="font-display text-xl font-bold mb-1">{correct ? "Đúng rồi! 🌟" : "Suy nghĩ tốt lắm 💛"}</p>
          {!correct && (
            <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
              <span className="font-display text-sm">Đáp án:</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 border border-border">
                <img src={correctEmotion.image} alt="" className="w-7 h-7 object-contain" /><strong className="font-display text-sm">{correctEmotion.label}</strong>
              </span>
              {altEmotion && <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 border border-border"><img src={altEmotion.image} alt="" className="w-7 h-7 object-contain" /><span className="font-display text-sm">hoặc <strong>{altEmotion.label}</strong></span></span>}
            </div>
          )}
          <p className="text-foreground/80">{scene.why}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {!correct && <Button variant="outline" size="lg" onClick={retry}>Thử lại</Button>}
            {lessonComplete ? <Button asChild variant="hero" size="lg"><Link to={nextLessonHref}>Bài tiếp theo <ChevronRight /></Link></Button> : <Button variant="hero" size="lg" onClick={next}>Câu chuyện tiếp <ChevronRight /></Button>}
          </div>
        </motion.div>
      )}

      {lessonComplete && !pick && (
        <div className="card-3d p-6 bg-gradient-mint text-center">
          <h2 className="font-display text-2xl font-bold mb-1">Hoàn thành bài học! 🎉</h2>
          <p className="text-foreground/80 mb-3">Bạn đã trả lời đúng đủ số câu cần.</p>
          <Button asChild variant="hero" size="lg"><Link to={nextLessonHref}>Bài tiếp theo</Link></Button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   StorySection — Truyện nhiều cảnh (nâng cao), gộp trong tab
   ═══════════════════════════════════════════════════════════════════ */

function StorySection() {
  const [story, setStory] = useState<Story | null>(null);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [pick, setPick] = useState<EmotionKey | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [complete, setComplete] = useState(false);

  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak } = useSpeak();

  const scene = story?.scenes[sceneIdx];
  const totalScenes = story?.scenes.length ?? 0;
  const isCorrect = pick === scene?.answer;

  const startStory = (s: Story) => {
    setStory(s); setSceneIdx(0); setPick(null); setScore(0); setAnswered(false); setComplete(false);
    setTimeout(() => speak(s.scenes[0].text), 300);
  };

  const choose = async (k: EmotionKey) => {
    if (answered || !scene) return;
    setPick(k); setAnswered(true);
    const correct = k === scene.answer;
    if (correct) { vibrate(15); setScore(s => s + 1); }
    speak(correct ? `Đúng rồi! ${scene.why}` : scene.why);
    if (user) await logProgress({ userId: user.id, activity: "scenario", emotion: scene.answer, correct });
  };

  const nextScene = () => {
    if (!story) return;
    if (sceneIdx + 1 >= story.scenes.length) {
      setComplete(true);
      if (user && score > 0) addStars(score * 2);
      speak(`Hết truyện! Bạn đúng ${score} trên ${totalScenes} cảnh.`);
    } else {
      setSceneIdx(s => s + 1); setPick(null); setAnswered(false);
      setTimeout(() => speak(story.scenes[sceneIdx + 1].text), 200);
    }
  };

  const backToList = () => { setStory(null); setComplete(false); };

  /* ─── Story list ─── */
  if (!story) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Truyện nhiều cảnh — cảm xúc nhân vật thay đổi qua từng cảnh. Đoán đúng để nhận sao!</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {STORIES.map(s => (
            <button key={s.id} type="button" onClick={() => startStory(s)} className="card-soft p-5 text-left hover:shadow-float transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 group">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-sky shadow-soft flex items-center justify-center shrink-0 group-hover:-rotate-3 transition-transform">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs font-display text-muted-foreground">{s.scenes.length} cảnh</span>
                    <span className="text-xs font-display text-muted-foreground">{s.character}</span>
                    <span className={cn("text-[10px] font-display rounded-full px-2 py-0.5", s.difficulty === 1 ? "bg-gradient-mint" : s.difficulty === 2 ? "bg-gradient-sky" : "bg-gradient-sunshine")}>
                      {s.difficulty === 1 ? "Dễ" : s.difficulty === 2 ? "Vừa" : "Khó"}
                    </span>
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
  if (complete) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-3d p-8 bg-gradient-mint text-center space-y-4">
        <Mascot size={100} message="Tuyệt vời!" />
        <h2 className="font-display text-2xl font-bold">{story.title} — Hoàn thành! 🎉</h2>
        <div className="flex justify-center gap-4">
          <div className="rounded-2xl bg-card/80 px-4 py-2 shadow-soft"><p className="font-display text-2xl font-bold">{score}/{totalScenes}</p><p className="text-xs text-muted-foreground">Đúng</p></div>
          <div className="rounded-2xl bg-card/80 px-4 py-2 shadow-soft"><p className="font-display text-2xl font-bold">+{score * 2}</p><p className="text-xs text-muted-foreground">Sao</p></div>
        </div>
        <div className="card-soft p-4 text-left bg-gradient-sky"><p className="font-display font-bold text-sm mb-1">💡 Bài học</p><p className="text-sm">{story.moral}</p></div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="hero" size="lg" onClick={backToList}><BookOpen className="w-4 h-4" /> Truyện khác</Button>
          <Button variant="soft" size="lg" onClick={() => startStory(story)}><RotateCcw className="w-4 h-4" /> Đọc lại</Button>
        </div>
      </motion.div>
    );
  }

  /* ─── Playing ─── */
  if (!scene) return null;
  const correctEmotion = getEmotion(scene.answer);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">{story.title}</h2>
          <p className="text-xs text-muted-foreground">Cảnh {sceneIdx + 1}/{totalScenes} · {story.character}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-3 py-1.5 font-display text-sm shadow-soft">
          <Star className="w-4 h-4 text-accent" /> {score}
        </span>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {story.scenes.map((_, idx) => (
          <div key={idx} className={cn("h-1.5 flex-1 rounded-full transition-all", idx < sceneIdx ? "bg-secondary" : idx === sceneIdx ? "bg-primary" : "bg-muted")} />
        ))}
      </div>

      {/* Scene */}
      <AnimatePresence mode="wait">
        <motion.div key={sceneIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card-3d p-6 md:p-8 bg-gradient-bubble relative">
          <p className="font-display text-xl md:text-2xl leading-relaxed pr-14">{scene.text}</p>
          <button type="button" onClick={() => speak(scene.text)} aria-label="Nghe đọc" className="absolute top-4 right-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-card shadow-soft border border-border hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40">
            <Volume2 className="w-5 h-5 text-primary" />
          </button>
        </motion.div>
      </AnimatePresence>

      <p className="font-display font-bold">{story.character} đang cảm thấy thế nào?</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {EMOTIONS.map(e => <EmotionBubble key={e.key} emotion={e} size="sm" selected={pick === e.key} onClick={() => choose(e.key)} speakOnClick={false} />)}
      </div>

      {answered && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("card-soft p-5", isCorrect ? "bg-gradient-mint" : "bg-gradient-sunshine")}>
          <p className="font-display text-xl font-bold mb-1">{isCorrect ? "Đúng rồi! 🌟" : "Suy nghĩ tốt lắm 💛"}</p>
          {!isCorrect && (
            <div className="flex items-center gap-2 mb-2">
              <span className="font-display text-sm">Đáp án:</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 border border-border">
                <img src={correctEmotion.image} alt="" className="w-6 h-6 object-contain" /><strong className="font-display text-sm">{correctEmotion.label}</strong>
              </span>
            </div>
          )}
          <p className="text-sm text-foreground/80">{scene.why}</p>
          <Button variant="hero" size="lg" className="mt-3" onClick={nextScene}>
            {sceneIdx + 1 >= totalScenes ? "Xem kết quả" : "Cảnh tiếp"} <ChevronRight />
          </Button>
        </motion.div>
      )}
    </div>
  );
}
