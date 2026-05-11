import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { Camera as CamIcon, CameraOff, RefreshCw, ShieldCheck, Loader2 } from "lucide-react";
import { EMOTIONS, type EmotionKey, getEmotion } from "@/data/emotions";
import { motion } from "framer-motion";
import { detectExpression, loadFaceModels, mapToAppEmotion } from "@/lib/faceDetect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { useSpeak, vibrate } from "@/lib/speech";

const PROMPTS: EmotionKey[] = ["happy", "surprised", "sad", "calm", "angry"];

const CameraPractice = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptIdx, setPromptIdx] = useState(0);
  const [result, setResult] = useState<{ emotion: EmotionKey; score: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak } = useSpeak();

  const target = getEmotion(PROMPTS[promptIdx]);

  useEffect(() => {
    loadFaceModels().then(() => setModelsReady(true)).catch(() => setModelsReady(false));
  }, []);

  // Đọc prompt sau khi camera đã bật (đã có tương tác)
  useEffect(() => {
    if (on) speak(`Hãy thể hiện: ${target.label}`);
  }, [promptIdx, target.label, speak, on]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setOn(true);
    } catch {
      setError("Không mở được camera. Hãy kiểm tra quyền truy cập rồi thử lại.");
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setOn(false);
  };

  useEffect(() => () => stop(), []);

  const analyze = async () => {
    if (!videoRef.current) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const det = await detectExpression(videoRef.current);
      if (!det) {
        setAnalyzing(false);
        setResult(null);
        setError("Mình chưa thấy khuôn mặt. Lại gần camera một chút nhé 💛");
        return;
      }
      setError(null);
      const mapped = mapToAppEmotion(det.emotion);
      const matched = mapped === target.key;
      const detectedLabel = getEmotion(mapped as EmotionKey).label;
      setResult({ emotion: mapped as EmotionKey, score: det.confidence });
      speak(matched ? `Tuyệt vời! ${detectedLabel}` : `Mình thấy ${detectedLabel}. Thử lại nhé`);
      if (matched) { vibrate([15, 40, 15]); setDoneCount(c => c + 1); }

      if (user) {
        await supabase.from("camera_attempts").insert({
          user_id: user.id,
          target_emotion: target.key,
          detected_emotion: mapped,
          confidence: Number(det.confidence.toFixed(3)),
          matched,
        });
        await logProgress({ userId: user.id, activity: "camera", emotion: target.key, correct: matched });
        if (matched) await addStars(2);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const next = () => { setResult(null); setError(null); setPromptIdx((promptIdx + 1) % PROMPTS.length); };
  const detected = result ? getEmotion(result.emotion) : null;
  const isMatch = result?.emotion === target.key;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Luyện qua camera</h1>
          <p className="text-muted-foreground">Hãy thể hiện cảm xúc bằng khuôn mặt. AI chạy ngay trên thiết bị · không gửi đi đâu cả.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 font-display text-sm shadow-soft min-h-[40px]">
          ✅ {doneCount}/{PROMPTS.length} mục tiêu
        </span>
      </div>

      <div className="card-3d p-6 md:p-8 grid md:grid-cols-[1fr_320px] gap-6">
        <div>
          <div className="rounded-3xl overflow-hidden bg-muted aspect-video relative shadow-soft">
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted aria-label="Xem trước camera" />
            {!on && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
                <CamIcon className="w-12 h-12 text-muted-foreground" />
                <p className="font-display text-lg">Camera đang tắt</p>
                {!modelsReady && <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Đang tải AI...</p>}
                {error && <p className="text-sm text-destructive max-w-xs">{error}</p>}
              </div>
            )}
            {on && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full bg-card/90 backdrop-blur px-3 py-1 shadow-soft">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="font-display text-sm">Đang ghi</span>
              </div>
            )}
            {analyzing && (
              <div className="absolute inset-0 grid place-items-center bg-background/40 backdrop-blur-sm">
                <div className="rounded-2xl bg-card px-4 py-3 shadow-float inline-flex items-center gap-2 font-display">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" /> Đang xem khuôn mặt...
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            {!on ? (
              <Button variant="hero" size="lg" onClick={start} disabled={!modelsReady}>
                <CamIcon /> {modelsReady ? "Bật camera" : "Đang tải..."}
              </Button>
            ) : (
              <>
                <Button variant="hero" size="lg" onClick={analyze} disabled={analyzing}>
                  {analyzing ? <><RefreshCw className="animate-spin" /> Đang xem...</> : <>✨ Kiểm tra khuôn mặt</>}
                </Button>
                <Button variant="soft" size="lg" onClick={next} disabled={analyzing}>Bỏ qua</Button>
                <Button variant="outline" size="lg" onClick={stop}><CameraOff /> Tắt</Button>
              </>
            )}
          </div>

          {error && on && <p className="text-sm text-destructive mt-2">{error}</p>}
          <p className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Camera chỉ chạy trên thiết bị của bạn. Không có gì được tải lên.
          </p>
        </div>

        <div className="space-y-4">
          <div className={`card-soft p-5 ${target.color}`}>
            <p className="font-display text-sm uppercase tracking-wide">Hãy thử</p>
            <div className="flex items-center gap-3 mt-1">
              <img src={target.image} alt={target.label} loading="lazy" width={80} height={80} className="w-16 h-16 object-contain drop-shadow-[0_8px_10px_hsl(218_60%_40%/0.25)]" />
              <h2 className="font-display text-3xl font-bold">Thể hiện: {target.label}</h2>
            </div>
          </div>

          {result && detected && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-5 space-y-3">
              <p className="font-display text-sm uppercase tracking-wide text-muted-foreground">Mình thấy</p>
              <div className="flex items-center gap-3">
                <img src={detected.image} alt={detected.label} loading="lazy" width={64} height={64} className="w-14 h-14 object-contain" />
                <div>
                  <p className="font-display text-2xl font-bold">{detected.label}</p>
                  <p className="text-sm text-muted-foreground">Độ tin cậy {(result.score * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div className={`rounded-2xl p-3 ${isMatch ? "bg-gradient-mint" : "bg-gradient-sunshine"}`}>
                <p className="font-display">
                  {isMatch ? "Tuyệt vời! +2 ngôi sao 🌟" : "Cố gắng tốt lắm! Thử lại nhé 💛"}
                </p>
              </div>
              <Button variant="soft" size="lg" className="w-full" onClick={next}>Lượt tiếp theo</Button>
            </motion.div>
          )}

          {!result && (
            <Mascot size={140} message={on ? "Cười tươi khi sẵn sàng nhé!" : "Bấm nút lớn để bắt đầu."} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraPractice;
