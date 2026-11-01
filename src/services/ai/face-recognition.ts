/**
 * PhotoOS Advanced AI Face Recognition Engine
 * Powered by FaceRecognitionNet (ResNet-34) via @vladmandic/face-api
 * Benchmark: 99.38% Accuracy on Labeled Faces in the Wild (LFW)
 */

import { Platform } from "react-native";

export const MATCH_THRESHOLD = 0.60; // Standard optimal threshold for ResNet-34 FaceRecognitionNet (99%+ accuracy)
const CDN_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/dist/face-api.js";
const CDN_MODEL_PATH = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model";

let modelsLoaded = false;
let modelLoadingPromise: Promise<boolean> | null = null;
let scriptLoadingPromise: Promise<any> | null = null;

export interface FaceDetectionResult {
  descriptor: number[];
  score: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MatchResult {
  photoId: string;
  distance: number;
  similarity: number; // 0 to 100 percentage
  isMatch: boolean;
}

/**
 * Dynamically loads face-api.js script in browser environment
 */
export async function getFaceApi(): Promise<any> {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return null;
  }

  if ((window as any).faceapi) {
    return (window as any).faceapi;
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src*="face-api"]`) as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).faceapi) {
        resolve((window as any).faceapi);
        return;
      }
      existing.addEventListener("load", () => resolve((window as any).faceapi));
      existing.addEventListener("error", (e) => reject(e));
      return;
    }

    const script = document.createElement("script");
    script.src = CDN_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      console.log("[FaceRecognition] face-api library loaded successfully from CDN");
      resolve((window as any).faceapi);
    };
    script.onerror = (e) => {
      console.error("[FaceRecognition] Failed to load face-api script:", e);
      reject(new Error("Unable to load AI face recognition runtime."));
    };
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

/**
 * Initializes and loads deep learning models (TinyFaceDetector, FaceLandmark68, FaceRecognitionNet)
 */
export async function loadFaceRecognitionModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (Platform.OS !== "web" || typeof window === "undefined") return false;

  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  modelLoadingPromise = (async () => {
    try {
      const faceapi = await getFaceApi();
      if (!faceapi) return false;

      // Check if models are already loaded
      if (
        faceapi.nets.tinyFaceDetector.isLoaded &&
        faceapi.nets.faceLandmark68Net.isLoaded &&
        faceapi.nets.faceRecognitionNet.isLoaded
      ) {
        modelsLoaded = true;
        return true;
      }

      console.log("[FaceRecognition] Loading 99%+ accuracy neural network models from CDN...");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(CDN_MODEL_PATH),
        faceapi.nets.faceLandmark68Net.loadFromUri(CDN_MODEL_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(CDN_MODEL_PATH),
      ]);

      modelsLoaded = true;
      console.log("[FaceRecognition] AI Models loaded successfully!");
      return true;
    } catch (err) {
      console.error("[FaceRecognition] Model loading failed:", err);
      modelsLoaded = false;
      return false;
    } finally {
      modelLoadingPromise = null;
    }
  })();

  return modelLoadingPromise;
}

/**
 * Loads an image from a URI into an HTMLImageElement with CORS enabled
 */
export function loadImageElement(source: string | HTMLImageElement): Promise<HTMLImageElement> {
  if (typeof source !== "string") {
    if (source.complete && source.naturalWidth > 0) {
      return Promise.resolve(source);
    }
    return new Promise((resolve, reject) => {
      source.onload = () => resolve(source);
      source.onerror = (e) => reject(e);
    });
  }

  const isLocalOrDirect =
    source.startsWith("data:") ||
    source.startsWith("blob:") ||
    source.includes("photoos.in") ||
    source.includes("supabase.co") ||
    source.includes("supabase.in") ||
    source.includes("r2.cloudflarestorage.com") ||
    source.includes("firebasestorage.app") ||
    source.includes("googleusercontent.com") ||
    source.includes("unsplash.com");

  // Only route through server proxy if third-party and cross-origin
  let safeUrl = source;
  if (!isLocalOrDirect && (source.startsWith("http://") || source.startsWith("https://"))) {
    safeUrl = `https://app.photoos.in/api/storage/proxy?url=${encodeURIComponent(source)}`;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    // Do NOT set crossOrigin on data: or blob: URIs (avoids iOS Safari / WebKit security failure)
    if (!source.startsWith("data:") && !source.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      img.src = "";
      reject(new Error("Image loading timed out."));
    }, 10000);

    img.onload = () => {
      if (!timedOut) {
        clearTimeout(timeout);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!timedOut) {
        clearTimeout(timeout);
        // Fallback: retry with direct URL if proxy failed
        if (safeUrl !== source) {
          const retryImg = new Image();
          if (!source.startsWith("data:") && !source.startsWith("blob:")) {
            retryImg.crossOrigin = "anonymous";
          }
          const retryTimeout = setTimeout(() => {
            retryImg.src = "";
            reject(new Error(`Failed to load image: ${source}`));
          }, 10000);

          retryImg.onload = () => {
            clearTimeout(retryTimeout);
            resolve(retryImg);
          };
          retryImg.onerror = (e) => {
            clearTimeout(retryTimeout);
            reject(new Error(`Failed to load image: ${source}`));
          };
          retryImg.src = source;
        } else {
          reject(new Error(`Failed to load image: ${source}`));
        }
      }
    };

    img.src = safeUrl;
  });
}

/**
 * Optimizes an image onto a maximum 480px canvas for ultra fast mobile-safe inference
 */
