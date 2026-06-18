/**
 * Face recognition utilities wrapping @vladmandic/face-api.
 * All computation runs in the browser (WebGL). No faces leave the device.
 *
 * Models are loaded once and cached. We use the CDN-hosted weights from
 * jsDelivr so no manual file-copying is needed.
 *
 * Usage:
 *   await loadFaceModels();
 *   const descriptor = await captureFaceDescriptor(videoElement);
 *   const matcher = buildMatcher(employees);
 *   const match   = matchFace(descriptor, matcher);
 */

// ── Lazy-import face-api.js (browser only) ─────────────────────────────────────
let faceapi: typeof import('@vladmandic/face-api') | null = null;

// Served from public/models/ — copied from node_modules/@vladmandic/face-api/model/
const MODEL_URL = '/models';

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (typeof window === 'undefined') throw new Error('Face API is browser-only');

  if (!faceapi) {
    faceapi = await import('@vladmandic/face-api');
  }

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

// ── Capture a single face descriptor from a video element ─────────────────────

export async function captureFaceDescriptor(
  videoEl: HTMLVideoElement,
): Promise<number[] | null> {
  if (!faceapi) throw new Error('Call loadFaceModels() first');

  const detection = await faceapi
    .detectSingleFace(videoEl as any, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return Array.from(detection.descriptor);
}

// ── Detect ALL faces in a video frame (for kiosk auto-recognition) ────────────

export async function detectFacesInFrame(
  videoEl: HTMLVideoElement,
): Promise<{ descriptor: number[]; box: { x: number; y: number; width: number; height: number } }[]> {
  if (!faceapi) throw new Error('Call loadFaceModels() first');

  const detections = await faceapi
    .detectAllFaces(videoEl as any, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => ({
    descriptor: Array.from(d.descriptor),
    box: {
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
    },
  }));
}

// ── FaceMatcher ───────────────────────────────────────────────────────────────

export interface LabeledEmployee {
  id: string;
  name: string;
  descriptor: number[]; // parsed from JSON
}

export interface MatchResult {
  employeeId: string;
  employeeName: string;
  distance: number;
}

const MATCH_THRESHOLD = 0.5; // lower = stricter; 0.5 is a good default

export function buildFaceMatcher(
  employees: LabeledEmployee[],
): import('@vladmandic/face-api').FaceMatcher | null {
  if (!faceapi) return null;
  if (employees.length === 0) return null;

  const labeled = employees.map(
    (e) =>
      new faceapi!.LabeledFaceDescriptors(e.id, [new Float32Array(e.descriptor)]),
  );
  return new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD);
}

export function matchFace(
  descriptor: number[],
  matcher: import('@vladmandic/face-api').FaceMatcher,
  employees: LabeledEmployee[],
): MatchResult | null {
  const result = matcher.findBestMatch(new Float32Array(descriptor));
  if (result.label === 'unknown') return null;

  const emp = employees.find((e) => e.id === result.label);
  if (!emp) return null;

  return { employeeId: emp.id, employeeName: emp.name, distance: result.distance };
}
