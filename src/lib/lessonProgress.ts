/**
 * Theo dõi tiến trình theo từng lesson trong lộ trình học.
 *
 * Lý do dùng localStorage thay vì Supabase ở đây: bảng `progress`
 * hiện tại track theo (activity, emotion) — không đủ chi tiết để biết
 * lesson nào đã hoàn tất. Thay vì migrate DB, ta lưu local + đồng bộ
 * dấu hoàn thành (chỉ counter nhẹ) để map vẫn cập nhật theo thời gian thực.
 */

const KEY_PREFIX = "emosense.lesson.";

interface LessonState {
  /** Số lần làm đúng tích luỹ */
  correct: number;
  /** Đã đạt threshold ít nhất 1 lần */
  done: boolean;
  /** Thời điểm cập nhật cuối */
  updatedAt: string;
}

const empty: LessonState = { correct: 0, done: false, updatedAt: "" };

const safeGet = (k: string): LessonState => {
  if (typeof window === "undefined") return { ...empty };
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return { ...empty };
    return { ...empty, ...JSON.parse(raw) } as LessonState;
  } catch {
    return { ...empty };
  }
};

const safeSet = (k: string, v: LessonState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(k, JSON.stringify(v));
    // Phát event để các tab/trang khác cập nhật
    window.dispatchEvent(new CustomEvent("emosense:lesson-progress", { detail: { key: k } }));
  } catch {}
};

export function getLessonState(lessonId: string): LessonState {
  return safeGet(KEY_PREFIX + lessonId);
}

export function bumpLesson(lessonId: string, threshold: number, correct = true) {
  const k = KEY_PREFIX + lessonId;
  const cur = safeGet(k);
  const next: LessonState = {
    correct: cur.correct + (correct ? 1 : 0),
    done: cur.done || cur.correct + (correct ? 1 : 0) >= threshold,
    updatedAt: new Date().toISOString(),
  };
  safeSet(k, next);
  return next;
}

export function markLessonDone(lessonId: string) {
  const k = KEY_PREFIX + lessonId;
  const cur = safeGet(k);
  const next: LessonState = { ...cur, done: true, updatedAt: new Date().toISOString() };
  safeSet(k, next);
  return next;
}

export function resetAll() {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter(k => k.startsWith(KEY_PREFIX))
    .forEach(k => window.localStorage.removeItem(k));
  window.dispatchEvent(new CustomEvent("emosense:lesson-progress", { detail: { reset: true } }));
}

/** Hook đơn giản – re-render khi có thay đổi tiến trình lesson */
import { useEffect, useState } from "react";

export function useLessonProgressTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener("emosense:lesson-progress", onChange as any);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("emosense:lesson-progress", onChange as any);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return tick;
}
