import type { EmotionKey } from "./emotions";

export type LessonActivity =
  | "flashcards"
  | "match"
  | "scenario"
  | "camera"
  | "journal";

/** Mức ảnh: cartoon (vẽ) → realistic (ảnh thật) */
export type ImageMode = "cartoon" | "real";

export interface Lesson {
  id: string;
  /** Hiển thị thứ tự trong stage */
  n: number;
  title: string;
  desc: string;
  activity: LessonActivity;
  /** Cảm xúc giới hạn cho bài học (nếu undefined dùng full bộ) */
  emotions?: EmotionKey[];
  /** Cartoon hay ảnh thật */
  imageMode: ImageMode;
  /** Ngưỡng số câu đúng cần đạt để hoàn thành */
  threshold: number;
  /** Số sao thưởng khi hoàn thành */
  reward: number;
  /** Cấp độ tình huống (1=ngắn-dễ, 2=tả nhiều bước, 3=gồm cảm xúc lẫn lộn) */
  scenarioLevel?: 1 | 2 | 3;
  /** Tip hiển thị trên đầu bài */
  tip?: string;
}

export interface Stage {
  id: string;
  n: number;
  title: string;
  /** Mục tiêu của stage (hiển thị cho phụ huynh) */
  goal: string;
  /** Màu nền gradient */
  bg: string;
  /** Mô tả ngắn cho trẻ */
  childDesc: string;
  lessons: Lesson[];
}

/**
 * LỘ TRÌNH HỌC TẬP – 6 giai đoạn nâng dần độ khó
 *
 * 1. Nhận diện cơ bản (cartoon) – làm quen 3 cảm xúc nền
 * 2. Mở rộng cảm xúc (cartoon) – đủ 7 cảm xúc, bắt đầu có ghép
 * 3. Cầu nối: cartoon → ảnh thật – flashcards & match dùng ảnh người thật
 * 4. Tình huống đời sống (text + ảnh thật) – ngắn → dài → cảm xúc hỗn hợp
 * 5. Thể hiện qua camera – tự thể hiện cảm xúc trên gương mặt mình
 * 6. Tự phản ánh – nhật ký cảm xúc & ôn lại tổng hợp
 */
