import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import {
  Camera as CamIcon,
  CameraOff,
  ShieldCheck,
  Loader2,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Wand2,
} from "lucide-react";
import { type EmotionKey, getEmotion } from "@/data/emotions";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
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
import { buildLocalHint, fetchAIHint, type CoachHint } from "@/lib/coachHints";
import { cn } from "@/lib/utils";

/* --------------- Cấu hình mục tiêu mặc định --------------- */
const DEFAULT_TARGETS: EmotionKey[] = [
  "happy",
  "surprised",
  "sad",
  "calm",
  "angry",
  "scared",
];

/** Ngưỡng confidence để coi là "đạt". */
const PASS_THRESHOLD = 0.65;
/** Phải duy trì trên ngưỡng bao nhiêu ms thì auto-pass. */
const HOLD_DURATION_MS = 1200;
/** Khoảng giữa 2 lần phát hint (ms). */
const HINT_COOLDOWN_MS = 2500;
/** Khoảng giữa 2 lần hỏi AI (ms). Giữ thưa để không tốn quota. */
const AI_HINT_COOLDOWN_MS = 9000;

const EMOTION_KEYS: AppEmotion[] = [
  "happy",
  "sad",
  "angry",
  "scared",
  "surprised",
  "calm",
];

const MirrorCoach = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<LiveDetectionHandle | null>(null);

  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const [targetIdx, setTargetIdx] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [attemptsForTarget, setAttemptsForTarget] = useState(0);

  const [latest, setLatest] = useState<DetectionResult | null>(null);
  const [hint, setHint] = useState<CoachHint>({
    message: "Bấm bật camera để bắt đầu nhé.",
    tone: "encourage",
  });
  const [holdProgress, setHoldProgress] = useState(0); // 0..1
  const [recentHints, setRecentHints] = useState<string[]>([]);
  const [passed, setPassed] = useState(false);

  const target = getEmotion(DEFAULT_TARGETS[targetIdx % DEFAULT_TARGETS.length]);
  const totalGoals = DEFAULT_TARGETS.length;

  const { user } = useAuth();
  const { profile, addStars } = useProfile();
  const { speak, stop: stopSpeak } = useSpeak();

  /* ------------------ Refs để tracking trong loop ------------------ */
  const passedRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const lastHintAtRef = useRef(0);
  const lastAiAtRef = useRef(0);
  const rotationRef = useRef(0);
  const aiBusyRef = useRef(false);
  const attemptsRef = useRef(0);
  const recentHintsRef = useRef<string[]>([]);
  const aiEnabledRef = useRef(true);

  // Đồng bộ ref với state để loop luôn đọc giá trị mới nhất
  useEffect(() => {
    aiEnabledRef.current = aiEnabled;
  }, [aiEnabled]);
  useEffect(() => {
    recentHintsRef.current = recentHints;
  }, [recentHints]);

  /* ------------------ Load models ------------------ */
  useEffect(() => {
    loadFaceModels()
      .then(() => setModelsReady(true))
      .catch(() => setModelsReady(false));
  }, []);

  /* ------------------ Reset khi đổi mục tiêu ------------------ */
  useEffect(() => {
    passedRef.current = false;
    setPassed(false);
    holdStartRef.current = null;
    setHoldProgress(0);
    setAttemptsForTarget(0);
    attemptsRef.current = 0;
    rotationRef.current = 0;
    if (on) {
      const msg = `Hãy thể hiện cảm xúc ${target.label}.`;
      setHint({ message: msg, tone: "encourage" });
      speak(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetIdx]);

  /* ------------------ Camera control ------------------ */
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
      const greet = `Hãy thể hiện cảm xúc ${target.label}.`;
      setHint({ message: greet, tone: "encourage" });
      speak(greet);
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
    holdStartRef.current = null;
    setHoldProgress(0);
  };

  // Cleanup
  useEffect(() => () => stopCamera(), []);

  /* ------------------ Live detection loop ------------------ */
  useEffect(() => {
    if (!on || !videoRef.current || !modelsReady) return;

    const handle = startLiveDetection(videoRef.current, {
      intervalMs: 220,
      onTick: (res) => handleTick(res),
    });
    detectionRef.current = handle;

    return () => {
      handle.stop();
      detectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, modelsReady, targetIdx]);

  /* ------------------ Xử lý mỗi tick detect ------------------ */
  const handleTick = (res: DetectionResult | null) => {
    setLatest(res);
    if (passedRef.current) return;

    if (!res) {
      // Mất khuôn mặt – reset hold
      holdStartRef.current = null;
      setHoldProgress(0);
      maybeSpeakHint({
        message: "Mình chưa thấy khuôn mặt. Lại gần camera một chút nhé.",
        tone: "adjust",
      });
      return;
    }

    const targetKey = target.key as AppEmotion;
    const score = res.appScores[targetKey] ?? 0;

    if (score >= PASS_THRESHOLD) {
      const now = performance.now();
      if (holdStartRef.current === null) holdStartRef.current = now;
      const held = now - holdStartRef.current;
      setHoldProgress(Math.min(1, held / HOLD_DURATION_MS));
      if (held >= HOLD_DURATION_MS) {
        passSuccess(res);
      }
    } else {
      holdStartRef.current = null;
      setHoldProgress(0);
      // Cooldown để không "tám" liên tục
      const now = performance.now();
      if (now - lastHintAtRef.current >= HINT_COOLDOWN_MS) {
        lastHintAtRef.current = now;
        rotationRef.current += 1;
        attemptsRef.current += 1;
        setAttemptsForTarget(attemptsRef.current);
        const local = buildLocalHint(
          targetKey,
          res.appScores,
          res.appEmotion,
          PASS_THRESHOLD,
          rotationRef.current,
        );
        applyHint(local);

        // Sau vài lần loay hoay, hỏi AI để có gợi ý phong phú hơn
        if (
          aiEnabledRef.current &&
          attemptsRef.current >= 2 &&
          now - lastAiAtRef.current >= AI_HINT_COOLDOWN_MS &&
          !aiBusyRef.current
        ) {
          lastAiAtRef.current = now;
          requestAIHint(targetKey, res);
        }
      }
    }
  };

  const requestAIHint = async (targetKey: AppEmotion, res: DetectionResult) => {
    aiBusyRef.current = true;
    try {
      const ai = await fetchAIHint({
        target: targetKey,
        detected: res.appEmotion,
        scores: res.appScores,
        childName: profile?.display_name,
        attempts: attemptsRef.current,
        recent: recentHintsRef.current,
      });
      if (ai && !passedRef.current) {
        applyHint(ai);
      }
    } finally {
      aiBusyRef.current = false;
    }
  };

  const applyHint = (h: CoachHint) => {
    setHint(h);
    setRecentHints((r) => [h.message, ...r].slice(0, 5));
    speak(h.message);
  };

  const maybeSpeakHint = (h: CoachHint) => {
    const now = performance.now();
    if (now - lastHintAtRef.current < HINT_COOLDOWN_MS) return;
    lastHintAtRef.current = now;
    applyHint(h);
  };

  const passSuccess = async (res: DetectionResult) => {
    if (passedRef.current) return;
    passedRef.current = true;
    setPassed(true);
    holdStartRef.current = null;
    setHoldProgress(1);
    vibrate([15, 40, 15]);
    const msg = `Tuyệt vời! Đó là ${target.label}.`;
    setHint({ message: msg, tone: "celebrate" });
    speak(msg);
    setDoneCount((c) => c + 1);

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
        await logProgress({
          userId: user.id,
          activity: "camera",
          emotion: targetKey,
          correct: true,
        });
        await addStars(2);
      } catch {
        /* swallow – không chặn UX */
      }
    }
  };

  const next = () => {
    setTargetIdx((i) => (i + 1) % totalGoals);
  };

  const skip = () => {
    setTargetIdx((i) => (i + 1) % totalGoals);
  };

  const restart = () => {
    setDoneCount(0);
    setTargetIdx(0);
  };

  const allDone = doneCount >= totalGoals;

  /* ------------------ UI ------------------ */
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-2">
            <Wand2 className="w-7 h-7 text-primary" />
            Gương cảm xúc thông minh
          </h1>
          <p className="text-muted-foreground">
            Mình theo dõi gương mặt theo thời gian thực và gợi ý nhẹ nhàng. Hãy
            giữ vững biểu cảm trong {Math.round(HOLD_DURATION_MS / 1000)} giây
            để hoàn thành.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 font-display text-sm shadow-soft min-h-[40px]">
          ✅ {doneCount}/{totalGoals} mục tiêu
        </span>
      </div>

      <div className="card-3d p-6 md:p-8 grid lg:grid-cols-[1fr_360px] gap-6">
        {/* ---------- VIDEO + Confidence overlay ---------- */}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 bg-gradient-bubble/40 backdrop-blur-sm">
                <CamIcon className="w-12 h-12 text-muted-foreground" />
                <p className="font-display text-lg">Camera đang tắt</p>
                {!modelsReady && (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Đang tải AI...
                  </p>
                )}
                {error && (
                  <p className="text-sm text-destructive max-w-xs">{error}</p>
                )}
              </div>
            )}

            {/* Live indicator */}
            {on && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-3 py-1 shadow-soft">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="font-display text-sm">Đang theo dõi</span>
              </div>
            )}

            {/* Hold progress ring */}
            {on && holdProgress > 0 && !passed && (
              <div className="absolute top-3 right-3 w-14 h-14">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${holdProgress * 100} 100`}
                    transform="rotate(-90 18 18)"
                    style={{ transition: "stroke-dasharray 120ms linear" }}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-xs">
                  {Math.round(holdProgress * 100)}%
                </span>
              </div>
            )}

            {/* Detected pill */}
            {on && latest && (
              <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-3 py-1.5 shadow-soft">
                <span className="font-display text-xs text-muted-foreground">
                  Đang thấy
                </span>
                <span className="font-display text-sm font-bold">
                  {getEmotion(latest.appEmotion as EmotionKey).label}
                </span>
                <span className="font-display text-xs text-muted-foreground">
                  {Math.round((latest.appScores[latest.appEmotion] ?? 0) * 100)}
                  %
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-4">
            {!on ? (
              <Button
                variant="hero"
                size="lg"
                onClick={start}
                disabled={!modelsReady}
              >
                <CamIcon /> {modelsReady ? "Bật camera" : "Đang tải..."}
              </Button>
            ) : (
              <>
                <Button variant="soft" size="lg" onClick={skip}>
                  Bỏ qua mục này
                </Button>
                <Button variant="outline" size="lg" onClick={stopCamera}>
                  <CameraOff /> Tắt camera
                </Button>
              </>
            )}

            <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="rounded"
              />
              <Sparkles className="w-4 h-4" /> Gợi ý AI
            </label>
          </div>

          <p className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Camera & AI nhận dạng chạy
            ngay trên thiết bị của bạn.
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
                      isTarget
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border",
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

        {/* ---------- Right column: target + AI coach ---------- */}
        <div className="space-y-4">
          <div className={`card-soft p-5 ${target.color}`}>
            <p className="font-display text-sm uppercase tracking-wide">
              Mục tiêu
            </p>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-card/40 shadow-soft shrink-0">
                <img
                  src={target.image}
                  alt={target.label}
                  loading="lazy"
                  width={80}
                  height={80}
                  className="w-full h-full object-contain drop-shadow-[0_8px_10px_hsl(218_60%_40%/0.25)]"
                />
              </div>
              <h2 className="font-display text-3xl font-bold">{target.label}</h2>
            </div>
            {target.faceCues?.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 mt-3">
                {target.faceCues.map((c) => (
                  <li
                    key={c}
                    className="text-[11px] font-display rounded-full bg-card/70 px-2 py-0.5"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Coach panel */}
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
                <Sparkles className="w-4 h-4" /> Lumi đang hướng dẫn
              </p>
              <p className="font-display text-lg leading-snug">
                {hint.message}
              </p>
              {hint.tone === "celebrate" && (
                <div className="pt-2">
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full"
                    onClick={next}
                  >
                    Mục tiêu tiếp theo <ChevronRight />
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {!on && !allDone && (
            <Mascot
              size={140}
              message="Mình sẽ theo dõi mặt bạn và nói nhỏ vào tai cách điều chỉnh nhé!"
            />
          )}

          {allDone && (
            <div className="card-3d p-5 bg-gradient-mint text-center space-y-3">
              <h3 className="font-display text-xl font-bold">
                Hoàn thành mọi mục tiêu! 🎉
              </h3>
              <p className="text-foreground/80 text-sm">
                Bạn đã thể hiện đủ {totalGoals} cảm xúc.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="hero" onClick={restart}>
                  <RefreshCw /> Làm lại
                </Button>
                <Button asChild variant="soft">
                  <Link to="/app">Về trang chính</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MirrorCoach;
