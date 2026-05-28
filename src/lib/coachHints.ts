/**
 * Coach Hints – Tạo gợi ý hướng dẫn dịu dàng cho trẻ khi luyện cảm xúc qua camera.
 *
 * 2 tầng:
 *  1. Heuristic local (ngay lập tức, không cần mạng) – so sánh score giữa
 *     cảm xúc đích và cảm xúc detect được, gợi ý cụ thể bộ phận khuôn mặt.
 *  2. AI hint qua Edge Function `ai-coach` (tuỳ chọn) – gợi ý mềm mại hơn,
 *     có thể cá nhân hoá theo tên bé.
 */

import type { AppEmotion } from "./faceDetect";
import { supabase } from "@/integrations/supabase/client";

export type CoachTone = "encourage" | "adjust" | "celebrate";

export interface CoachHint {
  /** Câu nói cho mascot/đọc loa (ngắn, tiếng Việt, dễ hiểu). */
  message: string;
  /** Tone của hint – để tô màu UI. */
  tone: CoachTone;
}

/**
 * Mô tả điểm mặt then chốt cho từng cảm xúc – dùng để gợi ý điều chỉnh.
 */
const FACE_TIPS: Record<AppEmotion, string[]> = {
  happy: [
    "Cười rộng hơn một chút nhé",
    "Nhếch khóe miệng lên trên",
    "Để mắt hơi nheo lại như khi bạn thật vui",
  ],
  sad: [
    "Khóe miệng cong xuống nhẹ thôi",
    "Mắt rũ xuống một chút",
    "Lông mày kéo vào giữa và hơi xuống",
  ],
  angry: [
    "Chau lông mày lại một chút",
    "Mím môi nhẹ thôi nhé",
    "Mắt nhìn thẳng và cương quyết",
  ],
  scared: [
    "Mở mắt to hơn nào",
    "Lông mày nhướn cao lên",
    "Miệng hơi mở ra một chút",
  ],
  surprised: [
    "Nhướn lông mày thật cao",
    "Mở mắt to lên",
    "Miệng há tròn chữ O",
  ],
  calm: [
    "Thả lỏng khuôn mặt nhé",
    "Hơi cười nhẹ thôi, dịu thôi",
    "Hít thở nhẹ và để cơ mặt nghỉ",
  ],
};

const EMOTION_LABEL_VI: Record<AppEmotion, string> = {
  happy: "Vui",
  sad: "Buồn",
  angry: "Giận",
  scared: "Sợ",
  surprised: "Ngạc nhiên",
  calm: "Bình yên",
};

const ENCOURAGE_GENERIC = [
  "Cố lên nào, mình đang theo dõi đây",
  "Bạn làm tốt lắm, tiếp tục nhé",
  "Sắp được rồi, giữ nguyên gương mặt",
];

/**
 * Sinh hint heuristic ngay lập tức, không cần mạng.
 *
 * Logic:
 *  - score đích < 0.15: gần như chưa thể hiện → đưa tip cụ thể bộ phận
 *  - score đích < 0.45: đang đúng hướng → khích lệ "rõ hơn chút"
 *  - score đích < threshold: gần đạt → "giữ nguyên"
 *  - score đích ≥ threshold: celebrate
 *  - nếu cảm xúc khác đang thắng (gap đáng kể), nhắc nhẹ "đừng để bị nhầm"
 */
export function buildLocalHint(
  target: AppEmotion,
  scores: Record<AppEmotion, number>,
  topEmotion: AppEmotion,
  threshold: number,
  /** Counter để xoay vòng tip, tránh lặp. */
  rotation: number,
): CoachHint {
  const targetScore = scores[target] ?? 0;
  const topScore = scores[topEmotion] ?? 0;

  if (targetScore >= threshold) {
    return {
      message: `Tuyệt vời! Đó đúng là ${EMOTION_LABEL_VI[target]}.`,
      tone: "celebrate",
    };
  }

  // Đang bị "nhầm" sang cảm xúc khác rõ rệt
  if (topEmotion !== target && topScore - targetScore > 0.3) {
    const tip = FACE_TIPS[target][rotation % FACE_TIPS[target].length];
    return {
      message: `Mình đang thấy ${EMOTION_LABEL_VI[topEmotion].toLowerCase()}. ${tip}.`,
      tone: "adjust",
    };
  }

  if (targetScore < 0.15) {
    const tip = FACE_TIPS[target][rotation % FACE_TIPS[target].length];
    return { message: tip + " nhé", tone: "adjust" };
  }

  if (targetScore < 0.45) {
    const tip = FACE_TIPS[target][(rotation + 1) % FACE_TIPS[target].length];
    return { message: `Đúng hướng rồi. ${tip} cho rõ hơn.`, tone: "adjust" };
  }

  // Sắp đạt
  const enc = ENCOURAGE_GENERIC[rotation % ENCOURAGE_GENERIC.length];
  return { message: `${enc}!`, tone: "encourage" };
}

/* ------------------------------------------------------------------ */
/* AI Coach (qua Edge Function ai-coach – tuỳ chọn)                    */
/* ------------------------------------------------------------------ */

export interface AICoachRequest {
  target: AppEmotion;
  detected: AppEmotion;
  scores: Record<AppEmotion, number>;
  childName?: string;
  /** Số lần đã thử cho mục tiêu này, để AI có context. */
  attempts: number;
  /** Lịch sử hint gần đây để tránh lặp. */
  recent: string[];
}

export interface AICoachResponse {
  message: string;
  tone?: CoachTone;
}

/**
 * Gọi Edge Function `ai-coach`. Trả null nếu function chưa deploy hoặc lỗi.
 * Caller sẽ fallback về heuristic local.
 */
export async function fetchAIHint(req: AICoachRequest): Promise<CoachHint | null> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-coach", {
      body: req,
    });
    if (error) return null;
    const r = data as AICoachResponse | undefined;
    if (!r?.message) return null;
    return { message: r.message, tone: r.tone ?? "adjust" };
  } catch {
    return null;
  }
}

export const emotionLabelVi = (k: AppEmotion) => EMOTION_LABEL_VI[k];
