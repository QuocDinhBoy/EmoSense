import { useCallback, useEffect, useRef, useState } from "react";
import { detectExpression, type AppEmotion, type DetectionResult } from "@/lib/faceDetect";

export interface LiveMirrorState {
  /** Đang chạy vòng lặp detect không */
  running: boolean;
  /** Có đang nhìn thấy mặt không (lần detect gần nhất) */
  faceVisible: boolean;
  /** Cảm xúc đang nổi nhất (sau smooth) */
  topEmotion: AppEmotion | null;
  /** Điểm các cảm xúc app (0..1) đã smooth qua sliding window */
  smoothedScores: Record<AppEmotion, number>;
  /** Tiến trình giữ biểu cảm target trong khung thời gian xác nhận (0..1) */
  holdProgress: number;
  /** Đã đạt — cần được reset hoặc đổi target để tiếp tục */
  matched: boolean;
  /** Số frame chưa đạt liên tiếp (dùng để trigger AI coach) */
  missStreak: number;
}

const ZERO_SCORES: Record<AppEmotion, number> = {
  happy: 0,
  sad: 0,
  angry: 0,
  scared: 0,
  surprised: 0,
  calm: 0,
};

interface UseLiveMirrorOpts {
  /** Khoảng cách giữa 2 lần detect (ms). Mặc định 400ms — đủ mượt mà không nóng máy. */
  intervalMs?: number;
  /** Số mẫu trong sliding window để smooth điểm. */
  windowSize?: number;
  /** Ngưỡng điểm để tính là "đang giữ đúng biểu cảm" (0..1). Mặc định 0.55. */
  scoreThreshold?: number;
  /** Số mẫu liên tiếp ≥ ngưỡng để xác nhận match (mặc định 3 ≈ 1.2s với interval 400). */
  framesToConfirm?: number;
  /** Số frame fail liên tiếp coi là "struggle" để gọi coach (mặc định 12 ≈ 4.8s). */
  struggleFrames?: number;
  /** Callback khi xác nhận match — chỉ gọi 1 lần đến khi reset/đổi target. */
  onMatch?: (info: { score: number; raw: DetectionResult }) => void;
  /** Callback khi struggle — caller có thể dùng để gọi AI coach. */
  onStruggle?: (info: { detected: AppEmotion | null; scores: Record<AppEmotion, number> }) => void;
}

/**
 * Hook chạy detect liên tục trên một <video>, làm mượt điểm số qua window
 * và xác nhận "match" khi điểm ≥ ngưỡng trong N frame liên tiếp.
 *
 * Caller cần:
 *   const live = useLiveMirror(target, videoRef, { ... });
 *   live.start() / live.stop() / live.reset()
 *
 * Tự động dừng khi unmount.
 */
