import * as ort from "onnxruntime-web";

let session = null;
let activeJobId = null;
let backend = null;
let modelConfig = null;

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
  self.postMessage({ type: "status", jobId: null, stage: "model-initialize", progress: 0, messageKey: "model-initialize" });
  const candidates = data.preferredBackends || ["webgpu", "wasm"];
  let lastError;
  for (const candidate of candidates) {
    try {
      if (candidate === "webgpu" && !self.navigator?.gpu) continue;
      session = await ort.InferenceSession.create(data.model.publicUrl, { executionProviders: [candidate] });
      backend = candidate;
      self.postMessage({ type: "initialized", backend, modelId: data.model.id });
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
