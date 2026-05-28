import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Emotion } from "@/data/emotions";
import { useSpeak } from "@/lib/speech";

interface Props {
  emotion: Emotion;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  /** Tự đọc tên cảm xúc khi nhấn */
  speakOnClick?: boolean;
}

const sizeMap = {
  sm: "w-20 h-20",
  md: "w-28 h-28",
  lg: "w-36 h-36",
};

export const EmotionBubble = ({ emotion, selected, onClick, size = "md", speakOnClick = true }: Props) => {
  const { speak } = useSpeak();
  return (
    <motion.button
      whileHover={{ scale: 1.06, rotate: -1 }}
      whileTap={{ scale: 0.94 }}
      onClick={() => {
        if (speakOnClick) speak(emotion.label);
        onClick?.();
      }}
      aria-label={emotion.label}
      aria-pressed={selected}
      className={cn(
        "group relative flex min-h-[110px] flex-col items-center gap-2 rounded-3xl p-3 transition-all",
        "bg-card shadow-soft hover:shadow-float border-2",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40",
        selected ? "border-primary ring-4 ring-primary/30" : "border-transparent",
      )}
    >
      <div className={cn("relative flex items-center justify-center", sizeMap[size])}>
        <img
          src={emotion.image}
          alt={emotion.label}
          loading="lazy"
          width={256}
          height={256}
          className="w-full h-full object-contain drop-shadow-[0_12px_18px_hsl(218_60%_40%/0.22)] select-none pointer-events-none"
          draggable={false}
        />
      </div>
      <span className="font-display text-base font-semibold">{emotion.label}</span>
    </motion.button>
  );
};
