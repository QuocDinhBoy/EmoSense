import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  /** Cảm xúc bé đang cố thể hiện (vd: "happy") */
  target: string;
  /** Cảm xúc app đang detect được nổi nhất (vd: "calm") */
  detected: string | null;
  /** Tên cảm xúc tiếng Việt – để prompt đỡ nhầm key */
  targetLabel?: string;
  detectedLabel?: string | null;
  /** Điểm các cảm xúc trong app (0..1) */
  scores?: Record<string, number>;
  /** Mô tả nét mặt mẫu của target (faceCues) */
  faceCues?: string[];
  /** Số lần đã thử / chưa đạt liên tiếp */
  missStreak?: number;
  childName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Payload;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const targetLabel = body.targetLabel ?? body.target;
    const detectedLabel = body.detectedLabel ?? body.detected ?? "chưa rõ";
    const cues = (body.faceCues ?? []).join("; ") || "(không có)";
    const scoreLine = body.scores
      ? Object.entries(body.scores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([k, v]) => `${k}=${(v * 100).toFixed(0)}%`)
          .join(", ")
      : "(không có)";

    const sys = `Bạn là một huấn luyện viên cảm xúc cho TRẺ EM (đặc biệt trẻ tự kỷ). Trẻ đang nhìn camera và cố thể hiện một biểu cảm.
Quy tắc:
- LUÔN dùng tiếng Việt, giọng văn ấm áp, ngắn gọn, đơn giản như nói chuyện với trẻ 5-8 tuổi.
- KHÔNG chẩn đoán, KHÔNG dùng từ y khoa.
- Đưa ra GỢI Ý CỤ THỂ về cử động khuôn mặt (lông mày, mắt, miệng) – tối đa 1-2 câu mỗi gợi ý.
- Nếu trẻ đang thể hiện cảm xúc khác, hãy ghi nhận tích cực rồi nhẹ nhàng dẫn về đúng biểu cảm.
- Tránh từ tiêu cực ("sai", "không đúng"). Dùng "thử thêm", "hãy thử".
- Trả về JSON qua tool đã cung cấp.`;

    const user = `Bé ${body.childName ?? "bạn nhỏ"} đang luyện thể hiện cảm xúc "${targetLabel}".
Camera đang thấy nổi nhất: "${detectedLabel}".
Top điểm các cảm xúc: ${scoreLine}.
Đặc điểm khuôn mặt mẫu của "${targetLabel}": ${cues}.
Số lần thử chưa đạt liên tiếp: ${body.missStreak ?? 0}.

Hãy đưa ra:
- "headline": 1 câu khích lệ ngắn (≤ 12 từ).
- "tips": 2-3 gợi ý cử động cụ thể, mỗi gợi ý 1 câu ngắn (≤ 14 từ).
- "voice": 1 câu để app đọc to bằng giọng nói (≤ 18 từ, dễ phát âm, có dấu).`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "give_face_hint",
              description: "Return short, kind face-acting tips in Vietnamese.",
              parameters: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  tips: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 2,
                    maxItems: 3,
                  },
                  voice: { type: "string" },
                },
                required: ["headline", "tips", "voice"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "give_face_hint" } },
      }),
    });

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "Too many requests, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (res.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in workspace usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI error", res.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    return new Response(JSON.stringify(parsed ?? { error: "no hint" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
