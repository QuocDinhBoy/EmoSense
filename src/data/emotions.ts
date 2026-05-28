import happyImg from "@/assets/emotions/happy.png";
import sadImg from "@/assets/emotions/sad.png";
import angryImg from "@/assets/emotions/angry.png";
import scaredImg from "@/assets/emotions/scared.png";
import surprisedImg from "@/assets/emotions/surprised.png";
import calmImg from "@/assets/emotions/calm.png";
import loveImg from "@/assets/emotions/love.png";

export type EmotionKey =
  | "happy" | "sad" | "angry" | "scared" | "surprised" | "calm" | "love";

export interface Emotion {
  key: EmotionKey;
  label: string;
  emoji: string;
  /** Ảnh hoạt hình – mặc định, dùng cho mọi nơi */
  image: string;
  /** Một vài ảnh người thật từ Unsplash CDN. Đã verify match đúng cảm xúc. */
  realImages: string[];
  color: string; // tailwind class
  description: string;
  /** Mô tả ngắn nét mặt – giúp trẻ liên hệ ảnh thật ↔ cartoon */
  faceCues: string[];
}

/**
 * Helper tạo URL Unsplash từ photo ID.
 * w=600 đủ tốt cho card display, format=auto cho WebP/AVIF, q=80 cân bằng chất lượng.
 *
 * Tất cả các ID dưới đây đã được verify thủ công bằng cách truy cập trang
 * Unsplash gốc và kiểm tra ảnh đúng với cảm xúc tương ứng (không phải đoán).
 */
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;

