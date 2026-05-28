/**
 * LumiChat — Floating chat bubble ở góc dưới.
 * Click vào Lumi → mở khung chat nhỏ. Không cần trang riêng.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, X, Loader2, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { useSpeak } from "@/lib/speech";
import { sendChatMessage, isGroqChatAvailable, type ChatMessage } from "@/lib/groqChat";
import { cn } from "@/lib/utils";
import mascotImg from "@/assets/mascot.png";

const SUGGESTIONS = [
  "Mình buồn quá",
  "Tại sao mình hay giận?",
  "Làm sao để bình tĩnh?",
  "Kể chuyện cho mình",
];

export const LumiChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { profile } = useProfile();
  const { speak } = useSpeak();

  const available = isGroqChatAvailable();

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: msg };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    try {
      const reply = await sendChatMessage(updated, profile?.display_name);
      if (reply) {
        setMessages([...updated, { role: "assistant", content: reply }]);
        speak(reply);
      } else {
        setMessages([...updated, { role: "assistant", content: "Mình chưa trả lời được. Thử lại nhé 💛" }]);
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "Có lỗi xảy ra 💛" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); send(); }
  };

  if (!available) return null;

  return (
    <>
      {/* Floating bubble */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Mở chat với Lumi"
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-card shadow-float border-2 border-primary/30 flex items-center justify-center hover:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            <img src={mascotImg} alt="Lumi" className="w-10 h-10 object-contain" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-[340px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[calc(100vh-8rem)] rounded-3xl bg-card border border-border shadow-float flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-gradient-sky shrink-0">
              <img src={mascotImg} alt="" className="w-8 h-8 object-contain" />
              <div className="flex-1">
                <p className="font-display font-bold text-sm">Hỏi Lumi</p>
                <p className="text-[10px] text-muted-foreground">Bạn đồng hành cảm xúc</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-muted-foreground">Chào bạn! Mình là Lumi ☁️</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SUGGESTIONS.map(s => (
                      <button key={s} type="button" onClick={() => send(s)} className="rounded-xl border border-border bg-muted/50 px-2 py-1.5 text-xs font-display text-left hover:bg-muted transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-1.5", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && <span className="text-sm mt-1">☁️</span>}
                  <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-xs", msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm")}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.role === "assistant" && (
                      <button type="button" onClick={() => speak(msg.content)} className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-primary">
                        <Volume2 className="w-2.5 h-2.5" /> Nghe
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-1.5">
                  <span className="text-sm">☁️</span>
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2 p-3 border-t border-border shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value.slice(0, 200))}
                onKeyDown={handleKey}
                placeholder="Nhắn cho Lumi..."
                maxLength={200}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button variant="hero" size="icon" onClick={() => send()} disabled={!input.trim() || loading} className="w-9 h-9 rounded-xl shrink-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