export function createOptimizedFaceCanvas(
  img: HTMLImageElement,
  maxDimension = 480
): HTMLCanvasElement | HTMLImageElement {
  if (typeof document === "undefined") return img;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h || (w <= maxDimension && h <= maxDimension)) {
    return img;
  }

  const scale = maxDimension / Math.max(w, h);
  const targetW = Math.round(w * scale);
  const targetH = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return img;

  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas;
}

/**
 * Detects a single face (for guest selfie verification) and extracts its 128D biometric vector.
 */
export async function extractSelfieFaceDescriptor(
  imageSource: string | HTMLImageElement
): Promise<{
  success: boolean;
  descriptor?: number[];
  faceCount: number;
  confidence?: number;
  error?: string;
}> {
  const ready = await loadFaceRecognitionModels();
  if (!ready) {
    return {
      success: false,
      faceCount: 0,
      error: "Face recognition AI models could not be loaded. Please check your internet connection.",
    };
  }

  const faceapi = await getFaceApi();
  if (!faceapi) {
    return {
      success: false,
      faceCount: 0,
      error: "AI engine runtime not initialized.",
    };
  }

  let canvasEl: HTMLCanvasElement | null = null;
  try {
    const rawImg = await loadImageElement(imageSource);
    const img = createOptimizedFaceCanvas(rawImg, 480);
    if (img instanceof HTMLCanvasElement) {
      canvasEl = img;
    }

    // 1. TinyFaceDetector with balanced mobile resolution
    const tinyOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.22,
    });

    let detections = await faceapi
      .detectAllFaces(img, tinyOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    // 2. Fallback: try smaller input size for angled / distant faces
    if (detections.length === 0) {
      try {
        const fallbackTiny = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.16,
        });
        detections = await faceapi
          .detectAllFaces(img, fallbackTiny)
          .withFaceLandmarks()
          .withFaceDescriptors();
      } catch {}
    }

    if (detections.length === 0) {
      return {
        success: false,
        faceCount: 0,
        error: "No clear face detected in the photo. Please take a well-lit selfie facing the camera.",
      };
    }

    if (detections.length > 1) {
      // Find the most prominent (largest) face
      detections.sort(
        (a: any, b: any) =>
          b.detection.box.width * b.detection.box.height -
          a.detection.box.width * a.detection.box.height
      );
    }

    const primaryFace = detections[0];
    const descriptor = Array.from(primaryFace.descriptor as Float32Array);

    return {
      success: true,
      descriptor,
      faceCount: detections.length,
      confidence: primaryFace.detection.score,
    };
  } catch (err: any) {
    console.warn("[FaceRecognition] extractSelfieFaceDescriptor error:", err);
    return {
      success: false,
      faceCount: 0,
      error: err?.message || "Failed to analyze selfie.",
    };
  } finally {
    if (canvasEl) {
      canvasEl.width = 0;
      canvasEl.height = 0;
    }
  }
}

/**
 * Detects all faces present in a gallery photo and extracts their 128D descriptors.
 */
export async function extractPhotoFacesDescriptors(
  imageSource: string | HTMLImageElement
): Promise<Array<{ descriptor: number[]; confidence: number; box: any }>> {
  const ready = await loadFaceRecognitionModels();
  if (!ready) return [];

  const faceapi = await getFaceApi();
  if (!faceapi) return [];

  let canvasEl: HTMLCanvasElement | null = null;
  try {
    const rawImg = await loadImageElement(imageSource);
    const img = createOptimizedFaceCanvas(rawImg, 480);
    if (img instanceof HTMLCanvasElement) {
      canvasEl = img;
    }

    const tinyOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.20,
    });

    let detections = await faceapi
      .detectAllFaces(img, tinyOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      try {
        const fallbackTiny = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.16,
        });
        detections = await faceapi
          .detectAllFaces(img, fallbackTiny)
          .withFaceLandmarks()
          .withFaceDescriptors();
      } catch {}
    }

    return detections.map((d: any) => ({
      descriptor: Array.from(d.descriptor as Float32Array),
      confidence: d.detection.score,
      box: {
        x: d.detection.box.x,
        y: d.detection.box.y,
        width: d.detection.box.width,
        height: d.detection.box.height,
      },
    }));
  } catch (err) {
    console.warn("[FaceRecognition] Could not extract photo faces:", err);
    return [];
  } finally {
    if (canvasEl) {
      canvasEl.width = 0;
      canvasEl.height = 0;
    }
  }
}

/**
 * Computes exact Euclidean distance between two 128D face vectors.
 */
export function computeEuclideanDistance(
  vec1: number[] | Float32Array,
  vec2: number[] | Float32Array
): number {
  if (vec1.length !== vec2.length) {
    throw new Error(`Vector length mismatch: ${vec1.length} vs ${vec2.length}`);
  }

  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Calculates similarity percentage (0 to 100%) from Euclidean distance.
 */
export function distanceToSimilarityScore(distance: number): number {
  if (distance <= 0) return 100;
  if (distance >= 0.75) return 0;
  const normalized = Math.max(0, 1 - distance / 0.75);
  return Math.round(normalized * 100);
}

/**
 * Compares target selfie descriptor against candidate face descriptors in a photo.
 */
export function compareTargetFace(
  targetDescriptor: number[],
  candidateDescriptors: number[][],
  threshold = MATCH_THRESHOLD
): { isMatch: boolean; minDistance: number; similarity: number } {
  if (!candidateDescriptors || candidateDescriptors.length === 0) {
    return { isMatch: false, minDistance: 1.0, similarity: 0 };
  }

  let minDistance = Infinity;

  for (const candidate of candidateDescriptors) {
    const dist = computeEuclideanDistance(targetDescriptor, candidate);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  const isMatch = minDistance <= threshold;
  const similarity = distanceToSimilarityScore(minDistance);

  return {
    isMatch,
    minDistance,
    similarity,
  };
}

