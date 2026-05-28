import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, Map, Camera, BookOpen, Heart, Sparkles, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { Icon3D } from "./Icon3D";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { SettingsSheet } from "./SettingsSheet";
import { ErrorBoundary } from "./ErrorBoundary";
import { BreakReminder } from "./BreakReminder";
import { LumiChat } from "./LumiChat";
import { useASDPreferences } from "@/hooks/useASDPreferences";
import { useEffect, useState } from "react";
import logoMascot from "@/assets/mascot.png";
import cloudAv from "@/assets/avatars/cloud.png";
import starAv from "@/assets/avatars/star.png";
import bearAv from "@/assets/avatars/bear.png";
import bunnyAv from "@/assets/avatars/bunny.png";
import foxAv from "@/assets/avatars/fox.png";
import robotAv from "@/assets/avatars/robot.png";

const navItems = [
  { to: "/app", shortLabel: "Nhà", label: "Trang chủ", icon: Home, end: true },
  { to: "/app/learn", shortLabel: "Học", label: "Học", icon: Map },
  { to: "/app/camera", shortLabel: "Camera", label: "Camera", icon: Camera },
  { to: "/app/stories", shortLabel: "Truyện", label: "Truyện", icon: BookOpen },
  { to: "/app/journal", shortLabel: "Nhật ký", label: "Nhật ký", icon: Heart },
  { to: "/app/rewards", shortLabel: "Thưởng", label: "Thưởng", icon: Sparkles },
  { to: "/app/parent", shortLabel: "Bố mẹ", label: "Phụ huynh", icon: BarChart3 },
];

const AVATAR_IMG: Record<string, string> = {
  cloud: cloudAv, star: starAv, bear: bearAv, bunny: bunnyAv, fox: foxAv, robot: robotAv,
};

