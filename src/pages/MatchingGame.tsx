import { useEffect, useMemo, useState } from "react";
import { EMOTIONS, type EmotionKey, getEmotion } from "@/data/emotions";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { notify } from "@/lib/notify";
import { useSpeak, vibrate } from "@/lib/speech";

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

const MatchingGame = () => {
  const pool = useMemo(() => EMOTIONS.slice(0, 5), []);
  const [labels, setLabels] = useState(() => shuffle(pool));
  const [matched, setMatched] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak } = useSpeak();

  // Phát hiện hoàn thành dựa trên state thực — đáng tin cậy
  useEffect(() => {
    if (Object.keys(matched).length === pool.length && !completed) {
      setCompleted(true);
      notify.success("Hoàn thành! Tuyệt vời 🎉");
      speak("Hoàn thành! Tuyệt vời");
      vibrate([20, 50, 20]);
      addStars(3);
    }
  }, [matched, pool.length, completed, speak, addStars]);

  const onFace = (key: string) => {
    if (selected === key) { setSelected(null); return; }
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
      setSelected(null);
    } else {
      speak("Thử lại nhé");
      notify.info("Gần đúng rồi! Thử lại nhé 💛");
    }
  };

  const reset = () => {
    setMatched({}); setLabels(shuffle(pool)); setSelected(null); setCompleted(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Ghép cảm xúc</h1>
          <p className="text-muted-foreground">Chạm vào khuôn mặt, rồi chạm vào từ phù hợp.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm text-muted-foreground">{Object.keys(matched).length}/{pool.length}</span>
          <Button variant="outline" onClick={reset}><RotateCcw /> Chơi lại</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card-soft p-5 space-y-3">
          <h2 className="font-display font-bold text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Khuôn mặt</h2>
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
                  aria-label={e.label}
                  aria-pressed={isSel}
                  className={`relative aspect-square min-h-[88px] rounded-3xl bg-card shadow-soft flex items-center justify-center p-3 border-4 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${
                    isSel ? "border-primary ring-4 ring-primary/30" : "border-transparent"
                  } ${done ? "opacity-50" : "hover:shadow-float"}`}
                >
                  <img src={e.image} alt={e.label} loading="lazy" width={160} height={160} className="w-full h-full object-contain drop-shadow-[0_8px_12px_hsl(218_60%_40%/0.25)]" />
                  {done && <Check className="absolute top-1 right-1 w-6 h-6 text-foreground bg-card rounded-full p-1" aria-hidden />}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="card-soft p-5 space-y-3">
          <h2 className="font-display font-bold text-lg">Từ ngữ</h2>
          <div className="grid grid-cols-2 gap-3">
            {labels.map(e => {
              const done = Object.values(matched).includes(e.key);
              return (
                <motion.button
                  key={e.key}
                  whileTap={{ scale: 0.94 }}
                  disabled={done}
                  onClick={() => onLabel(e.key)}
                  className={`min-h-[64px] rounded-2xl bg-card border-2 border-border shadow-soft px-4 py-5 font-display text-xl font-bold transition-all hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${done ? "opacity-50 line-through" : ""}`}
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
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card-3d p-6 bg-gradient-mint text-center space-y-3"
          >
            <h2 className="font-display text-2xl font-bold">Hoàn thành! +3 ngôi sao 🌟</h2>
            <p className="text-foreground/80">Bạn đã ghép đúng tất cả cảm xúc.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="hero" size="lg" onClick={reset}><RotateCcw /> Chơi lại</Button>
              <Button asChild variant="soft" size="lg"><Link to="/app/learn">Bản đồ học</Link></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchingGame;
