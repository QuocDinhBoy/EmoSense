import * as faceapi from "face-api.js";

let loaded = false;
let loading: Promise<void> | null = null;

export async function loadFaceModels() {
  if (loaded) return;
  if (loading) return loading;
  loading = (async () => {
    const url = "/models";
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(url),
      faceapi.nets.faceExpressionNet.loadFromUri(url),
    ]);
    loaded = true;
  })();
  return loading;
}

export type FaceEmotion = "happy" | "sad" | "angry" | "fearful" | "surprised" | "neutral" | "disgusted";

export type AppEmotion = "happy" | "sad" | "angry" | "scared" | "surprised" | "calm";

export interface DetectionResult {
  emotion: FaceEmotion;
  confidence: number;
  /** Raw expression scores 0..1 từ face-api (7 nhãn) */
  all: Record<FaceEmotion, number>;
  /** Đã quy đổi sang nhãn ứng dụng */
  appEmotion: AppEmotion;
  /** Điểm cho từng cảm xúc của ứng dụng (0..1) */
  appScores: Record<AppEmotion, number>;
}

/**
 * Quy đổi 7 nhãn của face-api về nhãn ứng dụng.
 * fearful → scared. neutral + disgusted → calm (gộp vì face-api hay
 * nhầm "không cảm xúc rõ" sang disgusted, app coi như bình yên).
 */
function toAppScores(expr: Record<FaceEmotion, number>): Record<AppEmotion, number> {
  return {
    happy: expr.happy ?? 0,
    sad: expr.sad ?? 0,
    angry: expr.angry ?? 0,
    scared: expr.fearful ?? 0,
    surprised: expr.surprised ?? 0,
    calm: Math.max(expr.neutral ?? 0, (expr.disgusted ?? 0) * 0.5),
  };
}

function pickBest<K extends string>(scores: Record<K, number>): { key: K; value: number } {
  let bestKey: K = (Object.keys(scores)[0] as K);
  let bestVal = -Infinity;
  for (const k of Object.keys(scores) as K[]) {
    if (scores[k] > bestVal) {
      bestVal = scores[k];
      bestKey = k;
    }
  }
  return { key: bestKey, value: bestVal };
}

export async function detectExpression(video: HTMLVideoElement): Promise<DetectionResult | null> {
  await loadFaceModels();
  const det = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceExpressions();
  if (!det) return null;
  const expr = det.expressions as unknown as Record<FaceEmotion, number>;
  const best = pickBest(expr);
  const appScores = toAppScores(expr);
  const appBest = pickBest(appScores);
  return {
    emotion: best.key,
    confidence: best.value,
    all: expr,
    appEmotion: appBest.key,
    appScores,
  };
}

// Map face-api labels to our app emotion keys (giữ tương thích ngược).
export function mapToAppEmotion(e: FaceEmotion): AppEmotion {
  switch (e) {
    case "happy": return "happy";
    case "sad": return "sad";
    case "angry": return "angry";
    case "fearful": return "scared";
    case "surprised": return "surprised";
    case "neutral":
    case "disgusted":
    default: return "calm";
  }
}

/* ------------------------------------------------------------------ */
/* Live Mirror Detection                                               */
/* ------------------------------------------------------------------ */

export interface LiveDetectionOptions {
  /** Khoảng thời gian tối thiểu giữa 2 lần detect (ms). Default 250ms. */
  intervalMs?: number;
  /** Callback nhận kết quả mỗi tick. `null` khi không thấy mặt. */
  onTick: (result: DetectionResult | null) => void;
  /** Callback khi gặp lỗi (vd: model chưa load). */
  onError?: (err: unknown) => void;
}

export interface LiveDetectionHandle {
  stop: () => void;
  /** Đang chạy hay không (flag nội bộ). */
  isRunning: () => boolean;
}

/**
 * Bắt đầu detect liên tục trên video element. Sử dụng requestAnimationFrame
 * với throttle để tiết kiệm CPU/pin. Tự huỷ khi gọi `stop()`.
 */
export function startLiveDetection(
  video: HTMLVideoElement,
  opts: LiveDetectionOptions,
): LiveDetectionHandle {
  const intervalMs = Math.max(80, opts.intervalMs ?? 250);
  let running = true;
  let rafId = 0;
  let last = 0;
  let inflight = false;

  const tick = async (ts: number) => {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    if (inflight) return;
    if (ts - last < intervalMs) return;
    last = ts;
    if (video.readyState < 2 || video.videoWidth === 0) return;
    inflight = true;
    try {
      const res = await detectExpression(video);
      if (running) opts.onTick(res);
    } catch (e) {
      opts.onError?.(e);
    } finally {
      inflight = false;
    }
  };

  rafId = requestAnimationFrame(tick);

  return {
    stop: () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    },
    isRunning: () => running,
  };
}
