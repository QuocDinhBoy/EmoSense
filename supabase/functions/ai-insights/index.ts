import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Stat { emotion: string; attempts: number; correct: number; activity: string; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { stats, childName } = await req.json() as { stats: Stat[]; childName?: string; language?: string };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const summary = stats.map(s => `- ${s.activity}/${s.emotion}: ${s.correct}/${s.attempts}`).join("\n") || "Chưa có dữ liệu.";

    const sys = `Bạn là một huấn luyện viên học tập nhi khoa nhẹ nhàng, ấm áp. Hãy viết hướng dẫn ngắn gọn, dịu dàng cho phụ huynh của trẻ tự kỷ (ASD) đang học cảm xúc.
Quy tắc:
- Luôn tích cực, không chẩn đoán.
- Bước tiếp theo cụ thể, nhỏ và dễ thực hiện.
- Tối đa 3 nhận định.
- Tránh ngôn ngữ y khoa.
- LUÔN trả lời bằng TIẾNG VIỆT.
Chỉ trả về JSON qua tool đã cung cấp.`;

    const user = `Bé: ${childName ?? "bé nhà mình"}.
Thống kê hoạt động (đúng/lượt):
${summary}

Hãy đưa ra 1) một điểm mạnh để khen ngợi, 2) một mảng cần luyện thêm một cách nhẹ nhàng, 3) một bước tiếp theo nhỏ (chọn một hoạt động trong app: flashcards, match, camera, scenarios, journal). Tất cả viết bằng tiếng Việt.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "give_insights",
            description: "Return three short, encouraging insights.",
            parameters: {
              type: "object",
              properties: {
                strength: { type: "string" },
                practice: { type: "string" },
                next_step: { type: "string" },
                next_activity: { type: "string", enum: ["flashcards", "match", "camera", "scenarios", "journal"] },
              },
              required: ["strength", "practice", "next_step", "next_activity"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "give_insights" } },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Too many requests, please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI error", res.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    return new Response(JSON.stringify(parsed ?? { error: "no insights" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
