import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  LogOut,
  Volume2,
  VolumeX,
  Type,
  Sparkles,
  Eye,
  Timer,
  Zap,
  MessageCircle,
  RotateCcw,
  Sun,
  Moon,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import {
  useASDPreferences,
  type SensoryLevel,
  type SpeechRate,
  type HintDetail,
  type VoiceGender,
} from "@/hooks/useASDPreferences";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Icon3D } from "./Icon3D";
import { cn } from "@/lib/utils";

export const SettingsSheet = () => {
  const { profile, update } = useProfile();
  const { prefs, updatePrefs, applySensoryPreset, resetToDefaults } =
    useASDPreferences();
  const nav = useNavigate();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Cài đặt"
          className="p-1.5"
        >
          <Icon3D name="gear" size={28} alt="Cài đặt" />
        </Button>
      </SheetTrigger>
      <SheetContent className="rounded-l-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Cài đặt</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* ═══════ SENSORY LEVEL ═══════ */}
          <Section
            icon={<Zap className="text-primary" />}
            title="Mức kích thích"
            desc="Chọn mức phù hợp với bé — tự động điều chỉnh nhiều cài đặt."
          >
            <div className="grid grid-cols-3 gap-2 mt-3">
              {(["low", "medium", "high"] as SensoryLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => applySensoryPreset(level)}
                  className={cn(
                    "rounded-2xl border-2 p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    prefs.sensoryLevel === level
                      ? "border-primary bg-gradient-sky shadow-soft"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <p className="font-display font-bold text-sm">
                    {level === "low"
                      ? "🌙 Nhẹ"
                      : level === "medium"
                      ? "☀️ Vừa"
                      : "⚡ Nhiều"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {level === "low"
                      ? "Ít hiệu ứng, chậm"
                      : level === "medium"
                      ? "Cân bằng"
                      : "Đầy đủ, nhanh"}
                  </p>
                </button>
              ))}
            </div>
          </Section>

          {/* ═══════ GIÁC QUAN ═══════ */}
          <Section
            icon={<Eye className="text-primary" />}
            title="Giác quan"
            desc="Điều chỉnh chi tiết theo nhu cầu."
          >
            <div className="space-y-3 mt-3">
              <Row
                title="Rung phản hồi"
                desc="Rung nhẹ khi đúng/sai"
              >
                <Switch
                  checked={prefs.vibrateEnabled}
                  onCheckedChange={(v) => updatePrefs({ vibrateEnabled: v })}
                />
              </Row>
              <Row
                title="Hiệu ứng gradient"
                desc="Nền màu chuyển sắc"
              >
                <Switch
                  checked={prefs.gradientsEnabled}
                  onCheckedChange={(v) => updatePrefs({ gradientsEnabled: v })}
                />
              </Row>
              <Row
                title="Tự phát âm thanh"
                desc="Đọc tự động khi đổi thẻ/câu"
              >
                <Switch
                  checked={prefs.autoplaySound}
                  onCheckedChange={(v) => updatePrefs({ autoplaySound: v })}
                />
              </Row>
              <Row
                title="Giảm lựa chọn"
                desc="Chỉ hiện 4 cảm xúc thay vì 7"
              >
                <Switch
                  checked={prefs.reducedChoices}
                  onCheckedChange={(v) => updatePrefs({ reducedChoices: v })}
                />
              </Row>
            </div>
          </Section>

          {/* ═══════ NHỊP ĐỘ ═══════ */}
          <Section
            icon={<Timer className="text-primary" />}
            title="Nhịp độ"
            desc="Tốc độ phù hợp với bé."
          >
            <div className="space-y-4 mt-3">
              <div>
                <p className="font-display text-sm font-bold mb-2">
                  Tốc độ đọc
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["slow", "normal", "fast"] as SpeechRate[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updatePrefs({ speechRate: r })}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 font-display text-xs font-bold transition-all",
                        prefs.speechRate === r
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {r === "slow" ? "🐢 Chậm" : r === "normal" ? "🚶 Vừa" : "🐇 Nhanh"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-display text-sm font-bold">
                    Thời gian giữ camera
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(prefs.holdDurationMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <Slider
                  value={[prefs.holdDurationMs]}
                  onValueChange={([v]) => updatePrefs({ holdDurationMs: v })}
                  min={600}
                  max={3000}
                  step={200}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Bé cần giữ biểu cảm bao lâu để hoàn thành
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-display text-sm font-bold">
                    Nghỉ giữa các bước
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {prefs.extraPauseMs === 0
                      ? "Không"
                      : `${(prefs.extraPauseMs / 1000).toFixed(1)}s`}
                  </span>
                </div>
                <Slider
                  value={[prefs.extraPauseMs]}
                  onValueChange={([v]) => updatePrefs({ extraPauseMs: v })}
                  min={0}
                  max={2000}
                  step={200}
                  className="w-full"
                />
              </div>
            </div>
          </Section>

          {/* ═══════ GIAO TIẾP ═══════ */}
          <Section
            icon={<MessageCircle className="text-primary" />}
            title="Giao tiếp"
            desc="Cách Lumi nói chuyện với bé."
          >
            <div className="space-y-3 mt-3">
              <div>
                <p className="font-display text-sm font-bold mb-2">
                  Giọng đọc
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["default", "female", "male"] as VoiceGender[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => updatePrefs({ voiceGender: g })}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 font-display text-xs font-bold transition-all",
                        prefs.voiceGender === g
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {g === "default" ? "🔊 Mặc định" : g === "female" ? "👩 Nữ" : "👨 Nam"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-display text-sm font-bold mb-2">
                  Mức chi tiết gợi ý
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["short", "detailed"] as HintDetail[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => updatePrefs({ hintDetail: d })}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 font-display text-xs font-bold transition-all",
                        prefs.hintDetail === d
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      {d === "short" ? "💬 Ngắn gọn" : "📝 Chi tiết"}
                    </button>
                  ))}
                </div>
              </div>

              <Row title="Hiện emoji" desc="Emoji trong gợi ý và phản hồi">
                <Switch
                  checked={prefs.showEmoji}
                  onCheckedChange={(v) => updatePrefs({ showEmoji: v })}
                />
              </Row>
            </div>
          </Section>

          {/* ═══════ PHIÊN HỌC ═══════ */}
          <Section
            icon={<Timer className="text-primary" />}
            title="Phiên học"
            desc="Giúp bé không quá tải."
          >
            <div className="space-y-4 mt-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-display text-sm font-bold">
                    Nhắc nghỉ sau
                  </p>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {prefs.breakReminderMin === 0
                      ? "Tắt"
                      : `${prefs.breakReminderMin} phút`}
                  </span>
                </div>
                <Slider
                  value={[prefs.breakReminderMin]}
                  onValueChange={([v]) => updatePrefs({ breakReminderMin: v })}
                  min={0}
                  max={30}
                  step={5}
                  className="w-full"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Lumi sẽ nhắc bé nghỉ ngơi nhẹ nhàng
                </p>
              </div>

              <Row
                title="Hiện đồng hồ phiên"
                desc="Đếm thời gian đã học"
              >
                <Switch
                  checked={prefs.showSessionTimer}
                  onCheckedChange={(v) =>
                    updatePrefs({ showSessionTimer: v })
                  }
                />
              </Row>
            </div>
          </Section>

          {/* ═══════ HIỂN THỊ CƠ BẢN ═══════ */}
          <Section
            icon={<Sun className="text-primary" />}
            title="Hiển thị"
            desc="Cài đặt chung."
          >
            <div className="space-y-3 mt-3">
              <Row
                icon={<Sparkles className="text-primary w-4 h-4" />}
                title="Giảm chuyển động"
                desc="Ít animation hơn"
              >
                <Switch
                  checked={!!profile?.reduced_motion}
                  onCheckedChange={(v) => update({ reduced_motion: v })}
                />
              </Row>

              <Row
                icon={<Type className="text-primary w-4 h-4" />}
                title="Chữ to hơn"
                desc="Dễ đọc hơn"
              >
                <Switch
                  checked={!!profile?.large_text}
                  onCheckedChange={(v) => update({ large_text: v })}
                />
              </Row>

              <Row
                icon={
                  profile?.sound_on ? (
                    <Volume2 className="text-primary w-4 h-4" />
                  ) : (
                    <VolumeX className="text-muted-foreground w-4 h-4" />
                  )
                }
                title="Âm thanh"
                desc="Giọng đọc và hiệu ứng"
              >
                <Switch
                  checked={!!profile?.sound_on}
                  onCheckedChange={(v) => update({ sound_on: v })}
                />
              </Row>

              <Row
                icon={<Moon className="text-primary w-4 h-4" />}
                title="Tương phản cao"
                desc="Viền đậm, nền rõ hơn"
              >
                <Switch
                  checked={prefs.contrastMode === "high"}
                  onCheckedChange={(v) =>
                    updatePrefs({ contrastMode: v ? "high" : "default" })
                  }
                />
              </Row>
            </div>
          </Section>

          {/* ═══════ ACTIONS ═══════ */}
          <div className="space-y-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={resetToDefaults}
            >
              <RotateCcw className="w-4 h-4" /> Đặt lại mặc định
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await signOut();
                nav("/");
              }}
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ─── Sub-components ─── */

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="font-display font-bold text-sm">{title}</p>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Row({
  icon,
  title,
  desc,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
      {icon && (
        <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-sm">{title}</p>
        <p className="text-[10px] text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  );
}
