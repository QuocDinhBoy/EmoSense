import { cn } from "@/lib/utils";
import star from "@/assets/ui/star.png";
import flame from "@/assets/ui/flame.png";
import trophy from "@/assets/ui/trophy.png";
import chart from "@/assets/ui/chart.png";
import gear from "@/assets/ui/gear.png";
import shield from "@/assets/ui/shield.png";
import sparkles from "@/assets/ui/sparkles.png";
import heart from "@/assets/ui/heart.png";
import camera from "@/assets/tiles/camera.png";
import scenarios from "@/assets/tiles/scenarios.png";
import flashcards from "@/assets/tiles/flashcards.png";
import journal from "@/assets/tiles/journal.png";
import learn from "@/assets/tiles/learn.png";
import match from "@/assets/tiles/match.png";

export const ICONS_3D = {
  star, flame, trophy, chart, gear, shield, sparkles, heart,
  camera, scenarios, flashcards, journal, learn, match,
} as const;

export type Icon3DName = keyof typeof ICONS_3D;

interface Icon3DProps {
  name: Icon3DName;
  size?: number;
  className?: string;
  alt?: string;
}

export const Icon3D = ({ name, size = 32, className, alt = "" }: Icon3DProps) => (
  <img
    src={ICONS_3D[name]}
    alt={alt}
    width={size * 2}
    height={size * 2}
    loading="lazy"
    style={{ width: size, height: size }}
    className={cn(
      "object-contain select-none pointer-events-none drop-shadow-[0_4px_6px_hsl(218_60%_40%/0.22)]",
      className,
    )}
    draggable={false}
  />
);
