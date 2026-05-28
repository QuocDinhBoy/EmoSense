import { useEffect, useState } from "react";
import { EMOTIONS, type EmotionKey, getEmotion } from "@/data/emotions";
import { EmotionBubble } from "@/components/EmotionBubble";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { Volume2, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSpeak, vibrate } from "@/lib/speech";
import { notify } from "@/lib/notify";
import { useSearchParams } from "react-router-dom";
import { getLessonById } from "@/data/lessons";
import { bumpLesson } from "@/lib/lessonProgress";

interface Entry { id: string; emotion: EmotionKey; note: string | null; created_at: string; }

const MAX_NOTE = 300;

const Journal = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const lesson = (() => {
    const id = params.get("lesson");
    return id ? getLessonById(id) : undefined;
  })();
  const [pick, setPick] = useState<EmotionKey | null>(null);
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const { speak } = useSpeak();

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setEntries((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const choose = (k: EmotionKey) => {
    setPick(k);
    speak(getEmotion(k).label);
  };

  const save = async () => {
    if (!pick || !user) return;
    const { error } = await supabase.from("journal_entries").insert({ user_id: user.id, emotion: pick, note: note.trim() || null });
    if (error) return notify.error("Chưa lưu được. Thử lại nhé.");
    vibrate(15);
    if (lesson) bumpLesson(lesson.id, lesson.threshold, true);
    setPick(null); setNote("");
    notify.success("Đã lưu! Cảm ơn bạn đã chia sẻ 💛");
    speak("Đã lưu. Cảm ơn bạn đã chia sẻ");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("journal_entries").delete().eq("id", id);
    if (error) return notify.error("Xóa không thành công");
    notify.success("Đã xóa");
    load();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card-3d p-6 md:p-8 grid md:grid-cols-[auto_1fr_auto] gap-6 items-center bg-gradient-sky">
        <Mascot size={120} />
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Hôm nay bạn cảm thấy thế nào?</h1>
          <p className="text-muted-foreground">Không có câu trả lời nào sai cả.</p>
        </div>
        <button
          type="button"
          onClick={() => speak("Hôm nay bạn cảm thấy thế nào?")}
          aria-label="Nghe đọc câu hỏi"
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-card shadow-soft border border-border hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
        >
          <Volume2 className="w-5 h-5 text-primary" />
        </button>
      </div>

      <div className="card-soft p-6 space-y-5">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {EMOTIONS.map(e => (
            <EmotionBubble key={e.key} emotion={e} size="sm" selected={pick === e.key} onClick={() => choose(e.key)} speakOnClick={false} />
          ))}
        </div>
        <div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE))}
            placeholder="Muốn ghi thêm vài dòng không? (không bắt buộc)"
            maxLength={MAX_NOTE}
            className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 font-body text-base shadow-soft focus:outline-none focus:ring-4 focus:ring-primary/30 min-h-24"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{note.length}/{MAX_NOTE}</p>
        </div>
        <Button variant="hero" size="lg" disabled={!pick} onClick={save}>Lưu cảm xúc của tôi</Button>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold mb-3">Cảm xúc gần đây</h2>
        {loading ? (
          <ul className="grid sm:grid-cols-2 gap-3" aria-busy>
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="card-soft p-4 flex items-center gap-4 animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
              </li>
            ))}
          </ul>
        ) : entries.length === 0 ? (
          <div className="card-soft p-8 flex flex-col items-center text-center gap-3">
            <Mascot size={100} message="Cùng bắt đầu bằng một cảm xúc ở trên nhé!" />
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {entries.map(e => {
              const em = getEmotion(e.emotion);
              return (
                <li key={e.id} className="card-soft p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-card shadow-soft flex items-center justify-center p-1 shrink-0">
                    <img src={em.image} alt={em.label} loading="lazy" width={64} height={64} className="w-full h-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold">{em.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("vi-VN")}</p>
                    {e.note && <p className="text-sm text-foreground/80 truncate">{e.note}</p>}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        aria-label="Xóa ghi chép"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Xóa ghi chép này?</AlertDialogTitle>
                        <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(e.id)}>Xóa</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Journal;
