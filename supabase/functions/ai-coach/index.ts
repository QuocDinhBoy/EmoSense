// Supabase Edge Function: ai-coach
//
// Trả về một câu gợi ý ngắn (tiếng Việt, dịu dàng, dành cho trẻ tự kỷ)
// để giúp trẻ điều chỉnh biểu cảm khuôn mặt sao cho khớp với cảm xúc đích.
//
// Triển khai:
//   supabase functions deploy ai-coach
//
// ENV cần thiết (bí mật trong Supabase):
//   OPENAI_API_KEY hoặc LOVABLE_API_KEY
//   AI_MODEL (mặc định: gpt-4o-mini)
//   AI_BASE_URL (mặc định: https://api.openai.com/v1)
//
// Nếu không có key – function fallback về một câu gợi ý ngẫu nhiên có
// nội dung dựa trên `target` và `detected`. Frontend cũng có heuristic
// local nên hệ thống luôn hoạt động kể cả khi function offline.

// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppEmotion =
  | "happy"
  | "sad"
  | "angry"
  | "scared"
  | "surprised"
  | "calm";

interface Body {
  target: AppEmotion;
  detected: AppEmotion;
  scores: Record<AppEmotion, number>;
  childName?: string;
  attempts?: number;
  recent?: string[];
}

const LABEL: Record<AppEmotion, string> = {
  happy: "Vui",
  sad: "Buồn",
  angry: "Giận",
  scared: "Sợ",
  surprised: "Ngạc nhiên",
  calm: "Bình yên",
};

const FALLBACK: Record<AppEmotion, string[]> = {
  happy: [
    "Cười rộng hơn nhé, để khoé miệng cong lên cao một chút",
    "Hãy nghĩ đến điều bạn thích nhất, nụ cười sẽ tự nhiên hơn",
  ],
  sad: [
    "Khóe miệng xuống nhẹ, hãy thả lỏng và buông vai",
    "Mắt rũ xuống một chút như khi bạn nhớ ai đó",
  ],
  angry: [
    "Chau lông mày lại, mím môi nhẹ thôi",
    "Hít một hơi sâu rồi nhăn mặt nhẹ nhàng",
  ],
  scared: [
    "Mở mắt to, nhướn lông mày lên cao",
    "Miệng hơi mở, vai có thể co lại một chút",
  ],
  surprised: [
    "Nhướn lông mày thật cao, miệng há tròn chữ O",
    "Mở mắt to lên như đang thấy điều bất ngờ",
  ],
  calm: [
    "Thả lỏng cả khuôn mặt, hơi cười nhẹ thôi",
    "Hít vào thở ra, để cơ mặt nghỉ ngơi",
  ],
};

const fallback = (b: Body) => {
  const arr = FALLBACK[b.target] ?? [];
  const idx = (b.attempts ?? 0) % Math.max(arr.length, 1);
  const tip = arr[idx] ?? "Cố lên, bạn đang làm tốt mà";
  return {
    message:
      b.detected !== b.target && (b.scores?.[b.detected] ?? 0) > 0.4
        ? `Mình đang thấy ${LABEL[b.detected].toLowerCase()}. ${tip}.`
        : `${tip} nhé.`,
    tone: "adjust" as const,
  };
};

const buildPrompt = (b: Body) => {
  const name = b.childName ? `, gọi bé là ${b.childName}` : "";
  const recent = (b.recent ?? []).slice(0, 3).join(" | ") || "(chưa có)";
  return `Bạn là Lumi – trợ lý cảm xúc dịu dàng cho trẻ em (đặc biệt là trẻ có rối loạn phổ tự kỷ)${name}.
Trẻ đang cố tạo biểu cảm "${LABEL[b.target]}" trên gương mặt nhưng AI nhận diện thấy "${LABEL[b.detected]}".
Điểm nhận diện hiện tại: ${JSON.stringify(b.scores)}.
Hint gần đây để tránh lặp: ${recent}.

Hãy trả về DUY NHẤT một JSON object dạng:
{"message": "<một câu tiếng Việt, ngắn, dưới 22 từ, ấm áp, hướng dẫn cụ thể bộ phận khuôn mặt cần điều chỉnh>", "tone": "adjust"}

Quy tắc:
- Tránh lặp lại y nguyên các hint gần đây.
- Không dùng từ tiêu cực ("sai", "chưa đúng"). Dùng từ dịu: "thử", "có thể", "một chút".
- Câu phải dễ hiểu, phù hợp trẻ 5–10 tuổi.
- Chỉ trả JSON, không thêm markdown.`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  if (!body?.target || !body?.detected || !body?.scores) {
    return new Response(JSON.stringify({ error: "missing fields" }), {
      status: 400,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const apiKey =
    Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("LOVABLE_API_KEY") ?? "";
  const model = Deno.env.get("AI_MODEL") ?? "gpt-4o-mini";
  const baseUrl = Deno.env.get("AI_BASE_URL") ?? "https://api.openai.com/v1";

  if (!apiKey) {
    return new Response(JSON.stringify(fallback(body)), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Bạn là Lumi, trợ lý cảm xúc cho trẻ. Luôn trả lời bằng JSON ngắn, tiếng Việt.",
          },
          { role: "user", content: buildPrompt(body) },
        ],
      }),
    });

    if (!r.ok) {
      return new Response(JSON.stringify(fallback(body)), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const j: any = await r.json();
    const raw = j?.choices?.[0]?.message?.content ?? "";
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Một số model trả về kèm code fence – cố parse
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          /* ignore */
        }
      }
    }

    const message = parsed?.message?.toString().trim();
    const tone = ["encourage", "adjust", "celebrate"].includes(parsed?.tone)
      ? parsed.tone
      : "adjust";

    if (!message) {
      return new Response(JSON.stringify(fallback(body)), {
        status: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message, tone }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify(fallback(body)), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