export function useLiveMirror(
  target: AppEmotion | null,
  videoRef: React.RefObject<HTMLVideoElement>,
  opts: UseLiveMirrorOpts = {},
) {
  const {
    intervalMs = 400,
    windowSize = 4,
    scoreThreshold = 0.55,
    framesToConfirm = 3,
    struggleFrames = 12,
    onMatch,
    onStruggle,
  } = opts;

  const [state, setState] = useState<LiveMirrorState>({
    running: false,
    faceVisible: false,
    topEmotion: null,
    smoothedScores: { ...ZERO_SCORES },
    holdProgress: 0,
    matched: false,
    missStreak: 0,
  });

  // Refs để tránh re-create timer mỗi render
  const windowRef = useRef<Record<AppEmotion, number>[]>([]);
  const consecutiveHitsRef = useRef(0);
  const consecutiveMissRef = useRef(0);
  const matchedRef = useRef(false);
  const targetRef = useRef<AppEmotion | null>(target);
  const timerRef = useRef<number | null>(null);
  const struggleFiredRef = useRef(false);
  const onMatchRef = useRef(onMatch);
  const onStruggleRef = useRef(onStruggle);

  // Cập nhật ref khi callback đổi
  useEffect(() => { onMatchRef.current = onMatch; }, [onMatch]);
  useEffect(() => { onStruggleRef.current = onStruggle; }, [onStruggle]);

  // Khi đổi target → reset bộ đệm
  useEffect(() => {
    targetRef.current = target;
    windowRef.current = [];
    consecutiveHitsRef.current = 0;
    consecutiveMissRef.current = 0;
    matchedRef.current = false;
    struggleFiredRef.current = false;
    setState(s => ({ ...s, holdProgress: 0, matched: false, missStreak: 0 }));
  }, [target]);

  const tick = useCallback(async () => {
    const v = videoRef.current;
    if (!v || v.readyState < 2 || v.paused || v.ended) return;
    let result: DetectionResult | null = null;
    try {
      result = await detectExpression(v);
    } catch {
      return;
    }
    if (matchedRef.current) return; // dừng cập nhật sau khi đã match

    if (!result) {
      consecutiveHitsRef.current = 0;
      // không tăng miss khi không thấy mặt — tránh spam coach
      setState(s => ({
        ...s,
        faceVisible: false,
        holdProgress: 0,
      }));
      return;
    }

    // Đẩy vào sliding window
    const buf = windowRef.current;
    buf.push(result.appScores);
    if (buf.length > windowSize) buf.shift();

    // Trung bình các mẫu trong window
    const avg: Record<AppEmotion, number> = { ...ZERO_SCORES };
    for (const sample of buf) {
      (Object.keys(sample) as AppEmotion[]).forEach(k => {
        avg[k] += sample[k];
      });
    }
    (Object.keys(avg) as AppEmotion[]).forEach(k => {
      avg[k] = avg[k] / buf.length;
    });

    // Top emotion sau smooth
    let topKey: AppEmotion = "calm";
    let topVal = -Infinity;
    (Object.keys(avg) as AppEmotion[]).forEach(k => {
      if (avg[k] > topVal) {
        topVal = avg[k];
        topKey = k;
      }
    });

    const tgt = targetRef.current;
    const targetScore = tgt ? avg[tgt] : 0;
    const hit = !!tgt && targetScore >= scoreThreshold && topKey === tgt;

    if (hit) {
      consecutiveHitsRef.current += 1;
      consecutiveMissRef.current = 0;
    } else {
      consecutiveHitsRef.current = 0;
      consecutiveMissRef.current += 1;
    }

    const holdProgress = Math.min(1, consecutiveHitsRef.current / framesToConfirm);
    const justMatched = consecutiveHitsRef.current >= framesToConfirm && !matchedRef.current;
    if (justMatched) {
      matchedRef.current = true;
      onMatchRef.current?.({ score: targetScore, raw: result });
    }

    // Struggle: chỉ fire 1 lần mỗi target (cho đến khi reset)
    if (
      !matchedRef.current &&
      !struggleFiredRef.current &&
      consecutiveMissRef.current >= struggleFrames
    ) {
      struggleFiredRef.current = true;
      onStruggleRef.current?.({ detected: topKey, scores: avg });
    }

    setState({
      running: true,
      faceVisible: true,
      topEmotion: topKey,
      smoothedScores: avg,
      holdProgress,
      matched: matchedRef.current,
      missStreak: consecutiveMissRef.current,
    });
  }, [framesToConfirm, scoreThreshold, videoRef, windowSize]);

  const stop = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState(s => ({ ...s, running: false }));
  }, []);

  const start = useCallback(() => {
    if (timerRef.current != null) return;
    setState(s => ({ ...s, running: true }));
    // tick ngay lập tức rồi mới đặt interval cho phản hồi nhanh
    void tick();
    timerRef.current = window.setInterval(() => { void tick(); }, intervalMs);
  }, [intervalMs, tick]);

  const reset = useCallback(() => {
    windowRef.current = [];
    consecutiveHitsRef.current = 0;
    consecutiveMissRef.current = 0;
    matchedRef.current = false;
    struggleFiredRef.current = false;
    setState(s => ({
      ...s,
      holdProgress: 0,
      matched: false,
      missStreak: 0,
      smoothedScores: { ...ZERO_SCORES },
    }));
  }, []);

  // Cleanup khi unmount
  useEffect(() => () => stop(), [stop]);

  return { state, start, stop, reset };
}
