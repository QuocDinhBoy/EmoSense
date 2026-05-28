import type { EmotionKey } from "./emotions";
import { getEmotion } from "./emotions";

export interface Scene {
  text: string;
  /** Cảm xúc đáp án chính */
  answer: EmotionKey;
  /** Cảm xúc thứ 2 cũng chấp nhận (cho cấp 3 – hỗn hợp) */
  alt?: EmotionKey;
  why: string;
  /** Cấp độ: 1 ngắn, 2 nhiều câu, 3 hỗn hợp */
  level: 1 | 2 | 3;
  /**
   * URL ảnh minh hoạ. Không bắt buộc.
   * Mặc định trang Scenarios sẽ tự lấy ảnh thật của `answer` emotion từ EMOTIONS.realImages
   * — đã verify đúng cảm xúc, an toàn để hiển thị.
   * Field này chỉ dùng để override khi muốn ảnh khác.
   */
  image?: string;
}

/**
 * Helper: trả về ảnh thật minh hoạ cho một scene.
 * Dùng ảnh đầu tiên trong realImages của answer emotion (đã được verify).
 */
export const sceneImage = (scene: Scene): string | undefined => {
  if (scene.image) return scene.image;
  const em = getEmotion(scene.answer);
  return em.realImages[0];
};

export const SCENES: Scene[] = [
  // ============= LEVEL 1 – Ngắn, một câu =============
  {
    level: 1,
    text: "Mít được bạn ở trường tặng một món quà.",
    answer: "happy",
    why: "Khi nhận được điều bất ngờ tốt đẹp, ta thường thấy vui.",
  },
  {
    level: 1,
    text: "Tháp xếp hình của Bo bị đổ mất rồi.",
    answer: "sad",
    why: "Khi điều mình tạo ra bị hỏng, ta có thể thấy buồn.",
  },
  {
    level: 1,
    text: "Có tiếng sấm rất to vọng vào từ ngoài trời.",
    answer: "scared",
    why: "Tiếng động lớn bất ngờ có thể khiến ta sợ. Điều đó bình thường.",
  },
  {
    level: 1,
    text: "Em gái của Sam lấy đồ chơi mà không xin phép.",
    answer: "angry",
    why: "Khi cảm thấy không công bằng, ta có thể thấy giận.",
  },
  {
    level: 1,
    text: "Eli đang đọc sách yên lặng cùng chiếc chăn mềm.",
    answer: "calm",
    why: "Những khoảnh khắc yên tĩnh, ấm áp thường mang lại bình yên.",
  },
  {
    level: 1,
    text: "Mở hộp thì thấy một chú cún con nhảy ra!",
    answer: "surprised",
    why: "Điều bất ngờ ngoài dự đoán làm ta ngạc nhiên.",
  },
  {
    level: 1,
    text: "Mẹ ôm Bin thật chặt trước khi đi ngủ.",
    answer: "love",
    why: "Khi được người thân ôm và quan tâm, ta thấy yêu thương.",
  },

  // ============= LEVEL 2 – Vài câu, có ngữ cảnh =============
  {
    level: 2,
    text: "Lan đã chuẩn bị tiết mục hát suốt một tuần. Hôm nay biểu diễn xong, các bạn vỗ tay rất to và cô giáo khen Lan.",
    answer: "happy",
    why: "Khi cố gắng được công nhận, ta cảm thấy vui và tự hào.",
  },
  {
    level: 2,
    text: "Bố hứa cuối tuần sẽ dẫn Tí đi công viên. Đến hôm đó trời mưa rất to và bố nói: 'Mình lùi lại tuần sau nhé.' Tí ngồi nhìn ra cửa sổ rất lâu.",
    answer: "sad",
    why: "Khi điều ta mong chờ không xảy ra, ta có thể buồn hoặc thất vọng.",
  },
  {
    level: 2,
    text: "An đang xếp xong Lego sau một buổi chiều dài. Bỗng em trai chạy qua làm đổ tất cả. An chưa kịp nói gì thì em trai đã chạy đi mất.",
    answer: "angry",
    why: "Công sức bị phá hỏng khiến ta khó chịu, có thể thấy giận.",
  },
  {
    level: 2,
    text: "Ở nhà mới đêm đầu tiên, đèn đã tắt. Bin nghe tiếng kẽo kẹt từ ngoài cửa và không biết là gì. Bin kéo chăn lên tận cằm.",
    answer: "scared",
    why: "Tiếng động lạ trong bóng tối có thể khiến ta sợ. Hãy gọi người lớn.",
  },
  {
    level: 2,
    text: "Sau bữa tối, cả nhà ngồi ngoài hiên uống trà. Gió mát thổi qua, tiếng dế kêu nhẹ. Su tựa đầu vào vai mẹ.",
    answer: "calm",
    why: "Cùng người thân trong không khí yên ả, ta thấy bình yên.",
  },
  {
    level: 2,
    text: "Đang ngủ trưa thì Mun nghe tiếng meo meo. Mở cửa ra thì thấy một chú mèo lạc trước nhà – y hệt chú mèo Mun từng thấy trên TV.",
    answer: "surprised",
    why: "Sự việc xảy ra đúng lúc và bất ngờ – đó là ngạc nhiên.",
  },
  {
    level: 2,
    text: "Bà ngoại đan cho Mít một chiếc khăn ấm. Mỗi lần lạnh, Mít quàng vào và nghĩ đến bà.",
    answer: "love",
    why: "Khi nghĩ về người thân và sự quan tâm họ dành cho mình, ta thấy yêu thương.",
  },

  // ============= LEVEL 3 – Hỗn hợp, có 2 cảm xúc cùng lúc =============
  {
    level: 3,
    text: "Hôm nay là ngày khai giảng lớp mới. Min mặc áo mới, đi cùng mẹ. Min hơi run vì chưa biết các bạn, nhưng cũng háo hức được gặp cô giáo.",
    answer: "scared",
    alt: "happy",
    why: "Bắt đầu điều mới có thể vừa lo vừa háo hức – cả hai cảm xúc đều ổn.",
  },
  {
    level: 3,
    text: "Anh trai chuyển đi học xa. Bin sẽ có phòng riêng – điều Bin luôn mong. Nhưng tối hôm anh đi, Bin nhìn căn phòng trống và không nói gì.",
    answer: "sad",
    alt: "happy",
    why: "Đôi khi điều tốt xảy ra cùng với mất mát – buồn và vui có thể đến cùng lúc.",
  },
  {
    level: 3,
    text: "Tí thắng giải nhất cuộc thi vẽ. Khi lên nhận giải, Tí thấy bạn thân của mình – người cũng rất cố gắng – đang ngồi nhìn xuống.",
    answer: "happy",
    alt: "sad",
    why: "Mình vui vì thành công nhưng cũng có thể chùng lại khi nghĩ đến người khác.",
  },
  {
    level: 3,
    text: "Sinh nhật của Mun. Cả lớp bất ngờ tổ chức tiệc trong giờ ra chơi. Mun không biết phải nói gì, hai tay cầm chặt chiếc bánh.",
    answer: "surprised",
    alt: "happy",
    why: "Bất ngờ vui có thể vừa làm ta sửng sốt vừa hạnh phúc.",
  },
  {
    level: 3,
    text: "Mẹ phải đi công tác xa một tuần. Mẹ ôm Su rất chặt và nói 'mẹ sẽ về sớm'. Su gật đầu nhưng nước mắt vẫn rơi.",
    answer: "love",
    alt: "sad",
    why: "Yêu thương và buồn khi xa cách thường đi cùng nhau – và đó là điều tự nhiên.",
  },
  {
    level: 3,
    text: "Trời mưa to đột ngột khi Bo đang đạp xe về. Bo trú dưới hiên một quán nhỏ. Sấm chớp ầm ĩ, nhưng cô chủ quán mỉm cười và rót cho Bo một ly nước ấm.",
    answer: "scared",
    alt: "calm",
    why: "Sợ là phản ứng bình thường; sự tử tế của người khác có thể giúp ta dịu lại.",
  },
];

export const scenesByLevel = (level: 1 | 2 | 3): Scene[] =>
  SCENES.filter(s => s.level === level);
