import { Sparkles } from "lucide-react";
import { Icon3D, type Icon3DName } from "@/components/Icon3D";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import starImg from "@/assets/rewards/star.png";
import balloonImg from "@/assets/rewards/balloon.png";
import rainbowImg from "@/assets/rewards/rainbow.png";
import butterflyImg from "@/assets/rewards/butterfly.png";
import bearImg from "@/assets/rewards/bear.png";
import rocketImg from "@/assets/rewards/rocket.png";
import paletteImg from "@/assets/rewards/palette.png";
import cloverImg from "@/assets/rewards/clover.png";

const stickers = [
  { img: starImg, label: "Bài học đầu tiên", at: 1 },
  { img: balloonImg, label: "5 ngôi sao", at: 5 },
  { img: rainbowImg, label: "Ngày cầu vồng", at: 10 },
  { img: butterflyImg, label: "Bậc thầy bình yên", at: 20 },
  { img: bearImg, label: "Bạn của truyện", at: 30 },
  { img: rocketImg, label: "Phi công ngôi sao", at: 50 },
  { img: paletteImg, label: "Sáng tạo", at: 75 },
  { img: cloverImg, label: "May mắn ghép đôi", at: 100 },
];

const Rewards = () => {
  const { profile } = useProfile();
  const stars = profile?.stars ?? 0;
  const reduce = !!profile?.reduced_motion;
  const nextSticker = stickers.find(s => stars < s.at);
  const prevAt = nextSticker ? (stickers.filter(s => s.at < nextSticker.at).pop()?.at ?? 0) : 0;
  const pct = nextSticker ? Math.round(((stars - prevAt) / (nextSticker.at - prevAt)) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="card-3d p-6 md:p-8 grid sm:grid-cols-3 gap-4 bg-gradient-sunshine">
        <Stat icon="star" label="Ngôi sao" value={stars} />
        <Stat icon="flame" label="Chuỗi ngày" value={profile?.streak ?? 0} />
        <Stat icon="trophy" label="Cấp độ" value={profile?.level ?? 1} />
      </div>

      {nextSticker && (
        <div className="card-soft p-5">
          <div className="flex items-center gap-4">
            <img src={nextSticker.img} alt="" width={64} height={64} className="w-14 h-14 object-contain opacity-70" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold">Mốc tiếp theo: {nextSticker.label}</p>
              <p className="text-sm text-muted-foreground">Còn {nextSticker.at - stars}⭐ để mở khóa</p>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full bg-gradient-mint transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2"><Sparkles className="text-primary" /> Sổ sticker</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {stickers.map((s) => {
            const earned = stars >= s.at;
            return (
              <motion.div key={s.label} whileHover={reduce ? undefined : { y: -4 }}
                className={`card-soft p-5 flex flex-col items-center text-center gap-2 transition-all ${earned ? "ring-2 ring-primary/30" : "opacity-40 grayscale"}`}>
                <img src={s.img} alt={s.label} loading="lazy" width={128} height={128} className="w-20 h-20 object-contain drop-shadow-[0_8px_10px_hsl(218_60%_40%/0.25)]" />
                <p className="font-display font-bold text-sm">{s.label}</p>
                <p className="text-xs text-muted-foreground">{earned ? "Đã đạt ✨" : `${s.at}⭐`}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: Icon3DName; label: string; value: number }) => (
  <div className="rounded-2xl bg-card/80 backdrop-blur shadow-soft p-5 flex items-center gap-4 border border-border">
    <div className="w-14 h-14 rounded-2xl bg-gradient-sky shadow-soft flex items-center justify-center p-1.5">
      <Icon3D name={icon} size={44} />
    </div>
    <div>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  </div>
);

export default Rewards;
