import type { Measurements, BodyBuild } from "./store";

/**
 * Photo → measurement estimation, fully client-side via MediaPipe.
 * The photo never leaves the device.
 *
 * A single photo has no absolute scale, so we work with ratios
 * (body-part width ÷ body pixel height), which reliably separate
 * slim from heavy builds, then project absolute numbers using an
 * assumed average height. Numbers are estimates by design.
 */

const ASSUMED_HEIGHT_CM = 172;
const WASM_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const POSE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const SEG_MODEL =
  "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

export class SizingError extends Error {}

interface Mask {
  data: Float32Array;
  width: number;
  height: number;
}

/** Longest run of person pixels in a row (ignores stray noise). */
function rowWidth(mask: Mask, y: number): number {
  const row = Math.max(0, Math.min(mask.height - 1, Math.round(y)));
  let best = 0;
  let run = 0;
  for (let x = 0; x < mask.width; x++) {
    if (mask.data[row * mask.width + x] > 0.5) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function personVerticalExtent(mask: Mask): { top: number; bottom: number } {
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < mask.height; y++) {
    if (rowWidth(mask, y) > mask.width * 0.02) {
      if (top === -1) top = y;
      bottom = y;
    }
  }
  if (top === -1 || bottom - top < mask.height * 0.3) {
    throw new SizingError(
      "Couldn't find a full head-to-toe person in the photo. Try a clearer full-body shot."
    );
  }
  return { top, bottom };
}

/** Width in cm from a front-view silhouette width (ellipse circumference approx). */
const circumferenceCm = (widthCm: number) => widthCm * 2.85;
const cmToIn = (cm: number) => cm / 2.54;

function classify(waistRatio: number): { build: BodyBuild; buildFactor: number } {
  let build: BodyBuild;
  if (waistRatio < 0.145) build = "slim";
  else if (waistRatio < 0.168) build = "average";
  else if (waistRatio < 0.192) build = "broad";
  else build = "heavy";

  // Map ratio 0.12 → 0.9, 0.22 → 1.3, clamped.
  const buildFactor = Math.min(1.3, Math.max(0.9, 0.9 + (waistRatio - 0.12) * 4));
  return { build, buildFactor };
}

function shirtSize(chestIn: number): Measurements["shirtSize"] {
  if (chestIn < 36) return "S";
  if (chestIn < 40) return "M";
  if (chestIn < 44) return "L";
  if (chestIn < 48) return "XL";
  return "XXL";
}

export async function estimateFromPhoto(image: HTMLImageElement): Promise<Measurements> {
  const { FilesetResolver, PoseLandmarker, ImageSegmenter } = await import(
    "@mediapipe/tasks-vision"
  );

  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);
  const [pose, segmenter] = await Promise.all([
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL },
      runningMode: "IMAGE",
      numPoses: 1,
    }),
    ImageSegmenter.createFromOptions(vision, {
      baseOptions: { modelAssetPath: SEG_MODEL },
      runningMode: "IMAGE",
      outputConfidenceMasks: true,
    }),
  ]);

  try {
    const poseResult = pose.detect(image);
    const lm = poseResult.landmarks[0];
    if (!lm) {
      throw new SizingError(
        "No person detected. Use a well-lit, head-to-toe photo facing the camera."
      );
    }

    const segResult = segmenter.segment(image);
    const conf = segResult.confidenceMasks?.[0];
    if (!conf) throw new SizingError("Could not segment the photo. Try a plainer background.");
    const mask: Mask = {
      data: conf.getAsFloat32Array(),
      width: conf.width,
      height: conf.height,
    };

    const H = mask.height;
    const { top, bottom } = personVerticalExtent(mask);
    const pixelHeight = bottom - top;

    // Landmark rows (normalized y → mask pixels)
    const shoulderY = ((lm[11].y + lm[12].y) / 2) * H;
    const hipY = ((lm[23].y + lm[24].y) / 2) * H;
    if (!(hipY > shoulderY)) {
      throw new SizingError("Pose looks unusual — stand upright facing the camera.");
    }
    const chestY = shoulderY + 0.25 * (hipY - shoulderY);
    const waistY = shoulderY + 0.68 * (hipY - shoulderY);

    const widths = {
      shoulder: rowWidth(mask, shoulderY),
      chest: rowWidth(mask, chestY),
      waist: rowWidth(mask, waistY),
      hip: rowWidth(mask, hipY),
    };

    // Ratios vs pixel height → cm via assumed height
    const toCm = (px: number) => (px / pixelHeight) * ASSUMED_HEIGHT_CM;
    // Chest/shoulder rows include the arms hanging at the sides; trim.
    const chestWidthCm = toCm(widths.chest) * 0.82;
    const shoulderWidthCm = toCm(widths.shoulder) * 0.88;
    const waistWidthCm = toCm(widths.waist) * 0.9;
    const hipWidthCm = toCm(widths.hip);

    const waistRatio = (waistWidthCm * 0.9) / ASSUMED_HEIGHT_CM;
    const { build, buildFactor } = classify(waistRatio);

    const chestIn = Math.round(cmToIn(circumferenceCm(chestWidthCm)));
    const waistIn = Math.round(cmToIn(circumferenceCm(waistWidthCm)));
    const hipIn = Math.round(cmToIn(circumferenceCm(hipWidthCm)));
    const shoulderIn = Math.round(cmToIn(shoulderWidthCm));

    return {
      chestIn,
      waistIn,
      hipIn,
      shoulderIn,
      shirtSize: shirtSize(chestIn),
      pantsWaist: Math.round(waistIn / 2) * 2, // even pant sizes
      build,
      buildFactor,
    };
  } finally {
    pose.close();
    segmenter.close();
  }
}
