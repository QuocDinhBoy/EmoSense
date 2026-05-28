import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/Mascot";
import { Send, Loader2, Trash2, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSpeak } from "@/lib/speech";
import { sendChatMessage, isGroqChatAvailable, type ChatMessage } from "@/lib/groqChat";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Hôm nay mình buồn quá",
  "Tại sao mình hay giận?",
  "Kể cho mình một câu chuyện",
  "Mình sợ đi học",
  "Làm sao để bình tĩnh?",
  "Mình vui lắm!",
];

const ChatLumi = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { speak } = useSpeak();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const available = isGroqChatAvailable();

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
        const assistantMsg: ChatMessage = { role: "assistant", content: reply };
        setMessages([...updated, assistantMsg]);
        speak(reply);
      } else {
        setMessages([...updated, { role: "assistant", content: "Mình chưa trả lời được. Thử lại nhé 💛" }]);
      }
    } catch {
      setMessages([...updated, { role: "assistant", content: "Có lỗi xảy ra. Thử lại sau nhé 💛" }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clear = () => {
    setMessages([]);
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!available) {
    return (
      <div className="max-w-2xl mx-auto card-soft p-8 text-center space-y-4">
        <Mascot size={140} message="Mình cần được kết nối AI để trò chuyện." />
        <p className="text-muted-foreground">
          Hãy thêm <code className="bg-muted px-2 py-0.5 rounded">VITE_GROQ_API_KEY</code> vào file .env để bật tính năng này.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Mascot size={48} float={false} />
          <div>
            <h1 className="font-display text-2xl font-bold">Hỏi Lumi</h1>
            <p className="text-xs text-muted-foreground">Trò chuyện về cảm xúc cùng Lumi</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={clear}>
            <Trash2 className="w-4 h-4" /> Xoá
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-3xl bg-card border border-border shadow-soft p-4 space-y-3 no-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
            <Mascot size={120} message="Chào bạn! Mình là Lumi. Bạn muốn nói gì với mình nào?" />
            <div className="grid grid-cols-2 gap-2 max-w-sm w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-2xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-display text-left hover:bg-muted hover:shadow-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-2",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-sky flex items-center justify-center shrink-0 mt-1">
                  <span className="text-sm">☁️</span>
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md",
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => speak(msg.content)}
                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary"
                    aria-label="Nghe đọc"
                  >
                    <Volume2 className="w-3 h-3" /> Nghe
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-sky flex items-center justify-center shrink-0">
              <span className="text-sm">☁️</span>
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 200))}
          onKeyDown={handleKey}
          placeholder="Nhắn gì cho Lumi..."
          maxLength={200}
          rows={1}
          className="flex-1 rounded-2xl border-2 border-border bg-card px-4 py-3 font-body text-sm shadow-soft resize-none focus:outline-none focus:ring-4 focus:ring-primary/30 min-h-[48px] max-h-[96px]"
        />
        <Button
          variant="hero"
          size="icon"
          onClick={() => send()}
          disabled={!input.trim() || loading}
          aria-label="Gửi"
          className="w-12 h-12 rounded-2xl shrink-0"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Lumi là bạn đồng hành cảm xúc — không phải chuyên gia tâm lý.
      </p>
    </div>
  );
};

export default ChatLumi;
