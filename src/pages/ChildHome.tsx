import { Link } from "react-router-dom";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { Icon3D } from "@/components/Icon3D";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ALL_LESSONS, lessonHref } from "@/data/lessons";
import { getLessonState, useLessonProgressTick } from "@/lib/lessonProgress";
import learnImg from "@/assets/tiles/learn.png";
import flashcardsImg from "@/assets/tiles/flashcards.png";
import matchImg from "@/assets/tiles/match.png";
import cameraImg from "@/assets/tiles/camera.png";
import scenariosImg from "@/assets/tiles/scenarios.png";
import journalImg from "@/assets/tiles/journal.png";

const tiles = [
  { to: "/app/learn", title: "Bản đồ học tập", desc: "Cấp độ & bài học", img: learnImg, bg: "bg-gradient-sky" },
  { to: "/app/flashcards", title: "Thẻ học", desc: "Luyện cảm xúc", img: flashcardsImg, bg: "bg-gradient-bubble" },
  { to: "/app/match", title: "Trò chơi ghép", desc: "Kéo & ghép", img: matchImg, bg: "bg-gradient-mint" },
  { to: "/app/camera", title: "Luyện qua camera", desc: "AI hướng dẫn theo thời gian thực", img: cameraImg, bg: "bg-gradient-sunshine" },
  { to: "/app/scenarios", title: "Tình huống", desc: "Bạn sẽ cảm thấy thế nào?", img: scenariosImg, bg: "bg-gradient-sky" },
  { to: "/app/journal", title: "Nhật ký", desc: "Hôm nay bạn thấy sao?", img: journalImg, bg: "bg-gradient-bubble" },
];

const ChildHome = () => {
  const { profile, loading } = useProfile();
  const { user } = useAuth();
  const reduce = !!profile?.reduced_motion;
  const name = profile?.display_name ?? "bạn nhỏ";
  const tick = useLessonProgressTick();
  const [next, setNext] = useState<{ to: string; label: string }>({ to: "/app/learn", label: "Tiếp tục học" });

  useEffect(() => {
    void tick;
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("progress").select("activity, correct").eq("user_id", user.id);
      const totals: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        totals[r.activity] = (totals[r.activity] ?? 0) + (r.correct ?? 0);
      });
      // Tìm lesson đầu tiên trong lộ trình chưa hoàn thành
      const firstUndone = ALL_LESSONS.find(l => {
        const ls = getLessonState(l.id);
        if (ls.done) return false;
        const serverHits = totals[l.activity] ?? 0;
        return serverHits < l.threshold;
      });
      if (firstUndone) {
        setNext({ to: lessonHref(firstUndone), label: `Tiếp tục: ${firstUndone.title}` });
      } else {
        setNext({ to: "/app/learn", label: "Đã xong lộ trình – ôn tập" });
      }
    })();
  }, [user, tick]);

  return (
    <div className="space-y-8">
      <section className="card-3d p-6 md:p-8 grid md:grid-cols-[auto_1fr_auto] items-center gap-6 bg-gradient-sky">
        <Mascot size={140} float={!reduce} />
        <div>
          {loading ? (
            <>
              <div className="h-9 w-2/3 bg-muted rounded-xl animate-pulse" />
              <div className="h-5 w-1/2 bg-muted rounded mt-3 animate-pulse" />
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl md:text-4xl font-bold">Chào {name}! 👋</h1>
              <p className="text-foreground/80 text-lg mt-1">Hôm nay mình cùng học một cảm xúc nhé.</p>
            </>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card pl-1.5 pr-3 py-1 shadow-soft border border-border font-display text-sm min-h-[36px]"><Icon3D name="flame" size={22} /> Chuỗi {profile?.streak ?? 0} ngày</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card pl-1.5 pr-3 py-1 shadow-soft border border-border font-display text-sm min-h-[36px]"><Icon3D name="star" size={22} /> {profile?.stars ?? 0} ngôi sao</span>
          </div>
        </div>
        <Button asChild variant="hero" size="lg">
          <Link to={next.to} aria-label={next.label}>{next.label}</Link>
        </Button>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold mb-4">Chọn một hoạt động</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tiles.map((t, i) => (
            <motion.div key={t.to}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.04 }}>
              <Link to={t.to} aria-label={t.title} className="block card-soft p-6 hover:shadow-float transition-all group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40">
                <div className={`w-24 h-24 rounded-3xl ${t.bg} shadow-soft flex items-center justify-center mb-4 p-2 ${reduce ? "" : "group-hover:-rotate-3"} transition-transform`}>
                  <img src={t.img} alt="" loading="lazy" width={128} height={128} className="w-full h-full object-contain drop-shadow-[0_8px_12px_hsl(218_60%_40%/0.25)]" />
                </div>
                <h3 className="font-display text-xl font-bold">{t.title}</h3>
                <p className="text-muted-foreground">{t.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ChildHome;
