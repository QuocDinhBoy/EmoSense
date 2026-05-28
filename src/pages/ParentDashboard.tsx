import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Lightbulb, TrendingUp, Calendar, AlertTriangle, Loader2,
  Sparkles, Copy, CheckCircle2, Brain, FileText, Activity,
  Heart, Camera as CamIcon, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { EMOTIONS, getEmotion } from "@/data/emotions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { Icon3D } from "@/components/Icon3D";
import { cn } from "@/lib/utils";
import {
  generateParentReport, isGroqAvailable,
  type ParentReport, type ParentReportInput,
} from "@/lib/groqParentReport";

interface ProgressRow { activity: string; emotion: string; attempts: number; correct: number; last_at: string; }
interface JournalRow { emotion: string; created_at: string; note?: string | null; }
interface CameraRow { target_emotion: string; detected_emotion: string | null; confidence: number | null; matched: boolean; created_at: string; }

const ParentDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [journal, setJournal] = useState<JournalRow[]>([]);
  const [cameraData, setCameraData] = useState<CameraRow[]>([]);
  const [report, setReport] = useState<ParentReport | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: j }, { data: c }] = await Promise.all([
        supabase.from("progress").select("*").eq("user_id", user.id),
        supabase.from("journal_entries").select("emotion, created_at, note").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
        supabase.from("camera_attempts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setProgress((p as any) ?? []);
      setJournal((j as any) ?? []);
      setCameraData((c as any) ?? []);
    })();
  }, [user]);

  /* ─── Computed stats ─── */
  const totals = useMemo(() => {
    const att = progress.reduce((s, r) => s + r.attempts, 0);
    const cor = progress.reduce((s, r) => s + r.correct, 0);
    return { att, cor, acc: att ? Math.round((cor / att) * 100) : 0 };
  }, [progress]);

  const byEmotion = useMemo(() => {
    return EMOTIONS.map(e => {
      const rows = progress.filter(r => r.emotion === e.key);
      const att = rows.reduce((s, r) => s + r.attempts, 0);
      const cor = rows.reduce((s, r) => s + r.correct, 0);
      return { name: e.label, key: e.key, attempts: att, accuracy: att ? Math.round((cor / att) * 100) : 0, color: `hsl(var(--emo-${e.key}))` };
    }).filter(d => d.attempts > 0);
  }, [progress]);

  const journalDist = useMemo(() => {
    const counts: Record<string, number> = {};
    journal.forEach(j => { counts[j.emotion] = (counts[j.emotion] ?? 0) + 1; });
    return Object.entries(counts).map(([k, v]) => {
      const e = getEmotion(k as any);
      return { name: e.label, value: v, color: `hsl(var(--emo-${e.key}))` };
    });
  }, [journal]);

  /* Journal trend by week */
  const journalTrend = useMemo(() => {
    const weeks: Record<string, Record<string, number>> = {};
    journal.forEach(j => {
      const d = new Date(j.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = {};
      weeks[key][j.emotion] = (weeks[key][j.emotion] ?? 0) + 1;
    });
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, emotions]) => ({ week: week.slice(5), ...emotions }));
  }, [journal]);

  /* Camera stats */
  const cameraStats = useMemo(() => {
    if (!cameraData.length) return null;
    const total = cameraData.length;
    const matched = cameraData.filter(c => c.matched).length;
    const avgConf = cameraData.reduce((s, c) => s + (c.confidence ?? 0), 0) / total;
    const byTarget: Record<string, { total: number; matched: number }> = {};
    cameraData.forEach(c => {
      if (!byTarget[c.target_emotion]) byTarget[c.target_emotion] = { total: 0, matched: 0 };
      byTarget[c.target_emotion].total++;
      if (c.matched) byTarget[c.target_emotion].matched++;
    });
    return { total, matched, rate: Math.round((matched / total) * 100), avgConf: Math.round(avgConf * 100), byTarget };
  }, [cameraData]);

  /* ─── AI Report ─── */
  const generateReport = async () => {
    if (!user || !profile) return;
    setLoadingAI(true); setErr(null); setReport(null);
    try {
      const input: ParentReportInput = {
        childName: profile.display_name,
        stats: progress,
        journalEntries: journal,
        cameraAttempts: cameraData,
        totalStars: profile.stars,
        streak: profile.streak,
        level: profile.level,
      };
      const result = await generateParentReport(input);
      if (!result) throw new Error("Không nhận được phân tích từ AI");
      setReport(result);
    } catch (e: any) {
      setErr(e.message ?? "Lỗi khi tạo báo cáo");
    } finally { setLoadingAI(false); }
  };

  const copyReport = () => {
    if (!report) return;
    const text = formatReportText(report, profile?.display_name ?? "Bé");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ─── UI ─── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold flex items-center gap-3">
            <Icon3D name="chart" size={36} />
            Trang phụ huynh
          </h1>
          <p className="text-muted-foreground">
            Theo dõi hành trình cảm xúc của {profile?.display_name ?? "bé"} một cách nhẹ nhàng.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-card border border-border shadow-soft px-4 py-2 font-display text-sm">
          <Calendar className="w-4 h-4 text-primary" /> Toàn bộ thời gian
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="star" label="Ngôi sao" value={profile?.stars ?? 0} sub="tích luỹ" color="bg-gradient-sunshine" />
        <StatCard icon="flame" label="Chuỗi ngày" value={profile?.streak ?? 0} sub="liên tiếp" color="bg-gradient-mint" />
        <StatCard icon="trophy" label="Độ chính xác" value={`${totals.acc}%`} sub={`${totals.cor}/${totals.att} lần đúng`} color="bg-gradient-sky" />
        <StatCard icon="heart" label="Nhật ký" value={journal.length} sub="ghi chép" color="bg-gradient-bubble" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="overview" className="font-display text-xs sm:text-sm">Tổng quan</TabsTrigger>
          <TabsTrigger value="emotions" className="font-display text-xs sm:text-sm">Cảm xúc</TabsTrigger>
          <TabsTrigger value="camera" className="font-display text-xs sm:text-sm">Camera</TabsTrigger>
          <TabsTrigger value="ai-report" className="font-display text-xs sm:text-sm">Báo cáo AI</TabsTrigger>
        </TabsList>

        {/* ═══ TAB: Overview ═══ */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid lg:grid-cols-2 gap-5">
            <ChartCard title="Độ chính xác theo cảm xúc" icon={<Activity className="w-5 h-5 text-primary" />}>
              {byEmotion.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byEmotion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontFamily: 'Nunito', fontSize: 11, fontWeight: 600 }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} tick={{ fontFamily: 'Nunito', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="accuracy" name="Chính xác %" radius={[10, 10, 0, 0]}>
                      {byEmotion.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Phân bố cảm xúc nhật ký" icon={<Heart className="w-5 h-5 text-primary" />}>
              {journalDist.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={journalDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={3}>
                      {journalDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: 'Nunito' }} />
                    <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Journal trend */}
          {journalTrend.length > 1 && (
            <ChartCard title="Xu hướng cảm xúc theo tuần" icon={<TrendingUp className="w-5 h-5 text-primary" />}>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={journalTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))" }} />
                  {EMOTIONS.slice(0, 5).map(e => (
                    <Line key={e.key} type="monotone" dataKey={e.key} name={e.label} stroke={`hsl(var(--emo-${e.key}))`} strokeWidth={2} dot={false} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Nunito' }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </TabsContent>

        {/* ═══ TAB: Emotions detail ═══ */}
        <TabsContent value="emotions" className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EMOTIONS.map(e => {
              const rows = progress.filter(r => r.emotion === e.key);
              const att = rows.reduce((s, r) => s + r.attempts, 0);
              const cor = rows.reduce((s, r) => s + r.correct, 0);
              const acc = att ? Math.round((cor / att) * 100) : 0;
              const jCount = journal.filter(j => j.emotion === e.key).length;
              return (
                <div key={e.key} className="card-soft p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center p-1", e.color)}>
                      <img src={e.image} alt={e.label} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="font-display font-bold">{e.label}</p>
                      <p className="text-xs text-muted-foreground">{e.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Thử" value={att} />
                    <MiniStat label="Đúng" value={`${acc}%`} />
                    <MiniStat label="Nhật ký" value={jCount} />
                  </div>
                  {att > 0 && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${acc}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ═══ TAB: Camera ═══ */}
        <TabsContent value="camera" className="space-y-5">
          {!cameraStats ? (
            <div className="card-soft p-8 text-center">
              <CamIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-display font-bold">Chưa có dữ liệu camera</p>
              <p className="text-sm text-muted-foreground">Khi bé luyện biểu cảm qua camera, dữ liệu sẽ hiện ở đây.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="card-soft p-4 text-center">
                  <p className="font-display text-3xl font-bold">{cameraStats.total}</p>
                  <p className="text-xs text-muted-foreground">Lần thử</p>
                </div>
                <div className="card-soft p-4 text-center">
                  <p className="font-display text-3xl font-bold text-secondary">{cameraStats.rate}%</p>
                  <p className="text-xs text-muted-foreground">Tỷ lệ khớp</p>
                </div>
                <div className="card-soft p-4 text-center">
                  <p className="font-display text-3xl font-bold">{cameraStats.avgConf}%</p>
                  <p className="text-xs text-muted-foreground">Độ tin cậy TB</p>
                </div>
              </div>

              <ChartCard title="Tỷ lệ khớp theo cảm xúc" icon={<CamIcon className="w-5 h-5 text-primary" />}>
                <div className="space-y-3">
                  {Object.entries(cameraStats.byTarget).map(([emo, data]) => {
                    const e = getEmotion(emo as any);
                    const rate = data.total ? Math.round((data.matched / data.total) * 100) : 0;
                    return (
                      <div key={emo} className="flex items-center gap-3">
                        <img src={e.image} alt={e.label} className="w-8 h-8 object-contain" />
                        <span className="font-display text-sm w-20">{e.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="font-display text-xs text-muted-foreground w-16 text-right">
                          {data.matched}/{data.total} ({rate}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ChartCard>
            </>
          )}
        </TabsContent>

        {/* ═══ TAB: AI Report ═══ */}
        <TabsContent value="ai-report" className="space-y-5">
          <div className="card-3d p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-sky shadow-soft flex items-center justify-center">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Báo cáo phân tích AI</h3>
                  <p className="text-xs text-muted-foreground">
                    {isGroqAvailable() ? "Phân tích sâu bằng AI dựa trên toàn bộ dữ liệu" : "Cần cấu hình VITE_GROQ_API_KEY"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {report && (
                  <Button variant="outline" size="sm" onClick={copyReport}>
                    {copied ? <><CheckCircle2 className="w-4 h-4" /> Đã sao chép</> : <><Copy className="w-4 h-4" /> Sao chép</>}
                  </Button>
                )}
                <Button
                  variant="hero"
                  size="sm"
                  onClick={generateReport}
                  disabled={loadingAI || !isGroqAvailable() || progress.length === 0}
                >
                  {loadingAI ? <><Loader2 className="animate-spin w-4 h-4" /> Đang phân tích...</> : <><Sparkles className="w-4 h-4" /> Tạo báo cáo</>}
                </Button>
              </div>
            </div>

            {progress.length === 0 && !report && (
              <Empty msg="Khi bé luyện tập, AI sẽ phân tích xu hướng chi tiết tại đây." />
            )}
            {err && <p className="text-sm text-destructive">{err}</p>}

            {report && (
              <div className="space-y-4">
                {/* Progress badge */}
                <div className="flex items-center gap-2">
                  <ProgressBadge level={report.overallProgress} />
                </div>

                {/* Summary */}
                <div className="card-soft p-4 bg-gradient-sky">
                  <p className="font-display font-bold text-sm mb-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Tóm tắt
                  </p>
                  <p className="text-sm">{report.summary}</p>
                </div>

                {/* Strengths & Challenges */}
                <div className="grid md:grid-cols-2 gap-4">
                  <InsightList
                    title="Điểm mạnh"
                    items={report.strengths}
                    tone="ok"
                  />
                  <InsightList
                    title="Cần hỗ trợ thêm"
                    items={report.challenges}
                    tone="warn"
                  />
                </div>

                {/* Detailed analysis */}
                <div className="space-y-3">
                  <InsightCard icon={<TrendingUp />} title="Xu hướng cảm xúc" text={report.emotionTrend} />
                  <InsightCard icon={<CamIcon />} title="Phân tích camera" text={report.cameraAnalysis} />
                  <InsightCard icon={<BookOpen />} title="Nhật ký cảm xúc" text={report.journalInsight} />
                </div>

                {/* Recommendations */}
                <InsightList
                  title="Gợi ý hoạt động"
                  items={report.recommendations}
                  tone="ok"
                />

                {/* Parent tips */}
                <div className="card-soft p-4 bg-gradient-bubble">
                  <p className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Lời khuyên cho phụ huynh
                  </p>
                  <ul className="space-y-2">
                    {report.parentTips.map((tip, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next steps */}
                <div className="card-soft p-4 bg-gradient-mint">
                  <p className="font-display font-bold text-sm mb-1">Bước tiếp theo</p>
                  <p className="text-sm">{report.nextSteps}</p>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
              ⚠️ Đây là gợi ý giáo dục dựa trên dữ liệu ứng dụng — không phải chẩn đoán hay tư vấn y khoa.
              Nếu có lo ngại, hãy tham khảo ý kiến chuyên gia.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ─── Sub-components ─── */

function StatCard({ icon, label, value, sub, color }: { icon: any; label: string; value: any; sub: string; color: string }) {
  return (
    <div className="card-soft p-4 flex items-center gap-3">
      <div className={cn("w-12 h-12 rounded-2xl shadow-soft flex items-center justify-center p-1.5 shrink-0", color)}>
        <Icon3D name={icon} size={32} />
      </div>
      <div>
        <p className="font-display text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label} · {sub}</p>
      </div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card-soft p-5">
      <h3 className="font-display text-base font-bold mb-3 flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl bg-muted/50 p-2">
      <p className="font-display text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Empty({ msg }: { msg?: string }) {
  return (
    <div className="h-[180px] grid place-items-center text-muted-foreground text-sm text-center px-6">
      {msg ?? "Chưa có dữ liệu — hãy thử một bài học nhé!"}
    </div>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: "ok" | "warn" }) {
  return (
    <div className={cn("card-soft p-4", tone === "ok" ? "bg-gradient-mint" : "bg-gradient-sunshine")}>
      <p className="font-display font-bold text-sm mb-2 flex items-center gap-2">
        {tone === "ok" ? <TrendingUp className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm flex items-start gap-2">
            <span className={cn("mt-0.5", tone === "ok" ? "text-secondary-foreground" : "text-foreground/70")}>
              {tone === "ok" ? "✓" : "→"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InsightCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="card-soft p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <p className="font-display font-bold text-sm">{title}</p>
        <p className="text-sm text-foreground/80">{text}</p>
      </div>
    </div>
  );
}

function ProgressBadge({ level }: { level: ParentReport["overallProgress"] }) {
  const config = {
    excellent: { label: "Xuất sắc", color: "bg-gradient-mint", emoji: "🌟" },
    good: { label: "Tốt", color: "bg-gradient-sky", emoji: "👍" },
    developing: { label: "Đang phát triển", color: "bg-gradient-sunshine", emoji: "🌱" },
    needs_support: { label: "Cần hỗ trợ thêm", color: "bg-gradient-bubble", emoji: "💛" },
  };
  const c = config[level] ?? config.developing;
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-display text-sm font-bold shadow-soft", c.color)}>
      {c.emoji} {c.label}
    </span>
  );
}

/* ─── Helper: format report as text for copy ─── */
function formatReportText(report: ParentReport, childName: string): string {
  const lines: string[] = [
    `═══ BÁO CÁO PHÂN TÍCH CẢM XÚC ═══`,
    `Bé: ${childName}`,
    `Ngày: ${new Date().toLocaleDateString("vi-VN")}`,
    ``,
    `📋 TÓM TẮT`,
    report.summary,
    ``,
    `⭐ ĐIỂM MẠNH`,
    ...report.strengths.map(s => `  • ${s}`),
    ``,
    `⚡ CẦN HỖ TRỢ THÊM`,
    ...report.challenges.map(s => `  • ${s}`),
    ``,
    `📈 XU HƯỚNG CẢM XÚC`,
    report.emotionTrend,
    ``,
    `📷 PHÂN TÍCH CAMERA`,
    report.cameraAnalysis,
    ``,
    `📓 NHẬT KÝ CẢM XÚC`,
    report.journalInsight,
    ``,
    `💡 GỢI Ý HOẠT ĐỘNG`,
    ...report.recommendations.map(s => `  • ${s}`),
    ``,
    `👨‍👩‍👧 LỜI KHUYÊN CHO PHỤ HUYNH`,
    ...report.parentTips.map(s => `  • ${s}`),
    ``,
    `🎯 BƯỚC TIẾP THEO`,
    report.nextSteps,
    ``,
    `─────────────────────────────`,
    `⚠️ Đây là gợi ý giáo dục, không phải chẩn đoán y khoa.`,
    `Tạo bởi EmoSense AI · ${new Date().toLocaleDateString("vi-VN")}`,
  ];
  return lines.join("\n");
}

export default ParentDashboard;
