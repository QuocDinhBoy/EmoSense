import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { signInChild, signUpChild } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

import cloudAv from "@/assets/avatars/cloud.png";
import starAv from "@/assets/avatars/star.png";
import bearAv from "@/assets/avatars/bear.png";
import bunnyAv from "@/assets/avatars/bunny.png";
import foxAv from "@/assets/avatars/fox.png";
import robotAv from "@/assets/avatars/robot.png";

const AVATARS = [
  { key: "cloud", img: cloudAv },
  { key: "star", img: starAv },
  { key: "bear", img: bearAv },
  { key: "bunny", img: bunnyAv },
  { key: "fox", img: foxAv },
  { key: "robot", img: robotAv },
];

const Auth = () => {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("cloud");
  const [busy, setBusy] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (username.trim().length < 2) return notify.error("Hãy chọn tên đăng nhập (từ 2 ký tự)");
    if (!/^\d{4}$/.test(pin)) return notify.error("Mã PIN gồm 4 chữ số");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await signUpChild({ username, pin, displayName: name || username, avatar });
        if (error) {
          if (error.message.toLowerCase().includes("already")) return notify.error("Tên này đã có — thử đăng nhập nhé!");
          return notify.error(error.message);
        }
        notify.success(`Chào mừng ${name || username}! 🎉`);
        nav("/app");
      } else {
        const { error } = await signInChild(username, pin);
        if (error) return notify.error("Tên hoặc PIN chưa đúng. Thử lại nhé 💛");
        notify.success("Chào mừng bạn quay lại!");
        nav("/app");
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="card-3d w-full max-w-md p-8 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <Mascot size={120} float />
          <h1 className="font-display text-3xl font-bold text-center">
            {mode === "signin" ? "Chào mừng quay lại!" : "Cùng bắt đầu nào!"}
          </h1>
        </div>

        {mode === "signup" && (
          <div>
            <label className="font-display font-semibold text-sm" htmlFor="auth-name">Tên của bạn</label>
            <input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ví dụ: Mít"
              className="mt-1 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-lg shadow-soft focus:outline-none focus:ring-4 focus:ring-primary/30" />
          </div>
        )}

        <div>
          <label className="font-display font-semibold text-sm" htmlFor="auth-username">Tên đăng nhập</label>
          <input id="auth-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="chọn một tên ngắn gọn"
            autoComplete="username"
            className="mt-1 w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-lg shadow-soft focus:outline-none focus:ring-4 focus:ring-primary/30" />
        </div>

        <div>
          <label className="font-display font-semibold text-sm" htmlFor="auth-pin">Mã PIN 4 số</label>
          <div className="relative mt-1">
            <input id="auth-pin" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric" type={showPin ? "text" : "password"} placeholder="••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 pr-12 text-2xl tracking-[0.6em] text-center shadow-soft focus:outline-none focus:ring-4 focus:ring-primary/30" />
            <button type="button" onClick={() => setShowPin(v => !v)} aria-label={showPin ? "Ẩn PIN" : "Hiện PIN"}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground mt-2">Hãy ghi nhớ kỹ — PIN không thể khôi phục.</p>
          )}
        </div>

        {mode === "signup" && (
          <div>
            <label className="font-display font-semibold text-sm">Chọn hình đại diện</label>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {AVATARS.map(a => (
                <button key={a.key} type="button" onClick={() => setAvatar(a.key)}
                  aria-label={a.key}
                  aria-pressed={avatar === a.key}
                  className={`aspect-square rounded-2xl shadow-soft border-2 p-1.5 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${avatar === a.key ? "border-primary ring-4 ring-primary/30 bg-gradient-sky" : "border-transparent bg-card"}`}>
                  <img src={a.img} alt="" loading="lazy" width={64} height={64} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={busy}>
          {busy ? "..." : mode === "signin" ? "Vào học thôi" : "Tạo tài khoản"}
        </Button>

        <div className="text-center text-sm">
          {mode === "signin" ? (
            <>Mới đến đây?{" "}
              <button type="button" className="font-display font-bold text-primary" onClick={() => setMode("signup")}>Tạo tài khoản</button>
            </>
          ) : (
            <>Đã có tài khoản?{" "}
              <button type="button" className="font-display font-bold text-primary" onClick={() => setMode("signin")}>Đăng nhập</button>
            </>
          )}
        </div>

        <div className="text-center">
          <Link to="/" className="text-xs text-muted-foreground">Về trang chủ</Link>
        </div>
      </motion.form>
    </div>
  );
};

export default Auth;
