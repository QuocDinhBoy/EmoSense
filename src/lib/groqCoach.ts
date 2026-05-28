/**
 * Groq Coach – gọi Groq API trực tiếp từ client để sinh hint
 * dạy biểu cảm cho trẻ.
 *
 * ⚠️ BẢO MẬT: VITE_GROQ_API_KEY sẽ lộ trong bundle frontend.
 * Phù hợp cho demo/dev. Khi deploy production nên proxy qua
 * server (hoặc Edge Function `ai-coach` đã có sẵn) để giấu key.
 *
 * Cấu hình trong `.env`:
 *   VITE_GROQ_API_KEY=gsk_xxx
 *   VITE_GROQ_MODEL=llama-3.1-8b-instant   (tuỳ chọn)
 */

import type { AppEmotion } from "./faceDetect";
import type { CoachHint, CoachTone } from "./coachHints";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const LABEL: Record<AppEmotion, string> = {
  happy: "Vui",
  sad: "Buồn",
  angry: "Giận",
  scared: "Sợ",
  surprised: "Ngạc nhiên",
  calm: "Bình yên",
};

export interface GroqHintRequest {
  target: AppEmotion;
  detected: AppEmotion;
  scores: Record<AppEmotion, number>;
  childName?: string;
  attempts: number;
  recent: string[];
  /** AbortSignal để huỷ request khi unmount/đổi mục tiêu */
  signal?: AbortSignal;
}

export const isGroqConfigured = () =>
  !!import.meta.env.VITE_GROQ_API_KEY;

const buildPrompt = (req: GroqHintRequest) => {
  const name = req.childName ? `, gọi bé là ${req.childName}` : "";
  const recent = req.recent.slice(0, 4).join(" | ") || "(chưa có)";
  // Làm gọn scores cho prompt – chỉ giữ 2 chữ số sau dấu phẩy
  const scores = Object.fromEntries(
    (Object.keys(req.scores) as AppEmotion[]).map((k) => [
      LABEL[k],
      Number((req.scores[k] ?? 0).toFixed(2)),
    ]),
  );
  return `Bạn là Lumi – trợ lý cảm xúc dịu dàng cho trẻ em (đặc biệt trẻ tự kỷ, 5–10 tuổi)${name}.

Trẻ đang cố thể hiện cảm xúc "${LABEL[req.target]}" trên khuôn mặt qua camera.
AI nhận diện đang thấy: "${LABEL[req.detected]}".
Điểm các cảm xúc (0..1): ${JSON.stringify(scores)}.
Đã thử ${req.attempts} lần. Hint gần đây tránh lặp: ${recent}.

Hãy phân tích vì sao biểu cảm chưa đúng và đưa MỘT câu gợi ý NGẮN, cụ thể, ấm áp.

QUY TẮC:
- Trả lời DUY NHẤT 1 câu tiếng Việt, 8–22 từ.
- Hướng dẫn cụ thể bộ phận khuôn mặt (mắt, lông mày, miệng, má).
- Tránh từ tiêu cực ("sai", "chưa đúng"). Dùng "thử", "có thể", "nhẹ nhàng".
- Không lặp lại y nguyên các hint gần đây.
- Trả về JSON dạng: {"message": "...", "tone": "adjust"}
- KHÔNG markdown, KHÔNG giải thích thêm.`;
};

export async function fetchGroqHint(
  req: GroqHintRequest,
): Promise<CoachHint | null> {
  const key = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!key) return null;
  const model =
    (import.meta.env.VITE_GROQ_MODEL as string | undefined) ??
    "llama-3.1-8b-instant";

  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: req.signal,
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Bạn là Lumi, trợ lý cảm xúc cho trẻ em. Luôn trả lời JSON tiếng Việt, ngắn gọn, dịu dàng.",
          },
          { role: "user", content: buildPrompt(req) },
        ],
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    const raw: string = j?.choices?.[0]?.message?.content ?? "";
    let parsed: { message?: string; tone?: CoachTone } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          /* ignore */
        }
      }
    }
    const message = parsed?.message?.trim();
    if (!message) return null;
    const tone: CoachTone =
      parsed?.tone === "encourage" || parsed?.tone === "celebrate"
        ? parsed.tone
        : "adjust";
    return { message, tone };
  } catch {
    return null;
  }
}
