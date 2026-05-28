/**
 * Story Mode — Truyện nhiều cảnh, cảm xúc nhân vật thay đổi qua từng cảnh.
 * Mỗi cảnh có câu hỏi "Bạn ấy đang cảm thấy thế nào?" → bé chọn cảm xúc.
 * Đây là dạng Theory of Mind nâng cao cho trẻ ASD.
 */

import type { EmotionKey } from "./emotions";

export interface StoryScene {
  text: string;
  /** Cảm xúc đúng cho cảnh này */
  answer: EmotionKey;
  /** Giải thích ngắn */
  why: string;
}

export interface Story {
  id: string;
  title: string;
  /** Mô tả ngắn cho danh sách */
  desc: string;
  /** Nhân vật chính */
  character: string;
  /** Các cảnh nối tiếp */
  scenes: StoryScene[];
  /** Bài học rút ra cuối truyện */
  moral: string;
  /** Độ khó: 1 dễ, 2 trung bình, 3 khó */
  difficulty: 1 | 2 | 3;
}

export const STORIES: Story[] = [
  {
    id: "story-1",
    title: "Ngày đầu tiên của Mít",
    desc: "Mít đi học lớp mới — nhiều cảm xúc trong một ngày.",
    character: "Mít",
    difficulty: 1,
    moral: "Một ngày có thể có nhiều cảm xúc khác nhau — và tất cả đều ổn.",
    scenes: [
      {
        text: "Sáng nay Mít thức dậy sớm. Hôm nay là ngày đầu tiên ở lớp mới. Mít nhìn chiếc cặp mới và bụng hơi cồn cào.",
        answer: "scared",
        why: "Bắt đầu điều mới lạ có thể khiến ta lo lắng, sợ. Đó là bình thường.",
      },
      {
        text: "Đến lớp, cô giáo mỉm cười và nói: 'Chào Mít! Cô rất vui được gặp em.' Cô dẫn Mít đến chỗ ngồi cạnh cửa sổ.",
        answer: "calm",
        why: "Khi có người đón tiếp ấm áp, ta bắt đầu thấy yên tâm hơn.",
      },
      {
        text: "Giờ ra chơi, một bạn tên Bo chạy đến: 'Mít ơi, chơi đuổi bắt không?' Hai bạn chạy khắp sân, cười vang.",
        answer: "happy",
        why: "Được bạn mới rủ chơi và cùng cười — đó là niềm vui.",
      },
      {
        text: "Chiều về nhà, mẹ hỏi: 'Hôm nay thế nào?' Mít ôm mẹ thật chặt và kể về Bo.",
        answer: "love",
        why: "Chia sẻ niềm vui với người thân và được ôm — đó là yêu thương.",
      },
    ],
  },
  {
    id: "story-2",
    title: "Chiếc diều của Bo",
    desc: "Bo làm diều với bố — nhưng không phải lúc nào cũng suôn sẻ.",
    character: "Bo",
    difficulty: 1,
    moral: "Khi gặp khó khăn, ta có thể buồn — nhưng thử lại thì sẽ vui hơn.",
    scenes: [
      {
        text: "Bố nói: 'Cuối tuần mình làm diều nhé!' Bo nhảy cẫng lên, chạy đi tìm giấy màu ngay.",
        answer: "happy",
        why: "Được làm điều mình thích cùng bố — Bo rất vui.",
      },
      {
        text: "Hai bố con dán, cắt, buộc dây cả buổi sáng. Chiếc diều có hình con cá đẹp lắm. Bo mang ra sân thả.",
        answer: "happy",
        why: "Hoàn thành một tác phẩm cùng nhau mang lại niềm tự hào và vui.",
      },
      {
        text: "Nhưng gió thổi mạnh quá, dây đứt, diều bay lên cao rồi mắc trên ngọn cây. Bo đứng nhìn, mắt ướt.",
        answer: "sad",
        why: "Mất đi thứ mình vừa tạo ra — Bo buồn là điều tự nhiên.",
      },
      {
        text: "Bố đặt tay lên vai Bo: 'Mình làm chiếc mới nhé, lần này bố sẽ buộc dây chắc hơn.' Bo gật đầu, lau mắt.",
        answer: "calm",
        why: "Khi có người an ủi và đề nghị giúp, ta dần bình tĩnh lại.",
      },
    ],
  },
  {
    id: "story-3",
    title: "Bữa tiệc bất ngờ",
    desc: "Lan được bạn bè tổ chức sinh nhật bất ngờ.",
    character: "Lan",
    difficulty: 2,
    moral: "Bất ngờ vui có thể khiến ta sửng sốt — rồi hạnh phúc theo sau.",
    scenes: [
      {
        text: "Hôm nay sinh nhật Lan nhưng không ai nhắc gì cả. Ở lớp, các bạn nói chuyện bình thường. Lan nghĩ: 'Chắc mọi người quên mất.'",
        answer: "sad",
        why: "Nghĩ rằng bạn bè quên sinh nhật mình — Lan thấy buồn.",
      },
      {
        text: "Giờ ra về, cô giáo bảo Lan ở lại giúp dọn lớp. Lan thở dài nhưng vẫn ở lại.",
        answer: "sad",
        why: "Phải ở lại thêm trong ngày buồn — Lan càng chán hơn.",
      },
      {
        text: "Bỗng cửa lớp mở ra — tất cả bạn bè ùa vào với bánh kem và bóng bay: 'SINH NHẬT VUI VẺ LAN!' Lan đứng chết trân.",
        answer: "surprised",
        why: "Hoàn toàn bất ngờ! Lan không ngờ mọi người đã chuẩn bị.",
      },
      {
        text: "Lan cười rạng rỡ, ôm từng bạn. Cô giáo chụp ảnh cả lớp cùng nhau. Đây là sinh nhật đẹp nhất.",
        answer: "happy",
        why: "Sau bất ngờ là niềm vui lớn — Lan hạnh phúc vì được yêu thương.",
      },
    ],
  },
  {
    id: "story-4",
    title: "Con mèo lạc",
    desc: "Bin tìm thấy mèo lạc — hành trình từ sợ đến yêu thương.",
    character: "Bin",
    difficulty: 2,
    moral: "Đôi khi điều ta sợ ban đầu lại trở thành điều ta yêu thương.",
    scenes: [
      {
        text: "Trời mưa to, Bin nghe tiếng kêu yếu ớt ngoài cửa. Mở ra thì thấy một chú mèo nhỏ ướt sũng, run rẩy.",
        answer: "surprised",
        why: "Bin không ngờ có mèo trước cửa nhà — đó là bất ngờ.",
      },
      {
        text: "Bin muốn bế mèo vào nhưng sợ mèo cào. Bin rụt tay lại, đứng nhìn.",
        answer: "scared",
        why: "Sợ bị đau khi chạm vào thứ chưa quen — Bin lo lắng.",
      },
      {
        text: "Mẹ đến, nhẹ nhàng bế mèo lên, lau khô bằng khăn. Mèo kêu 'meo' nhỏ xíu rồi cuộn tròn trong lòng mẹ.",
        answer: "calm",
        why: "Thấy mẹ xử lý nhẹ nhàng, Bin yên tâm — mọi thứ ổn.",
      },
      {
        text: "Tối đó, mèo con nằm ngủ cạnh Bin. Bin vuốt lông mèo và thì thầm: 'Mình sẽ chăm sóc bạn.'",
        answer: "love",
        why: "Bin đã vượt qua sợ hãi và cảm thấy yêu thương chú mèo nhỏ.",
      },
    ],
  },
  {
    id: "story-5",
    title: "Cuộc thi vẽ",
    desc: "An tham gia cuộc thi vẽ — cảm xúc phức tạp khi thắng và thua.",
    character: "An",
    difficulty: 3,
    moral: "Thắng hay thua, điều quan trọng là ta đã cố gắng và biết quan tâm đến người khác.",
    scenes: [
      {
        text: "An vẽ suốt một tuần cho cuộc thi. Bức tranh vẽ gia đình An đi biển — An rất tự hào.",
        answer: "happy",
        why: "Hoàn thành tác phẩm mình tâm huyết — An vui và tự hào.",
      },
      {
        text: "Ngày công bố kết quả, An ngồi nắm chặt tay. Tim đập nhanh khi cô giáo mở phong bì.",
        answer: "scared",
        why: "Chờ đợi kết quả quan trọng — hồi hộp, lo lắng.",
      },
      {
        text: "Cô đọc: 'Giải nhất — An!' Cả lớp vỗ tay. An không tin vào tai mình, miệng há ra.",
        answer: "surprised",
        why: "Dù mong đợi nhưng khi thật sự thắng — An vẫn sửng sốt.",
      },
      {
        text: "An nhìn sang bạn Minh — người cũng vẽ rất đẹp — đang cúi đầu buồn. An cầm giải thưởng mà lòng không hoàn toàn vui.",
        answer: "sad",
        why: "Thấy bạn buồn khi mình thắng — An cảm thấy chùng lại. Đó là sự đồng cảm.",
      },
      {
        text: "An đến bên Minh: 'Tranh bạn đẹp lắm. Lần sau mình cùng vẽ chung nhé?' Minh ngẩng lên, mỉm cười.",
        answer: "love",
        why: "Quan tâm đến cảm xúc người khác và hành động — đó là yêu thương và đồng cảm.",
      },
    ],
  },
];

export const getStoryById = (id: string) => STORIES.find(s => s.id === id);
export const storiesByDifficulty = (d: 1 | 2 | 3) => STORIES.filter(s => s.difficulty === d);
