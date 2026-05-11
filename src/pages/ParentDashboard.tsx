import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Lightbulb, TrendingUp, Calendar, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { EMOTIONS, getEmotion } from "@/data/emotions";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface ProgressRow { activity: string; emotion: string; attempts: number; correct: number; last_at: string; }
interface JournalRow { emotion: string; created_at: string; }

const ParentDashboard = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [journal, setJournal] = useState<JournalRow[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: j }] = await Promise.all([
        supabase.from("progress").select("*").eq("user_id", user.id),
        supabase.from("journal_entries").select("emotion, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
      ]);
      setProgress((p as any) ?? []);
      setJournal((j as any) ?? []);
    })();
  }, [user]);

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
      return { name: e.label, attempts: att, accuracy: att ? Math.round((cor / att) * 100) : 0, color: `hsl(var(--emo-${e.key}))` };
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

  const askAI = async () => {
    setLoadingAI(true); setErr(null); setInsights(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { stats: progress, childName: profile?.display_name, language: "vi" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data);
    } catch (e: any) {
      setErr(e.message ?? "Không lấy được phân tích");
    } finally { setLoadingAI(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Trang phụ huynh</h1>
          <p className="text-muted-foreground">Cùng nhìn lại hành trình của {profile?.display_name ?? "bé nhà bạn"} một cách nhẹ nhàng.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-2xl bg-card border border-border shadow-soft px-4 py-2 font-display">
          <Calendar className="w-5 h-5 text-primary" /> Toàn bộ thời gian
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        <Stat label="Ngôi sao đạt được" value={profile?.stars ?? 0} sub="qua các hoạt động" />
        <Stat label="Hoạt động đã làm" value={totals.att} sub={`${totals.cor} lần đúng`} />
        <Stat label="Độ chính xác" value={`${totals.acc}%`} sub={<span className="inline-flex items-center gap-1 text-emo-calm"><TrendingUp className="w-4 h-4" /> đang tiến bộ</span>} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Độ chính xác theo cảm xúc">
          {byEmotion.length === 0 ? <Empty msg="Chưa có dữ liệu — hãy thử một bài học nhé!" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byEmotion}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="accuracy" radius={[12, 12, 0, 0]}>
                  {byEmotion.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Cảm xúc trong nhật ký">
          {journalDist.length === 0 ? <Empty msg="Chưa có ghi chép nhật ký nào." /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={journalDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {journalDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid hsl(var(--border))" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="card-soft p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-display text-xl font-bold flex items-center gap-2"><Lightbulb className="text-primary" /> Phân tích bằng AI</h3>
            <Button variant="hero" size="sm" onClick={askAI} disabled={loadingAI || progress.length === 0}>
              {loadingAI ? <><Loader2 className="animate-spin" /> Đang phân tích...</> : <><Sparkles /> Tạo phân tích</>}
            </Button>
          </div>
          {progress.length === 0 && <Empty msg="Khi bé luyện tập một chút, AI sẽ tóm tắt xu hướng tại đây." />}
          {err && <p className="text-sm text-destructive">{err}</p>}
          {insights && (
            <ul className="space-y-3">
              <Insight tone="ok" title="Điểm mạnh" text={insights.strength} />
              <Insight tone="warn" title="Cần luyện thêm" text={insights.practice} />
              <Insight tone="ok" title="Bước tiếp theo" text={insights.next_step} />
              {insights.next_activity && (
                <Button asChild variant="soft"><Link to={`/app/${insights.next_activity}`}>Mở hoạt động được gợi ý</Link></Button>
              )}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">Chỉ là gợi ý giáo dục — không phải tư vấn y khoa.</p>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, sub }: any) => (
  <div className="card-soft p-5">
    <p className="text-muted-foreground font-display text-sm">{label}</p>
    <p className="font-display text-4xl font-bold mt-1">{value}</p>
    <p className="text-sm mt-1">{sub}</p>
  </div>
);
const ChartCard = ({ title, children }: any) => (
  <div className="card-soft p-5">
    <h3 className="font-display text-lg font-bold mb-3">{title}</h3>
    {children}
  </div>
);
const Empty = ({ msg }: { msg: string }) => (
  <div className="h-[200px] grid place-items-center text-muted-foreground text-sm text-center px-6">{msg}</div>
);
const Insight = ({ tone, title, text }: { tone: "ok" | "warn"; title: string; text: string }) => (
  <li className={`rounded-2xl p-3 flex items-start gap-3 ${tone === "warn" ? "bg-gradient-sunshine" : "bg-gradient-mint"}`}>
    {tone === "warn" ? <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" /> : <TrendingUp className="w-5 h-5 mt-0.5 shrink-0" />}
    <div><p className="font-display font-bold">{title}</p><p className="text-sm">{text}</p></div>
  </li>
);

export default ParentDashboard;