export const STAGES: Stage[] = [
  {
    id: "stage-1",
    n: 1,
    title: "Khởi đầu cảm xúc",
    goal: "Nhận diện 3 cảm xúc cơ bản qua hình hoạt hình",
    bg: "bg-gradient-sky",
    childDesc: "Làm quen với Vui, Buồn, Giận",
    lessons: [
      {
        id: "1-1",
        n: 1,
        title: "Thẻ học: Vui · Buồn · Giận",
        desc: "Xem thẻ hoạt hình và nghe đọc",
        activity: "flashcards",
        emotions: ["happy", "sad", "angry"],
        imageMode: "cartoon",
        threshold: 3,
        reward: 3,
        tip: "Chạm vào nút loa để nghe đọc tên cảm xúc.",
      },
      {
        id: "1-2",
        n: 2,
        title: "Ghép nhanh 3 cảm xúc",
        desc: "Khuôn mặt ↔ Tên cảm xúc",
        activity: "match",
        emotions: ["happy", "sad", "angry"],
        imageMode: "cartoon",
        threshold: 3,
        reward: 3,
        tip: "Chọn khuôn mặt trước, sau đó chọn từ phù hợp.",
      },
    ],
  },
  {
    id: "stage-2",
    n: 2,
    title: "Mở rộng cảm xúc",
    goal: "Học thêm 4 cảm xúc: Sợ, Ngạc nhiên, Bình yên, Yêu thương",
    bg: "bg-gradient-bubble",
    childDesc: "Thêm Sợ, Ngạc nhiên, Bình yên, Yêu thương",
    lessons: [
      {
        id: "2-1",
        n: 1,
        title: "Thẻ học: 4 cảm xúc mới",
        desc: "Sợ, Ngạc nhiên, Bình yên, Yêu thương",
        activity: "flashcards",
        emotions: ["scared", "surprised", "calm", "love"],
        imageMode: "cartoon",
        threshold: 4,
        reward: 3,
      },
      {
        id: "2-2",
        n: 2,
        title: "Thẻ học: Tất cả 7 cảm xúc",
        desc: "Ôn lại đầy đủ",
        activity: "flashcards",
        imageMode: "cartoon",
        threshold: 7,
        reward: 4,
      },
      {
        id: "2-3",
        n: 3,
        title: "Ghép 6 cảm xúc",
        desc: "Khuôn mặt ↔ Từ ngữ",
        activity: "match",
        emotions: ["happy", "sad", "angry", "scared", "surprised", "calm"],
        imageMode: "cartoon",
        threshold: 6,
        reward: 4,
      },
    ],
  },
  {
    id: "stage-3",
    n: 3,
    title: "Cầu nối: Hoạt hình ↔ Người thật",
    goal: "Liên hệ cảm xúc trên gương mặt thật với cảm xúc đã học",
    bg: "bg-gradient-mint",
    childDesc: "Nhìn ảnh người thật và đoán cảm xúc",
    lessons: [
      {
        id: "3-1",
        n: 1,
        title: "Thẻ học ảnh thật: 3 cảm xúc",
        desc: "Vui, Buồn, Giận – ảnh người thật",
        activity: "flashcards",
        emotions: ["happy", "sad", "angry"],
        imageMode: "real",
        threshold: 3,
        reward: 4,
        tip: "Hãy quan sát mắt, miệng và lông mày trên ảnh.",
      },
      {
        id: "3-2",
        n: 2,
        title: "Thẻ học ảnh thật: 4 cảm xúc còn lại",
        desc: "Sợ, Ngạc nhiên, Bình yên, Yêu thương",
        activity: "flashcards",
        emotions: ["scared", "surprised", "calm", "love"],
        imageMode: "real",
        threshold: 4,
        reward: 4,
      },
      {
        id: "3-3",
        n: 3,
        title: "Ghép ảnh thật ↔ Từ",
        desc: "Quan sát kỹ rồi chọn từ",
        activity: "match",
        emotions: ["happy", "sad", "angry", "scared", "surprised", "calm"],
        imageMode: "real",
        threshold: 6,
        reward: 5,
      },
    ],
  },
  {
    id: "stage-4",
    n: 4,
    title: "Tình huống đời sống",
    goal: "Hiểu cảm xúc trong tình huống thực tế: ngắn → dài → hỗn hợp",
    bg: "bg-gradient-sunshine",
    childDesc: "Bạn ấy sẽ cảm thấy thế nào?",
    lessons: [
      {
        id: "4-1",
        n: 1,
        title: "Tình huống ngắn",
        desc: "Một câu mô tả – chọn cảm xúc",
        activity: "scenario",
        scenarioLevel: 1,
        imageMode: "cartoon",
        threshold: 4,
        reward: 4,
      },
      {
        id: "4-2",
        n: 2,
        title: "Câu chuyện nhỏ",
        desc: "Vài câu mô tả – chọn cảm xúc",
        activity: "scenario",
        scenarioLevel: 2,
        imageMode: "real",
        threshold: 4,
        reward: 5,
      },
      {
        id: "4-3",
        n: 3,
        title: "Cảm xúc hỗn hợp",
        desc: "Có thể có 2 cảm xúc cùng lúc",
        activity: "scenario",
        scenarioLevel: 3,
        imageMode: "real",
        threshold: 3,
        reward: 6,
        tip: "Đôi khi ta vừa vui vừa lo – chọn cảm xúc rõ nhất.",
      },
    ],
  },
  {
    id: "stage-5",
    n: 5,
    title: "Thể hiện cảm xúc",
    goal: "Tự thể hiện cảm xúc trên khuôn mặt qua camera",
    bg: "bg-gradient-bubble",
    childDesc: "Soi gương và làm mặt cảm xúc",
    lessons: [
      {
        id: "5-1",
        n: 1,
        title: "Soi gương: Vui & Ngạc nhiên",
        desc: "Hai cảm xúc dễ thể hiện",
        activity: "camera",
        emotions: ["happy", "surprised"],
        imageMode: "cartoon",
        threshold: 2,
        reward: 5,
        tip: "Cười tươi cho cảm xúc Vui, mở mắt to cho Ngạc nhiên.",
      },
      {
        id: "5-2",
        n: 2,
        title: "Soi gương: Buồn & Bình yên",
        desc: "Hai cảm xúc dịu hơn",
        activity: "camera",
        emotions: ["sad", "calm"],
        imageMode: "cartoon",
        threshold: 2,
        reward: 5,
      },
      {
        id: "5-3",
        n: 3,
        title: "Thử thách: 4 cảm xúc",
        desc: "Vui, Sợ, Buồn, Bình yên",
        activity: "camera",
        emotions: ["happy", "scared", "sad", "calm"],
        imageMode: "real",
        threshold: 4,
        reward: 6,
      },
    ],
  },
  {
    id: "stage-6",
    n: 6,
    title: "Tự phản ánh",
    goal: "Ghi lại cảm xúc của chính mình mỗi ngày",
    bg: "bg-gradient-sky",
    childDesc: "Hôm nay bạn cảm thấy thế nào?",
    lessons: [
      {
        id: "6-1",
        n: 1,
        title: "Nhật ký: Hôm nay của tôi",
        desc: "Chọn cảm xúc & ghi vài dòng",
        activity: "journal",
        imageMode: "cartoon",
        threshold: 1,
        reward: 5,
      },
      {
        id: "6-2",
        n: 2,
        title: "Tổng kết: Ôn lại tất cả",
        desc: "Ghép nhanh tất cả cảm xúc",
        activity: "match",
        imageMode: "real",
        threshold: 7,
        reward: 7,
      },
      {
        id: "6-3",
        n: 3,
        title: "Tình huống nâng cao",
        desc: "Đọc và đoán cảm xúc",
        activity: "scenario",
        scenarioLevel: 3,
        imageMode: "real",
        threshold: 5,
        reward: 7,
      },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = STAGES.flatMap(s => s.lessons);

export const getLessonById = (id: string): Lesson | undefined =>
  ALL_LESSONS.find(l => l.id === id);

export const getStageOf = (lessonId: string): Stage | undefined =>
  STAGES.find(s => s.lessons.some(l => l.id === lessonId));

/** Đường link đi đến trang hoạt động cho một lesson */
export const lessonHref = (lesson: Lesson): string => {
  const map: Record<LessonActivity, string> = {
    flashcards: "/app/flashcards",
    match: "/app/match",
    scenario: "/app/scenarios",
    camera: "/app/camera",
    journal: "/app/journal",
  };
  return `${map[lesson.activity]}?lesson=${lesson.id}`;
};
