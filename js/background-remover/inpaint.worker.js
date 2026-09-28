import * as ort from "onnxruntime-web";

let session = null;
let activeJobId = null;
let backend = null;
let modelConfig = null;

// Configure multi-threading if crossOriginIsolated
try {
  if (self.crossOriginIsolated) {
    ort.env.wasm.numThreads = Math.min(4, Math.max(1, (self.navigator?.hardwareConcurrency || 2) - 1));
  } else {
    ort.env.wasm.numThreads = 1;
  }
  ort.env.wasm.proxy = false;
} catch (e) {
  console.warn("ORT env config warning:", e);
}

self.onmessage = async ({ data }) => {
  try {
    if (data.type === "initialize") await initialize(data);
    if (data.type === "process") await process(data);
    if (data.type === "cancel") activeJobId = activeJobId === data.jobId ? null : activeJobId;
    if (data.type === "dispose") dispose();
  } catch (error) {
    self.postMessage({
      type: "error",
      jobId: data.jobId ?? null,
      code: session ? "processing-failed" : "model-load-failed",
      recoverable: true,
      messageKey: session ? "processing-failed" : "model-load-failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
};

async function initialize(data) {
  modelConfig = data.model;
  if (session) return self.postMessage({ type: "initialized", backend, modelId: data.model.id });
  self.postMessage({ type: "status", jobId: null, stage: "model-initialize", progress: 99, messageKey: "model-initialize" });

  const candidates = data.preferredBackends || ["webgpu", "wasm"];
  const modelSource = data.modelBuffer || data.model.publicUrl;
  let lastError;

  for (const candidate of candidates) {
    try {
      if (candidate === "webgpu" && !self.navigator?.gpu) continue;
      session = await ort.InferenceSession.create(modelSource, {
        executionProviders: [candidate],
        graphOptimizationLevel: "all",
      });
      backend = candidate;

      // Free buffer immediately to avoid peak RAM duplicate
      data.modelBuffer = null;

      // Warm-up run with dummy tensors to compile WebGPU shaders / WASM threads ahead of user action
      try {
        const dummyImg = new Float32Array(3 * 512 * 512);
        const dummyMask = new Float32Array(512 * 512);
        const feeds = {};
        feeds[session.inputNames[0]] = new ort.Tensor("float32", dummyImg, [1, 3, 512, 512]);
        feeds[session.inputNames[1]] = new ort.Tensor("float32", dummyMask, [1, 1, 512, 512]);
        await session.run(feeds);
      } catch (warmupErr) {
        console.warn("Model warm-up completed with non-fatal note:", warmupErr);
      }

      self.postMessage({ type: "initialized", backend, modelId: data.model.id, ready: true });
      return;
    } catch (error) {
      lastError = error;
      session = null;
    }
  }
  throw lastError || new Error("No supported local inference backend.");
}

async function process(data) {
  if (!session) throw new Error("Model is not initialized.");
  activeJobId = data.jobId;
  self.postMessage({ type: "status", jobId: data.jobId, stage: "processing", progress: 10, messageKey: "processing" });
  let tensor;
  try {
    tensor = await runInference(data);
  } catch (error) {
    if (backend !== "webgpu") throw error;
    self.postMessage({ type: "status", jobId: data.jobId, stage: "model-initialize", progress: 15, messageKey: "webgpu-fallback" });
    await session.release?.();
    session = await ort.InferenceSession.create(modelConfig.publicUrl, { executionProviders: ["wasm"] });
    backend = "wasm";
    tensor = await runInference(data);
  }
  if (activeJobId !== data.jobId) return self.postMessage({ type: "cancelled", jobId: data.jobId });
  const pixels = new Float32Array(tensor.data);
  const size = data.width * data.height;
  if (pixels.length < size * 3) throw new Error("Unexpected model output shape.");
  self.postMessage({ type: "result", jobId: data.jobId, maskVersion: data.maskVersion, pixels, width: data.width, height: data.height, backend }, [pixels.buffer]);
  activeJobId = null;
}

async function runInference(data) {
  const feeds = {};
  feeds[session.inputNames[0]] = new ort.Tensor("float32", data.image, [1, 3, data.height, data.width]);
  feeds[session.inputNames[1]] = new ort.Tensor("float32", data.mask, [1, 1, data.height, data.width]);
  const output = await session.run(feeds);
  return output[session.outputNames[0]];
}

function dispose() {
  activeJobId = null;
  session?.release?.();
  session = null;
  close();
}