export const AppLayout = () => {
  const { pathname } = useLocation();
  const { profile } = useProfile();
  const { prefs } = useASDPreferences();
  // Manual toggle (persisted): user's explicit preference
  const [navManualHidden, setNavManualHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nav-manual-hidden") === "true";
  });
  // Auto hide on scroll-down, show on scroll-up
  const [navAutoHidden, setNavAutoHidden] = useState(false);

  useEffect(() => {
    localStorage.setItem("nav-manual-hidden", String(navManualHidden));
  }, [navManualHidden]);

  // Scroll listener: hide when scrolling down past threshold, show when scrolling up
  useEffect(() => {
    if (navManualHidden) return;
    let anchorY = window.scrollY; // điểm tham chiếu, chỉ đổi khi state đổi
    let ticking = false;
    const HIDE_DELTA = 32; // phải kéo xuống ít nhất 32px mới ẩn
    const SHOW_DELTA = 16; // chỉ cần kéo lên 16px là hiện
    const TOP_THRESHOLD = 80;

    const onScroll = () => {
      // Trên desktop (md+), nav là sticky → xóa khỏi DOM gây layout shift & scroll jump.
      // Chỉ auto-hide trên mobile (nav là fixed, không ảnh hưởng layout).
      if (window.innerWidth >= 768) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY); // clamp để tránh rubber-band âm
        if (y < TOP_THRESHOLD) {
          setNavAutoHidden((prev) => {
            if (prev) anchorY = y;
            return false;
          });
        } else {
          const diff = y - anchorY;
          if (diff > HIDE_DELTA) {
            setNavAutoHidden((prev) => {
              if (!prev) anchorY = y;
              return true;
            });
          } else if (diff < -SHOW_DELTA) {
            setNavAutoHidden((prev) => {
              if (prev) anchorY = y;
              return false;
            });
          }
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [navManualHidden]);

  const navVisible = !navManualHidden && !navAutoHidden;

  // Apply accessibility prefs to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("text-lg", !!profile?.large_text);
    if (profile?.reduced_motion) {
      root.style.setProperty("--motion-scale", "0");
    } else {
      root.style.removeProperty("--motion-scale");
    }
    // ASD preferences
    root.classList.toggle("high-contrast", prefs.contrastMode === "high");
    root.classList.toggle("no-gradients", !prefs.gradientsEnabled);
  }, [profile?.large_text, profile?.reduced_motion, prefs.contrastMode, prefs.gradientsEnabled]);

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-card px-3 py-2 rounded-xl shadow-soft">Đến nội dung chính</a>

      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="container flex items-center justify-between h-16 gap-3">
          <NavLink to="/app" className="flex items-center gap-2 font-display text-xl md:text-2xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
            <img src={logoMascot} alt="" width={40} height={40} className="w-10 h-10 object-contain drop-shadow-[0_4px_6px_hsl(218_60%_40%/0.25)]" />
            EmoSense
          </NavLink>
          <div className="flex items-center gap-2">
            {profile && (
              <div className="flex items-center gap-2 rounded-2xl bg-card border border-border shadow-soft pl-1.5 pr-2 sm:pr-3 py-1 min-h-[44px]">
                <img
                  src={AVATAR_IMG[profile.avatar] ?? cloudAv}
                  alt=""
                  width={56}
                  height={56}
                  className="w-7 h-7 object-contain drop-shadow-[0_2px_3px_hsl(218_60%_40%/0.25)]"
                />
                <span className="hidden sm:inline font-display font-bold text-sm max-w-[8rem] truncate">{profile.display_name}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon3D name="star" size={16} /> {profile.stars}
                </span>
              </div>
            )}
            <SettingsSheet />
          </div>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {navVisible && (
          <motion.nav
            key="main-nav"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: profile?.reduced_motion ? 0 : 0.2 }}
            className="pointer-events-none fixed inset-x-0 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 px-2 md:sticky md:top-16 md:bottom-auto md:z-20 md:px-0 md:py-3 md:pointer-events-auto"
            aria-label="Điều hướng chính"
          >
            <div className="card-3d pointer-events-auto mx-auto grid w-full max-w-[34rem] grid-cols-7 gap-0.5 px-1 py-1.5 sm:gap-1 sm:px-1.5 md:max-w-4xl">
              {navItems.map((it) => {
                const active = it.end ? pathname === it.to : pathname.startsWith(it.to);
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end as any}
                    aria-label={it.label}
                    aria-current={active ? "page" : undefined}
                    className="min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <motion.div
                      whileTap={{ scale: profile?.reduced_motion ? 1 : 0.92 }}
                      className={cn(
                        "flex h-[60px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5 transition-colors sm:px-1.5 md:h-[62px] md:px-3",
                        active ? "bg-gradient-sky shadow-soft" : "hover:bg-muted",
                      )}
                    >
                      <it.icon className={cn("h-5 w-5 shrink-0 md:h-6 md:w-6", active ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("block max-w-full truncate text-[10px] font-display font-semibold leading-tight md:text-[11px]", active ? "text-primary" : "text-muted-foreground")}>
                        <span className="sm:hidden">{it.shortLabel}</span>
                        <span className="hidden sm:inline">{it.label}</span>
                      </span>
                    </motion.div>
                  </NavLink>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Toggle button: hide/show navigation */}
      <button
        type="button"
        onClick={() => {
          setNavManualHidden((v) => !v);
          setNavAutoHidden(false);
        }}
        aria-label={navManualHidden ? "Hiện thanh điều hướng" : "Ẩn thanh điều hướng"}
        aria-pressed={navManualHidden}
        className={cn(
          "fixed right-3 z-50 inline-flex items-center justify-center rounded-full border-2 border-border bg-card text-foreground shadow-float transition-all hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden",
          "h-10 w-10",
          navVisible
            ? "bottom-[calc(5.5rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        )}
      >
        {navVisible ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
      </button>

      <main
        id="main"
        className={cn(
          "flex-1 container py-6 md:py-8 md:pb-10",
          navManualHidden
            ? "pb-[calc(2rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(8.25rem+env(safe-area-inset-bottom))] md:pb-10",
        )}
      >
        <ErrorBoundary><Outlet /></ErrorBoundary>
      </main>

      {/* Soft fade so content doesn't collide visually with the floating nav */}
      {navVisible && (
        <div
          aria-hidden
          className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 h-20 bg-gradient-to-t from-background/90 via-background/45 to-transparent md:hidden"
        />
      )}

      {/* Break reminder for ASD session management */}
      <BreakReminder />
      {/* Floating Lumi chat */}
      <LumiChat />
    </div>
  );
};
