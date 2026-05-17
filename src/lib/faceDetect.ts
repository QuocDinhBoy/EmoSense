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

export interface DetectionResult {
  emotion: FaceEmotion;
  confidence: number;
  all: Record<string, number>;
}

export async function detectExpression(video: HTMLVideoElement): Promise<DetectionResult | null> {
  await loadFaceModels();
  const det = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 }))
    .withFaceExpressions();
  if (!det) return null;
  const expr = det.expressions as unknown as Record<FaceEmotion, number>;
  let best: FaceEmotion = "neutral";
  let bestVal = -1;
  (Object.keys(expr) as FaceEmotion[]).forEach(k => {
    if (expr[k] > bestVal) { bestVal = expr[k]; best = k; }
  });
  return { emotion: best, confidence: bestVal, all: expr as any };
}

// Map face-api labels to our app emotion keys
export function mapToAppEmotion(e: FaceEmotion): "happy" | "sad" | "angry" | "scared" | "surprised" | "calm" {
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
