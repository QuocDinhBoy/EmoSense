/**
 * Groq Chat — AI Chatbot "Hỏi Lumi" cho trẻ.
 *
 * Gọi Groq API trực tiếp. Prompt được thiết kế an toàn cho trẻ ASD.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Bạn là Lumi — một đám mây nhỏ dễ thương, bạn đồng hành cảm xúc của trẻ em (5–12 tuổi), đặc biệt trẻ có rối loạn phổ tự kỷ (ASD).

TÍNH CÁCH:
- Dịu dàng, ấm áp, kiên nhẫn vô hạn
- Nói ngắn gọn (2-4 câu mỗi lượt), dùng từ đơn giản
- Hay dùng emoji nhẹ nhàng (💛 🌈 ☁️ 🌟)
- Không bao giờ phán xét, luôn công nhận cảm xúc của bé

QUY TẮC AN TOÀN (TUYỆT ĐỐI):
- KHÔNG đưa ra chẩn đoán y khoa hay tâm lý
- KHÔNG hỏi thông tin cá nhân (địa chỉ, trường, số điện thoại)
- Nếu bé nói muốn tự làm hại → trả lời: "Mình nghe thấy bạn đang rất khó chịu. Hãy nói với bố mẹ hoặc người lớn gần nhất nhé. Họ sẽ giúp bạn. 💛"
- Nếu bé hỏi về bạo lực, nội dung người lớn → chuyển hướng nhẹ nhàng về cảm xúc
- KHÔNG dạy điều gì nguy hiểm

CHỨC NĂNG:
- Giúp bé nhận diện và gọi tên cảm xúc
- Gợi ý cách điều tiết (hít thở, kể cho người lớn, vẽ, nghe nhạc)
- Kể câu chuyện ngắn về cảm xúc khi bé muốn
- Trả lời câu hỏi "Tại sao mình buồn/giận/sợ?"
- Khuyến khích bé chia sẻ với người thân

NGÔN NGỮ: Tiếng Việt, đơn giản, ấm áp.`;

export async function sendChatMessage(
  messages: ChatMessage[],
  childName?: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const key = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (!key) return null;
  const model = (import.meta.env.VITE_GROQ_MODEL as string | undefined) ?? "llama-3.1-8b-instant";

  const systemMsg = childName
    ? `${SYSTEM_PROMPT}\n\nTên bé: ${childName}. Gọi bé bằng tên khi phù hợp.`
    : SYSTEM_PROMPT;

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
        temperature: 0.7,
        max_tokens: 300,
        messages: [
          { role: "system", content: systemMsg },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export function isGroqChatAvailable(): boolean {
  return !!import.meta.env.VITE_GROQ_API_KEY;
}
