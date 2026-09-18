export class InpaintService {
  constructor({ onStatus = () => {} } = {}) {
    this.onStatus = onStatus;
    this.worker = null;
    this.pending = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    const manifestUrl = new URL("/models/inpainting-manifest.json", window.location.origin);
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error("Unable to load the inpainting manifest.");
    const manifest = await response.json();
    const publicUrl = new URL(`/models/${manifest.fileName}`, window.location.origin).href;
    this.worker = new Worker(new URL("./inpaint.worker.js", import.meta.url), { type: "module" });
    this.worker.onmessage = (event) => this.handleMessage(event.data);
    const ready = new Promise((resolve, reject) => this.pending.set("initialize", { resolve, reject }));
    this.worker.postMessage({
      type: "initialize",
      model: { ...manifest, publicUrl },
      preferredBackends: manifest.validatedBackends || ["wasm"],
    });
    const result = await ready;
    this.initialized = true;
    return result;
  }

  async process({ jobId, maskVersion, image, mask, width = 512, height = 512 }) {
    await this.initialize();
    const result = new Promise((resolve, reject) => this.pending.set(jobId, { resolve, reject }));
    this.worker.postMessage({ type: "process", jobId, maskVersion, image, mask, width, height }, [image.buffer, mask.buffer]);
    return await result;
  }

  cancel(jobId) {
    this.worker?.postMessage({ type: "cancel", jobId });
    const pending = this.pending.get(jobId);
    pending?.reject(new DOMException("Cancelled", "AbortError"));
    this.pending.delete(jobId);
  }

  dispose() {
    this.worker?.postMessage({ type: "dispose" });
    this.worker?.terminate();
    this.worker = null;
    this.initialized = false;
    for (const pending of this.pending.values()) pending.reject(new DOMException("Disposed", "AbortError"));
    this.pending.clear();
  }

  handleMessage(message) {
    if (message.type === "status") return this.onStatus(message);
    if (message.type === "initialized") {
      this.pending.get("initialize")?.resolve(message);
      this.pending.delete("initialize");
      return;
    }
    const pending = this.pending.get(message.jobId);
    if (!pending) return;
    if (message.type === "result") pending.resolve(message);
    if (message.type === "cancelled") pending.reject(new DOMException("Cancelled", "AbortError"));
    if (message.type === "error") pending.reject(Object.assign(new Error(message.detail || message.code), { code: message.code }));
    if (["result", "cancelled", "error"].includes(message.type)) this.pending.delete(message.jobId);
  }
}
