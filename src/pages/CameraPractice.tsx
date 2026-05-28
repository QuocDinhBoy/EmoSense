import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import {
  Camera as CamIcon,
  CameraOff,
  ShieldCheck,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { type EmotionKey, getEmotion } from "@/data/emotions";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import {
  loadFaceModels,
  startLiveDetection,
  type LiveDetectionHandle,
  type DetectionResult,
  type AppEmotion,
} from "@/lib/faceDetect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { useSpeak, vibrate } from "@/lib/speech";
import { getLessonById, lessonHref, ALL_LESSONS } from "@/data/lessons";
import { bumpLesson } from "@/lib/lessonProgress";
import { SmartImage } from "@/components/SmartImage";
import { buildLocalHint, type CoachHint } from "@/lib/coachHints";
import { fetchGroqHint, isGroqConfigured } from "@/lib/groqCoach";
import { cn } from "@/lib/utils";

/* ─── Config ─── */
const DEFAULT_PROMPTS: EmotionKey[] = ["happy", "surprised", "sad", "calm", "angry"];
const PASS_THRESHOLD = 0.55;
const HOLD_MS = 1200;
const HINT_COOLDOWN = 3000;
const AI_COOLDOWN = 8000;

const EMOTION_KEYS: AppEmotion[] = ["happy", "sad", "angry", "scared", "surprised", "calm"];

const CameraPractice = () => {
  const [params] = useSearchParams();
  const lessonId = params.get("lesson");
  const lesson = useMemo(() => (lessonId ? getLessonById(lessonId) : undefined), [lessonId]);

  const PROMPTS: EmotionKey[] = useMemo(
    () => (lesson?.emotions ?? DEFAULT_PROMPTS) as EmotionKey[],
    [lesson],
  );
  const useReal = lesson?.imageMode === "real";

  /* ─── State ─── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<LiveDetectionHandle | null>(null);

  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);

  const [promptIdx, setPromptIdx] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [passed, setPassed] = useState(false);

  const [latest, setLatest] = useState<DetectionResult | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [hint, setHint] = useState<CoachHint>({
    message: "Bấm bật camera để bắt đầu nhé.",
    tone: "encourage",
  });
  const [aiEnabled, setAiEnabled] = useState(isGroqConfigured());

  const target = getEmotion(PROMPTS[promptIdx % PROMPTS.length]);
  const threshold = lesson?.threshold ?? PROMPTS.length;
  const lessonComplete = doneCount >= threshold;

  /* ─── Refs cho loop (tránh stale closure) ─── */
  const passedRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const lastHintRef = useRef(0);
  const lastAiRef = useRef(0);
  const rotRef = useRef(0);
  const attemptsRef = useRef(0);
  const aiBusyRef = useRef(false);
  const recentRef = useRef<string[]>([]);
  const aiEnabledRef = useRef(aiEnabled);
  useEffect(() => { aiEnabledRef.current = aiEnabled; }, [aiEnabled]);

  const { user } = useAuth();
  const { profile, addStars } = useProfile();
  const { speak, stop: stopSpeak } = useSpeak();

  /* ─── Load models ─── */
  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true)).catch(() => setModelsReady(false));
  }, []);

  /* ─── Reset khi đổi lesson ─── */
  useEffect(() => {
    setPromptIdx(0);
    setDoneCount(0);
    resetTarget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  /* ─── Reset khi đổi mục tiêu ─── */
  useEffect(() => {
    resetTarget();
    if (on) {
      const msg = `Hãy thể hiện: ${target.label}`;
      setHint({ message: msg, tone: "encourage" });
      speak(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptIdx]);

  function resetTarget() {
    passedRef.current = false;
    setPassed(false);
    holdStartRef.current = null;
    setHoldProgress(0);
    setLatest(null);
    rotRef.current = 0;
    attemptsRef.current = 0;
    recentRef.current = [];
  }

  /* ─── Camera control ─── */
  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setOn(true);
      const msg = `Hãy thể hiện: ${target.label}`;
      setHint({ message: msg, tone: "encourage" });
      speak(msg);
    } catch {
      setError("Không mở được camera. Hãy kiểm tra quyền truy cập rồi thử lại.");
    }
  };

  const stopCamera = () => {
    detectionRef.current?.stop();
    detectionRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOn(false);
    stopSpeak();
  };

  useEffect(() => () => stopCamera(), []);

  /* ─── Live detection loop ─── */
  useEffect(() => {
    if (!on || !videoRef.current || !modelsReady) return;
    const handle = startLiveDetection(videoRef.current, {
      intervalMs: 250,
      onTick: handleTick,
    });
    detectionRef.current = handle;
    return () => {
      handle.stop();
      detectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, modelsReady, promptIdx]);

  /* ─── Tick handler ─── */
  function handleTick(res: DetectionResult | null) {
    setLatest(res);
    if (passedRef.current) return;

    if (!res) {
      holdStartRef.current = null;
      setHoldProgress(0);
      maybeHint({ message: "Mình chưa thấy khuôn mặt. Lại gần camera nhé 💛", tone: "adjust" });
      return;
    }

    const targetKey = target.key as AppEmotion;
    const score = res.appScores[targetKey] ?? 0;

    if (score >= PASS_THRESHOLD) {
      const now = performance.now();
      if (!holdStartRef.current) holdStartRef.current = now;
      const held = now - holdStartRef.current;
      setHoldProgress(Math.min(1, held / HOLD_MS));
      if (held >= HOLD_MS) {
        onPass(res);
      }
    } else {
      holdStartRef.current = null;
      setHoldProgress(0);
      const now = performance.now();
      if (now - lastHintRef.current >= HINT_COOLDOWN) {
        lastHintRef.current = now;
        rotRef.current += 1;
        attemptsRef.current += 1;
        const local = buildLocalHint(
          targetKey,
          res.appScores,
          res.appEmotion,
          PASS_THRESHOLD,
          rotRef.current,
        );
        applyHint(local);

        // Gọi Groq AI sau vài lần thử
        if (
          aiEnabledRef.current &&
          attemptsRef.current >= 2 &&
          now - lastAiRef.current >= AI_COOLDOWN &&
          !aiBusyRef.current
        ) {
          lastAiRef.current = now;
          callGroq(targetKey, res);
        }
      }
    }
  }

  async function callGroq(targetKey: AppEmotion, res: DetectionResult) {
    aiBusyRef.current = true;
    try {
      const ai = await fetchGroqHint({
        target: targetKey,
        detected: res.appEmotion,
        scores: res.appScores,
        childName: profile?.display_name,
        attempts: attemptsRef.current,
        recent: recentRef.current,
      });
      if (ai && !passedRef.current) applyHint(ai);
    } finally {
      aiBusyRef.current = false;
    }
  }

  function applyHint(h: CoachHint) {
    setHint(h);
    recentRef.current = [h.message, ...recentRef.current].slice(0, 5);
    speak(h.message);
  }

  function maybeHint(h: CoachHint) {
    const now = performance.now();
    if (now - lastHintRef.current < HINT_COOLDOWN) return;
    lastHintRef.current = now;
    applyHint(h);
  }

  /* ─── Pass ─── */
  async function onPass(res: DetectionResult) {
    if (passedRef.current) return;
    passedRef.current = true;
    setPassed(true);
    setHoldProgress(1);
    vibrate([15, 40, 15]);
    const msg = `Tuyệt vời! Đó là ${target.label}! +2 ngôi sao 🌟`;
    setHint({ message: msg, tone: "celebrate" });
    speak(msg);
    setDoneCount((c) => c + 1);
    if (lesson) bumpLesson(lesson.id, lesson.threshold, true);

    if (user) {
      const targetKey = target.key as AppEmotion;
      try {
        await supabase.from("camera_attempts").insert({
          user_id: user.id,
          target_emotion: targetKey,
          detected_emotion: res.appEmotion,
          confidence: Number((res.appScores[targetKey] ?? 0).toFixed(3)),
          matched: true,
        });
        await logProgress({ userId: user.id, activity: "camera", emotion: targetKey, correct: true });
        await addStars(2);
      } catch { /* swallow */ }
    }
  }

  const next = () => setPromptIdx((i) => (i + 1) % PROMPTS.length);

  const nextLessonHref = (() => {
    if (!lesson) return "/app/learn";
    const idx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
    const n = ALL_LESSONS[idx + 1];
    return n ? lessonHref(n) : "/app/learn";
  })();

  /* ─── UI ─── */
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            {lesson ? lesson.title : "Luyện qua camera"}
          </h1>
          <p className="text-muted-foreground">
            AI theo dõi khuôn mặt theo thời gian thực và hướng dẫn bạn. Giữ vững biểu cảm{" "}
            {(HOLD_MS / 1000).toFixed(1)}s để hoàn thành.
          </p>
          {lesson?.tip && <p className="text-sm text-foreground/70 mt-1">💡 {lesson.tip}</p>}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 font-display text-sm shadow-soft min-h-[40px]">
          ✅ {doneCount}/{threshold} mục tiêu
        </span>
      </div>

      <div className="card-3d p-6 md:p-8 grid lg:grid-cols-[1fr_340px] gap-6">
        {/* ─── Video column ─── */}
        <div>
          <div className="rounded-3xl overflow-hidden bg-muted aspect-video relative shadow-soft">
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
              aria-label="Xem trước camera"
            />
            {!on && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
                <CamIcon className="w-12 h-12 text-muted-foreground" />
                <p className="font-display text-lg">Camera đang tắt</p>
                {!modelsReady && (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang tải AI...
                  </p>
                )}
                {error && <p className="text-sm text-destructive max-w-xs">{error}</p>}
              </div>
            )}
            {on && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-3 py-1 shadow-soft">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="font-display text-sm">Đang theo dõi</span>
              </div>
            )}

            {/* Hold ring */}
            {on && holdProgress > 0 && !passed && (
              <div className="absolute top-3 right-3 w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${holdProgress * 100} 100`}
                    transform="rotate(-90 18 18)"
                    style={{ transition: "stroke-dasharray 120ms linear" }}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-xs font-bold">
                  {Math.round(holdProgress * 100)}%
                </span>
              </div>
            )}

            {/* Detected badge */}
            {on && latest && (
              <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-3 py-1.5 shadow-soft">
                <span className="font-display text-xs text-muted-foreground">Đang thấy</span>
                <span className="font-display text-sm font-bold">
                  {getEmotion(latest.appEmotion as EmotionKey).label}
                </span>
                <span className="font-display text-xs text-muted-foreground">
                  {Math.round((latest.appScores[latest.appEmotion] ?? 0) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            {!on ? (
              <Button variant="hero" size="lg" onClick={start} disabled={!modelsReady}>
                <CamIcon /> {modelsReady ? "Bật camera" : "Đang tải..."}
              </Button>
            ) : (
              <>
                {passed ? (
                  <Button variant="hero" size="lg" onClick={next}>
                    Mục tiêu tiếp <ChevronRight />
                  </Button>
                ) : (
                  <Button variant="soft" size="lg" onClick={next}>
                    Bỏ qua
                  </Button>
                )}
                <Button variant="outline" size="lg" onClick={stopCamera}>
                  <CameraOff /> Tắt
                </Button>
              </>
            )}
            {isGroqConfigured() && (
              <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="rounded"
                />
                <Sparkles className="w-4 h-4" /> AI Coach
              </label>
            )}
          </div>

          {error && on && <p className="text-sm text-destructive mt-2">{error}</p>}
          <p className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Nhận dạng khuôn mặt chạy ngay trên thiết bị. Không gửi ảnh đi đâu.
          </p>

          {/* Confidence bars */}
          {on && latest && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMOTION_KEYS.map((k) => {
                const v = latest.appScores[k] ?? 0;
                const isTarget = k === target.key;
                const em = getEmotion(k as EmotionKey);
                return (
                  <div
                    key={k}
                    className={cn(
                      "rounded-2xl border bg-card p-2.5 transition-colors",
                      isTarget ? "border-primary ring-2 ring-primary/30" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-xs">{em.label}</span>
                      <span className="font-display text-xs text-muted-foreground tabular-nums">
                        {Math.round(v * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-[width] duration-150",
                          isTarget ? "bg-primary" : "bg-foreground/40",
                        )}
                        style={{ width: `${Math.round(v * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Right column ─── */}
        <div className="space-y-4">
          {/* Target card */}
          <div className={`card-soft p-5 ${target.color}`}>
            <p className="font-display text-sm uppercase tracking-wide">Hãy thể hiện</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-card/40 shadow-soft shrink-0">
                {useReal ? (
                  <SmartImage sources={target.realImages} fallback={target.image} alt={target.label} className="rounded-2xl" />
                ) : (
                  <img src={target.image} alt={target.label} loading="lazy" width={80} height={80}
                    className="w-full h-full object-contain drop-shadow-[0_8px_10px_hsl(218_60%_40%/0.25)]" />
                )}
              </div>
              <h2 className="font-display text-3xl font-bold">{target.label}</h2>
            </div>
            {target.faceCues?.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 mt-3">
                {target.faceCues.map((c) => (
                  <li key={c} className="text-[11px] font-display rounded-full bg-card/70 px-2 py-0.5">{c}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Coach hint */}
          <AnimatePresence mode="wait">
            <motion.div
              key={hint.message}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "card-soft p-5 space-y-2",
                hint.tone === "celebrate" && "bg-gradient-mint",
                hint.tone === "adjust" && "bg-gradient-sunshine",
                hint.tone === "encourage" && "bg-gradient-sky",
              )}
            >
              <p className="font-display text-sm uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Lumi hướng dẫn
              </p>
              <p className="font-display text-lg leading-snug">{hint.message}</p>
            </motion.div>
          </AnimatePresence>

          {/* Mascot khi chưa bật */}
          {!on && !lessonComplete && (
            <Mascot size={130} message="Bật camera và mình sẽ hướng dẫn bạn từng bước!" />
          )}

          {/* Lesson complete */}
          {lessonComplete && (
            <div className="card-3d p-5 bg-gradient-mint text-center space-y-2">
              <h3 className="font-display text-xl font-bold">Hoàn thành bài học! 🎉</h3>
              <p className="text-foreground/80 text-sm">Bạn đã thể hiện đúng đủ số mục tiêu.</p>
              <Button asChild variant="hero" className="w-full">
                <Link to={nextLessonHref}>Bài tiếp theo</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraPractice;
