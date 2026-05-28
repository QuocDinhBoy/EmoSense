/**
 * Groq AI — Tạo báo cáo phân tích chi tiết cho phụ huynh.
 *
 * Gọi Groq API trực tiếp từ client (dùng VITE_GROQ_API_KEY).
 * Trả về báo cáo dạng structured JSON.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ParentReportInput {
  childName: string;
  stats: {
    activity: string;
    emotion: string;
    attempts: number;
    correct: number;
    last_at: string;
  }[];
  journalEntries: { emotion: string; created_at: string; note?: string | null }[];
  cameraAttempts: {
    target_emotion: string;
    detected_emotion: string | null;
    confidence: number | null;
    matched: boolean;
    created_at: string;
  }[];
  totalStars: number;
  streak: number;
  level: number;
}

export interface ParentReport {
  summary: string;
  strengths: string[];
  challenges: string[];
  emotionTrend: string;
  cameraAnalysis: string;
  journalInsight: string;
  recommendations: string[];
  parentTips: string[];
  nextSteps: string;
  overallProgress: "excellent" | "good" | "developing" | "needs_support";
}

const buildPrompt = (input: ParentReportInput): string => {
  const statsStr = input.stats
    .map((s) => `${s.activity}/${s.emotion}: ${s.correct}/${s.attempts} đúng, lần cuối ${s.last_at}`)
    .join("\n");

  const journalStr = input.journalEntries
    .slice(0, 20)
    .map((j) => `${j.created_at.slice(0, 10)}: ${j.emotion}${j.note ? ` — "${j.note}"` : ""}`)
    .join("\n");

  const cameraStr = input.cameraAttempts
    .slice(0, 20)
    .map((c) => `Mục tiêu: ${c.target_emotion}, Phát hiện: ${c.detected_emotion ?? "?"}, Khớp: ${c.matched}, Tin cậy: ${((c.confidence ?? 0) * 100).toFixed(0)}%`)
    .join("\n");

  return `Bạn là chuyên gia tâm lý giáo dục trẻ em, đặc biệt trẻ rối loạn phổ tự kỷ (ASD).
Hãy phân tích dữ liệu học tập cảm xúc của bé "${input.childName}" và tạo báo cáo CHI TIẾT cho phụ huynh.

DỮ LIỆU:
- Ngôi sao: ${input.totalStars}, Chuỗi ngày: ${input.streak}, Cấp độ: ${input.level}
- Tiến trình hoạt động:
${statsStr || "(chưa có)"}

- Nhật ký cảm xúc gần đây:
${journalStr || "(chưa có)"}

- Luyện camera (biểu cảm khuôn mặt):
${cameraStr || "(chưa có)"}

TRẢ VỀ JSON theo schema sau (tiếng Việt, ấm áp, không phán xét):
{
  "summary": "Tóm tắt 2-3 câu về tình hình chung",
  "strengths": ["Điểm mạnh 1", "Điểm mạnh 2", ...],
  "challenges": ["Thách thức 1 (nhẹ nhàng, không tiêu cực)", ...],
  "emotionTrend": "Phân tích xu hướng cảm xúc qua nhật ký",
  "cameraAnalysis": "Phân tích khả năng thể hiện biểu cảm qua camera",
  "journalInsight": "Nhận xét về thói quen ghi nhật ký và cảm xúc chủ đạo",
  "recommendations": ["Gợi ý hoạt động cụ thể 1", "Gợi ý 2", ...],
  "parentTips": ["Lời khuyên cho phụ huynh 1", "Lời khuyên 2", ...],
  "nextSteps": "Bước tiếp theo nên làm",
  "overallProgress": "excellent|good|developing|needs_support"
}

QUY TẮC:
- Dùng ngôn ngữ tích cực, ấm áp, tôn trọng.
- Không chẩn đoán y khoa. Ghi rõ đây là gợi ý giáo dục.
- Nếu dữ liệu ít, vẫn đưa ra nhận xét dựa trên những gì có.
- Mỗi mục strengths/challenges/recommendations/parentTips có 2-4 items.
- CHỈ trả JSON, không markdown, không giải thích thêm.`;
};

export async function generateParentReport(
  input: ParentReportInput,
  signal?: AbortSignal,
): Promise<ParentReport | null> {
  const key = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!key) return null;
  const model = (import.meta.env.VITE_GROQ_MODEL as string | undefined) ?? "llama-3.1-8b-instant";

  try {
    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Bạn là chuyên gia tâm lý giáo dục trẻ ASD. Luôn trả lời JSON tiếng Việt, ấm áp, chuyên nghiệp.",
          },
          { role: "user", content: buildPrompt(input) },
        ],
      }),
    });

    if (!r.ok) return null;
    const j = await r.json();
    const raw: string = j?.choices?.[0]?.message?.content ?? "";
    let parsed: ParentReport | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }
    if (!parsed?.summary) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isGroqAvailable(): boolean {
  return !!import.meta.env.VITE_GROQ_API_KEY;
}
