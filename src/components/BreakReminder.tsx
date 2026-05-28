/**
 * BreakReminder — Nhắc bé nghỉ ngơi sau một khoảng thời gian.
 * Hiển thị overlay dịu dàng với animation thở, không ép buộc.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mascot } from "./Mascot";
import { useASDPreferences } from "@/hooks/useASDPreferences";
import { useSpeak } from "@/lib/speech";

export const BreakReminder = () => {
  const { prefs } = useASDPreferences();
  const { speak } = useSpeak();
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    // Reset timer khi preference thay đổi
    startRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);

    if (prefs.breakReminderMin <= 0) return;

    const ms = prefs.breakReminderMin * 60 * 1000;
    timerRef.current = setTimeout(() => {
      setShow(true);
      speak("Bạn đã học được một lúc rồi. Nghỉ ngơi một chút nhé!");
    }, ms);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [prefs.breakReminderMin, speak]);

  const dismiss = () => {
    setShow(false);
    // Reset timer cho lần nhắc tiếp
    startRef.current = Date.now();
    if (prefs.breakReminderMin > 0) {
      const ms = prefs.breakReminderMin * 60 * 1000;
      timerRef.current = setTimeout(() => {
        setShow(true);
        speak("Nghỉ ngơi một chút nhé!");
      }, ms);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Nhắc nghỉ ngơi"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="card-3d p-8 max-w-sm w-full text-center space-y-5 bg-gradient-sky"
          >
            <Mascot size={120} message="Nghỉ ngơi một chút nhé!" />

            {/* Breathing circle */}
            <div className="flex justify-center">
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-mint shadow-soft"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div>
              <h2 className="font-display text-xl font-bold">
                Bạn đã học {prefs.breakReminderMin} phút rồi!
              </h2>
              <p className="text-foreground/70 text-sm mt-1">
                Hít thở sâu, uống nước, hoặc đi lại một chút. Khi sẵn sàng thì quay lại nhé.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="hero" size="lg" onClick={dismiss}>
                Mình sẵn sàng rồi!
              </Button>
              <Button variant="soft" size="sm" onClick={dismiss}>
                Bỏ qua
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
