// Tiện ích giọng đọc tiếng Việt dùng chung (Web Speech API)
import { useCallback, useEffect, useRef } from "react";
import { useProfile } from "@/hooks/useProfile";

let _voicesCache: SpeechSynthesisVoice[] | null = null;
let _voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  if (_voicesCache && _voicesCache.length) return Promise.resolve(_voicesCache);
  if (_voicesPromise) return _voicesPromise;

  _voicesPromise = new Promise((resolve) => {
    const tryGet = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length) {
        _voicesCache = v;
        resolve(v);
        return true;
      }
      return false;
    };
    if (tryGet()) return;
    const handler = () => {
      if (tryGet()) {
        window.speechSynthesis.removeEventListener("voiceschanged", handler);
      }
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // Fallback timeout
    setTimeout(() => {
      if (!_voicesCache) {
        _voicesCache = window.speechSynthesis.getVoices() ?? [];
        resolve(_voicesCache);
      }
    }, 1500);
  });
  return _voicesPromise;
};

const pickVietnameseVoice = (voices: SpeechSynthesisVoice[]) => {
  if (!voices?.length) return undefined;
  return (
    voices.find((v) => v.lang?.toLowerCase() === "vi-vn") ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("vi")) ||
    undefined
  );
};

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  /** Huỷ giọng đang đọc trước khi phát */
  interrupt?: boolean;
}

export const cancelSpeech = () => {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch {}
  }
};

export const speakVi = async (text: string, opts: SpeakOptions = {}) => {
  if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const { rate = 0.95, pitch = 1, volume = 1, interrupt = true } = opts;
  if (interrupt) cancelSpeech();
  const voices = await getVoices();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "vi-VN";
  u.rate = rate;
  u.pitch = pitch;
  u.volume = volume;
  const v = pickVietnameseVoice(voices);
  if (v) u.voice = v;
  try {
    window.speechSynthesis.speak(u);
  } catch {}
};

export const vibrate = (pattern: number | number[] = 15) => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as any).vibrate(pattern);
    }
  } catch {}
};

/** Hook: tự tôn trọng cài đặt sound_on. Trả về speak/stop. */
export function useSpeak() {
  const { profile } = useProfile();
  const enabledRef = useRef<boolean>(true);
  enabledRef.current = !!profile?.sound_on;

  // Dừng đọc khi unmount để không vọng sang trang khác
  useEffect(() => () => cancelSpeech(), []);

  const speak = useCallback((text: string, opts?: SpeakOptions) => {
    if (!enabledRef.current) return;
    void speakVi(text, opts);
  }, []);

  const stop = useCallback(() => cancelSpeech(), []);

  return { speak, stop, enabled: enabledRef.current };
}