export const EMOTIONS: Emotion[] = [
  {
    key: "happy",
    label: "Vui",
    emoji: "😊",
    image: happyImg,
    // Đã verify: cô gái cười tươi, người phụ nữ cười, anh chàng tóc xoăn cười
    realImages: [
      U("1494790108377-be9c29b29330"), // Michael Dam – cô gái cười tươi (Happy daughter)
      U("1562337404-3044c84ac061"),    // Kate Kozyrka – smiling woman B&W
      U("1601233749202-95d04d5b3c00"), // Timothy Dykes – man in green smiling
    ],
    color: "bg-emo-happy",
    description: "Khi có điều tốt đẹp xảy ra.",
    faceCues: ["Miệng cười cong lên", "Mắt hơi nheo lại", "Lông mày thả lỏng"],
  },
  {
    key: "sad",
    label: "Buồn",
    emoji: "😢",
    image: sadImg,
    // Đã verify: bé gái khóc, đàn ông lau nước mắt, phụ nữ buồn, bé trai ngồi che mặt
    realImages: [
      U("1517545084371-4a575dde2a02"), // Arwan Sutanto – girl crying
      U("1494368308039-ed3393a402a4"), // Tom Pumford – man wiping tears
      U("1500100120405-95363acb1817"), // Pablo Varela – sad woman B&W
      U("1528820713738-a43de1b61084"), // Ksenia Makagonova – sad boy covering face
    ],
    color: "bg-emo-sad",
    description: "Khi bạn nhớ ai đó hoặc cảm thấy chùng xuống.",
    faceCues: ["Khoé miệng cong xuống", "Mắt rũ xuống", "Có thể có nước mắt"],
  },
  {
    key: "angry",
    label: "Giận",
    emoji: "😠",
    image: angryImg,
    // Đã verify: người đàn ông giận hét điện thoại, đàn ông mặt giận, đàn ông hói cau có
    realImages: [
      U("1544717301-9cdcb1f5940f"), // Icons8 – man screaming on phone
      U("1609852234838-147db6815968"), // engin akyurt – portrait of an angry man
      U("1704958719629-eb8f9e7e9cb9"), // Dmytro Tolokonov – bald angry man
      U("1521996319423-90475f382dff"), // Photo Boards – grayscale man opening mouth (raw emotion)
    ],
    color: "bg-emo-angry",
    description: "Khi điều gì đó không công bằng.",
    faceCues: ["Lông mày chau lại", "Hai môi mím chặt", "Mắt nhìn thẳng dữ"],
  },
  {
    key: "scared",
    label: "Sợ",
    emoji: "😨",
    image: scaredImg,
    // Đã verify: bé gái che mặt, bé gái lo lắng tay che mặt, bé trai ngồi co lại
    // Lưu ý: ảnh "scared" thuần (mở miệng to/mắt mở to) trên Unsplash thường là Premium.
    // Dùng các ảnh che mặt / lo âu — vẫn mang ý "sợ" rõ ràng cho trẻ.
    realImages: [
      U("1483193722442-5422d99849bc"), // Caleb Woods – girl covering face with hands
      U("1653142732993-5af16437135a"), // Ladislav Stercell – young girl hands on face (worried)
      U("1647709719115-6a09b0646e09"), // Pete F – child face dark bg (scared/sad)
    ],
    color: "bg-emo-scared",
    description: "Khi cảm thấy không an toàn.",
    faceCues: ["Mắt mở to", "Vai có thể co lại", "Có thể che mặt hoặc lùi lại"],
  },
  {
    key: "surprised",
    label: "Ngạc nhiên",
    emoji: "😲",
    image: surprisedImg,
    // Đã verify: phụ nữ ngạc nhiên, cô gái tóc vàng sốc, người đàn ông kính ngạc nhiên, anh đeo kính sốc
    realImages: [
      U("1639986168426-0616506bbae1"), // engin akyurt – surprised woman
      U("1588791181011-697d7e84c24b"), // Alexander Krivitskiy – blonde shocked
      U("1702677852474-9801fc432f0f"), // Abubakar Isa – man with glasses surprised
      U("1629131973033-30f604f0434a"), // Afif Ramdhasuma – Asian man amazed
    ],
    color: "bg-emo-surprised",
    description: "Khi có điều bất ngờ xảy ra.",
    faceCues: ["Mắt mở to", "Lông mày nhướng cao", "Miệng tròn"],
  },
  {
    key: "calm",
    label: "Bình yên",
    emoji: "😌",
    image: calmImg,
    // Đã verify: phụ nữ bình tĩnh trên nền trời, phụ nữ tựa đầu thư giãn, phụ nữ ánh sáng dịu
    realImages: [
      U("1762114469204-0aa2cbfa609d"), // Zulfugar Karimov – woman against blue sky (calm)
      U("1759890338444-2edce2103a7d"), // Maria Valihanova – woman resting her head (calm/peace)
      U("1763504365746-d27f77da265e"), // JEaLiFe Pictures – young woman in dappled sunlight (calm)
    ],
    color: "bg-emo-calm",
    description: "Khi bạn thấy thư giãn và an toàn.",
    faceCues: ["Khuôn mặt thả lỏng", "Hơi mỉm cười nhẹ", "Mắt dịu, đôi khi nhắm lại"],
  },
  {
    key: "love",
    label: "Yêu thương",
    emoji: "🥰",
    image: loveImg,
    // Đã verify: bé trai ôm mẹ, mẹ bố hôn nhau bên con, bố bồng con gái, mẹ bồng em bé
    realImages: [
      U("1531984929664-2fb2be468d3e"), // Xavier Mouton – boy hugging mom
      U("1602255680702-c47261041a97"), // Hana El Zohiry – family kissing in field
      U("1594095405208-9dad61448c7b"), // Dani Guitarra – dad carrying girl in nature
      U("1621964277140-4e8969c0a5e8"), // Helena Lopes – woman carrying baby
    ],
    color: "bg-emo-love",
    description: "Khi bạn cảm thấy được quan tâm.",
    faceCues: ["Cười dịu dàng", "Mắt ấm áp", "Có thể ôm hoặc gần người thân"],
  },
];

export const getEmotion = (k: EmotionKey) => EMOTIONS.find(e => e.key === k)!;

/** Lấy danh sách EMOTIONS theo subset key, giữ thứ tự gốc */
export const pickEmotions = (keys?: EmotionKey[]) =>
  keys && keys.length ? EMOTIONS.filter(e => keys.includes(e.key)) : EMOTIONS;
