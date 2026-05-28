/**
 * useASDPreferences — Cài đặt cá nhân hoá dành riêng cho trẻ ASD.
 *
 * Lưu localStorage để không cần migrate DB. Đồng bộ qua các tab.
 *
 * Các nhóm cài đặt:
 *  1. Sensory (giác quan) — mức kích thích, vibrate, gradient
 *  2. Pace (nhịp độ) — tốc độ đọc, thời gian chờ
 *  3. Visual (thị giác) — contrast, color theme
 *  4. Communication (giao tiếp) — giọng đọc, mức chi tiết hint
 *  5. Session (phiên học) — thời lượng, nhắc nghỉ
 */

import { useCallback, useEffect, useState } from "react";

/* ─── Types ─── */

export type SensoryLevel = "low" | "medium" | "high";
export type SpeechRate = "slow" | "normal" | "fast";
export type ContrastMode = "default" | "high";
export type HintDetail = "short" | "detailed";
export type VoiceGender = "female" | "male" | "default";

export interface ASDPreferences {
  // Sensory
  sensoryLevel: SensoryLevel;
  vibrateEnabled: boolean;
  gradientsEnabled: boolean;
  autoplaySound: boolean;

  // Pace
  speechRate: SpeechRate;
  /** Thời gian chờ thêm giữa các bước (ms). 0 = không chờ thêm. */
  extraPauseMs: number;
  /** Thời gian hold camera lâu hơn cho trẻ cần thêm thời gian (ms). */
  holdDurationMs: number;

  // Visual
  contrastMode: ContrastMode;
  /** Giảm số lượng item hiển thị cùng lúc (vd: chỉ 4 cảm xúc thay vì 7) */
  reducedChoices: boolean;

  // Communication
  voiceGender: VoiceGender;
  hintDetail: HintDetail;
  /** Hiển thị emoji trong hint hay không */
  showEmoji: boolean;

  // Session
  /** Thời lượng học tối đa mỗi phiên (phút). 0 = không giới hạn. */
  sessionLimitMin: number;
  /** Nhắc nghỉ sau bao nhiêu phút. 0 = không nhắc. */
  breakReminderMin: number;
  /** Hiển thị đồng hồ đếm ngược phiên */
  showSessionTimer: boolean;
}

/* ─── Defaults ─── */

export const DEFAULT_PREFS: ASDPreferences = {
  sensoryLevel: "medium",
  vibrateEnabled: true,
  gradientsEnabled: true,
  autoplaySound: true,

  speechRate: "normal",
  extraPauseMs: 0,
  holdDurationMs: 1200,

  contrastMode: "default",
  reducedChoices: false,

  voiceGender: "default",
  hintDetail: "short",
  showEmoji: true,

  sessionLimitMin: 0,
  breakReminderMin: 15,
  showSessionTimer: false,
};

/* ─── Storage ─── */

const STORAGE_KEY = "emosense.asd-prefs";

function loadPrefs(): ASDPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs(prefs: ASDPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("emosense:asd-prefs-change"));
  } catch { /* quota exceeded – ignore */ }
}

/* ─── Presets cho các mức sensory ─── */

export const SENSORY_PRESETS: Record<SensoryLevel, Partial<ASDPreferences>> = {
  low: {
    vibrateEnabled: false,
    gradientsEnabled: false,
    autoplaySound: false,
    speechRate: "slow",
    extraPauseMs: 800,
    holdDurationMs: 2000,
    reducedChoices: true,
    showEmoji: false,
    breakReminderMin: 10,
  },
  medium: {
    vibrateEnabled: true,
    gradientsEnabled: true,
    autoplaySound: true,
    speechRate: "normal",
    extraPauseMs: 0,
    holdDurationMs: 1200,
    reducedChoices: false,
    showEmoji: true,
    breakReminderMin: 15,
  },
  high: {
    vibrateEnabled: true,
    gradientsEnabled: true,
    autoplaySound: true,
    speechRate: "fast",
    extraPauseMs: 0,
    holdDurationMs: 800,
    reducedChoices: false,
    showEmoji: true,
    breakReminderMin: 0,
  },
};

/* ─── Hook ─── */

export function useASDPreferences() {
  const [prefs, setPrefs] = useState<ASDPreferences>(loadPrefs);

  // Sync across tabs
  useEffect(() => {
    const onChange = () => setPrefs(loadPrefs());
    window.addEventListener("emosense:asd-prefs-change", onChange);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) onChange();
    });
    return () => {
      window.removeEventListener("emosense:asd-prefs-change", onChange);
    };
  }, []);

  const updatePrefs = useCallback((patch: Partial<ASDPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  /** Áp dụng preset theo mức sensory */
  const applySensoryPreset = useCallback((level: SensoryLevel) => {
    const preset = SENSORY_PRESETS[level];
    setPrefs((prev) => {
      const next = { ...prev, ...preset, sensoryLevel: level };
      savePrefs(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    savePrefs(DEFAULT_PREFS);
    setPrefs({ ...DEFAULT_PREFS });
  }, []);

  return { prefs, updatePrefs, applySensoryPreset, resetToDefaults };
}

/* ─── Helper: speech rate number ─── */
export function getSpeechRateValue(rate: SpeechRate): number {
  switch (rate) {
    case "slow": return 0.75;
    case "fast": return 1.15;
    default: return 0.95;
  }
}
