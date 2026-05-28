import mascot from "@/assets/mascot.png";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/lib/useReducedMotion";

interface MascotProps {
  size?: number;
  message?: string;
  className?: string;
  float?: boolean;
}

export const Mascot = ({ size = 180, message, className, float = true }: MascotProps) => {
  const reduce = usePrefersReducedMotion();
  const shouldFloat = float && !reduce;
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <motion.img
        src={mascot}
        alt="Lumi - đám mây bạn đồng hành"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="drop-shadow-[0_18px_24px_hsl(218_70%_60%/0.25)]"
        animate={shouldFloat ? { y: [0, -8, 0] } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {message && (
        <div className="relative max-w-xs rounded-3xl bg-card px-5 py-3 text-center shadow-soft border border-border">
          <span className="font-display text-base text-foreground">{message}</span>
          <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 bg-card border-l border-t border-border" />
        </div>
      )}
    </div>
  );
};
