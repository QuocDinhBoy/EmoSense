import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { EMOTIONS } from "@/data/emotions";
import { EmotionBubble } from "@/components/EmotionBubble";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import logoMascot from "@/assets/mascot.png";
import { Icon3D, type Icon3DName } from "@/components/Icon3D";

const features: { icon: Icon3DName; title: string; desc: string; bg: string }[] = [
  { icon: "sparkles", title: "Học nhẹ nhàng", desc: "Bài học cảm xúc từng bước nhỏ.", bg: "bg-gradient-sky" },
  { icon: "camera", title: "Luyện qua camera", desc: "Làm biểu cảm, nhận phản hồi dịu dàng.", bg: "bg-gradient-mint" },
  { icon: "scenarios", title: "Truyện & Tình huống", desc: "Học từ các tình huống thực tế.", bg: "bg-gradient-bubble" },
  { icon: "heart", title: "Nhật ký cảm xúc", desc: "Ghi lại cảm xúc mỗi ngày.", bg: "bg-gradient-sunshine" },
  { icon: "shield", title: "Thân thiện với trẻ tự kỷ", desc: "Bình yên, dễ đoán, không rối mắt.", bg: "bg-gradient-sky" },
  { icon: "chart", title: "Cho phụ huynh", desc: "Xem tiến trình và xu hướng.", bg: "bg-gradient-mint" },
];

const Landing = () => {
  return (
    <div className="min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2 font-display text-2xl font-bold text-primary">
          <img src={logoMascot} alt="" width={44} height={44} className="w-11 h-11 object-contain drop-shadow-[0_4px_8px_hsl(218_60%_40%/0.3)]" />
          EmoSense
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="hidden sm:inline-flex font-display font-semibold text-muted-foreground hover:text-foreground">Dành cho phụ huynh</Link>
          <Button asChild variant="soft" size="sm"><Link to="/auth">Mở ứng dụng</Link></Button>
        </nav>
      </header>

      <section className="container grid lg:grid-cols-2 gap-10 items-center py-10 lg:py-16">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-card shadow-soft border border-border px-4 py-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-display text-sm">Học cảm xúc bằng AI · cho trẻ tự kỷ</span>
          </motion.div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05]">
            Học cảm xúc cùng <span className="text-primary">Lumi</span>.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
            Một không gian an toàn, bình yên và vui tươi, nơi các bé khám phá cảm xúc qua những trò chơi nhẹ nhàng,
            câu chuyện ấm áp và bài luyện camera thân thiện.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button asChild variant="hero" size="xl"><Link to="/auth">Bắt đầu học</Link></Button>
            <Button asChild variant="outline" size="xl"><a href="#features">Khám phá tính năng</a></Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {EMOTIONS.map(e => (
              <div key={e.key} className="w-11 h-11 rounded-2xl bg-card shadow-soft flex items-center justify-center p-1" title={e.label}>
                <img src={e.image} alt={e.label} loading="lazy" width={64} height={64} className="w-full h-full object-contain drop-shadow-[0_6px_8px_hsl(218_60%_40%/0.25)]" />
              </div>
            ))}
            <span className="text-sm text-muted-foreground font-display">{EMOTIONS.length} cảm xúc cốt lõi</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 blur-3xl opacity-60 bg-gradient-bubble rounded-[3rem]" />
          <div className="card-3d p-8 md:p-12 flex flex-col items-center">
            <Mascot size={240} message="Chào bạn! Mình là Lumi. Cùng chơi nhé?" />
            <div className="mt-8 grid grid-cols-3 gap-3">
              {EMOTIONS.slice(0,3).map(e => <EmotionBubble key={e.key} emotion={e} size="sm" speakOnClick={false} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="container py-16 scroll-mt-20">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center mb-10">Bộ công cụ được làm bằng cả tấm lòng</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="card-soft p-6 flex flex-col gap-3">
              <div className={`w-16 h-16 rounded-2xl ${f.bg} shadow-soft flex items-center justify-center p-1.5`}>
                <Icon3D name={f.icon} size={48} alt="" />
              </div>
              <h3 className="font-display text-xl font-bold">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="container py-16">
        <div className="card-3d p-10 md:p-16 text-center bg-gradient-sky">
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">Sẵn sàng gặp Lumi chưa?</h2>
          <p className="text-lg text-foreground/80 mb-8 max-w-xl mx-auto">Mở ứng dụng và bắt đầu với một bài học nhỏ, nhẹ nhàng. Không cần đăng nhập phức tạp.</p>
          <Button asChild variant="hero" size="xl"><Link to="/auth">Bắt đầu hành trình</Link></Button>
        </div>
      </section>

      <footer className="container py-10 text-center text-sm text-muted-foreground">
        EmoSense · Hỗ trợ giáo dục, không phải chẩn đoán y khoa.
      </footer>
    </div>
  );
};

export default Landing;
