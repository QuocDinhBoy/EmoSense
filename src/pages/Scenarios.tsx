import { useEffect, useState } from "react";
import { EMOTIONS, type EmotionKey, getEmotion } from "@/data/emotions";
import { EmotionBubble } from "@/components/EmotionBubble";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Volume2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { logProgress } from "@/lib/progress";
import { useSpeak, vibrate } from "@/lib/speech";

interface Scene {
  text: string;
  answer: EmotionKey;
  why: string;
}

const SCENES: Scene[] = [
  { text: "Mít được bạn ở trường tặng một món quà.", answer: "happy", why: "Khi nhận được điều bất ngờ tốt đẹp, ta thường thấy vui." },
  { text: "Tháp xếp hình của Bo bị đổ mất rồi.", answer: "sad", why: "Khi điều mình tạo ra bị hỏng, ta có thể thấy buồn." },
  { text: "Có tiếng sấm rất to vọng vào từ ngoài trời.", answer: "scared", why: "Tiếng động lớn bất ngờ có thể khiến ta sợ. Điều đó bình thường thôi." },
  { text: "Em gái của Sam lấy đồ chơi mà không xin phép.", answer: "angry", why: "Khi cảm thấy không công bằng, ta có thể thấy giận." },
  { text: "Eli đang đọc sách yên lặng cùng chiếc chăn mềm.", answer: "calm", why: "Những khoảnh khắc yên tĩnh, ấm áp thường mang lại cảm giác bình yên." },
];

const Scenarios = () => {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<EmotionKey | null>(null);
  const [interacted, setInteracted] = useState(false);
  const scene = SCENES[i];
  const correct = pick === scene.answer;
  const { user } = useAuth();
  const { addStars } = useProfile();
  const { speak, stop } = useSpeak();

  useEffect(() => {
    stop();
    if (interacted) speak(scene.text);
    return () => stop();
  }, [i, scene.text, speak, stop, interacted]);

  const choose = async (k: EmotionKey) => {
    if (pick) return;
    setInteracted(true);
    setPick(k);
    const isCorrect = k === scene.answer;
    if (user) await logProgress({ userId: user.id, activity: "scenario", emotion: scene.answer, correct: isCorrect });
    if (isCorrect) { vibrate(15); await addStars(2); }
    setTimeout(() => speak(`${isCorrect ? "Đúng rồi. " : "Suy nghĩ tốt lắm. "}${scene.why}`), 200);
  };

  const next = () => { setPick(null); setI((i + 1) % SCENES.length); };
  const retry = () => { setPick(null); };

  const correctEmotion = getEmotion(scene.answer);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Bạn ấy sẽ cảm thấy thế nào?</h1>
        <p className="text-muted-foreground">Đọc câu chuyện nhỏ rồi chọn một cảm xúc.</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          className="card-3d p-8 bg-gradient-bubble relative">
          <p className="font-display text-2xl md:text-3xl leading-relaxed pr-14">{scene.text}</p>
          <button
            type="button"
            onClick={() => { setInteracted(true); speak(scene.text); }}
            aria-label="Nghe đọc câu chuyện"
            className="absolute top-4 right-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-card shadow-soft border border-border hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            <Volume2 className="w-5 h-5 text-primary" />
          </button>
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {EMOTIONS.map(e => (
          <EmotionBubble key={e.key} emotion={e} size="sm" selected={pick === e.key} onClick={() => choose(e.key)} speakOnClick={false} />
        ))}
      </div>

      {pick && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className={`card-soft p-6 ${correct ? "bg-gradient-mint" : "bg-gradient-sunshine"}`}>
          <p className="font-display text-xl font-bold mb-1">
            {correct ? "Đúng rồi! 🌟" : "Suy nghĩ tốt lắm 💛"}
          </p>
          {!correct && (
            <div className="inline-flex items-center gap-2 mt-1 mb-2 rounded-full bg-card px-3 py-1 border border-border">
              <img src={correctEmotion.image} alt="" width={28} height={28} className="w-7 h-7 object-contain" />
              <span className="font-display text-sm">Đáp án: <strong>{correctEmotion.label}</strong></span>
            </div>
          )}
          <p className="text-foreground/80">{scene.why}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            {!correct && <Button variant="outline" size="lg" onClick={retry}>Thử lại</Button>}
            <Button variant="hero" size="lg" onClick={next}>Câu chuyện tiếp <ChevronRight /></Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Scenarios;
