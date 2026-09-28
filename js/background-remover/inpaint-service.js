const CACHE_NAME = "model-lama-v1";

export class InpaintService {
  constructor({ onStatus = () => {}, onDownloadProgress = () => {} } = {}) {
    this.onStatus = onStatus;
    this.onDownloadProgress = onDownloadProgress;
    this.worker = null;
    this.pending = new Map();
    this.initialized = false;
    this.isDownloading = false;
    this.downloadAbortController = null;
  }

  async initialize({ force = false, signal = null } = {}) {
    if (this.initialized && !force) return { cached: true };

    const manifestUrl = new URL("/models/inpainting-manifest.json", window.location.origin);
    const manifestRes = await fetch(manifestUrl);
    if (!manifestRes.ok) throw new Error("Unable to load the inpainting manifest.");
    const manifest = await manifestRes.json();
    const publicUrl = new URL(`/models/${manifest.fileName}`, window.location.origin).href;

    if (!this.worker) {
      this.worker = new Worker(new URL("./inpaint.worker.js", import.meta.url), { type: "module" });
      this.worker.onmessage = (event) => this.handleMessage(event.data);
    }

    // 1. Check Cache API first
    let modelBuffer = null;
    let fromCache = false;

    if ("caches" in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedRes = await cache.match(publicUrl);
        if (cachedRes) {
          modelBuffer = await cachedRes.arrayBuffer();
          if (modelBuffer && modelBuffer.byteLength > 1000000) {
            fromCache = true;
          } else {
            await cache.delete(publicUrl);
            modelBuffer = null;
          }
        }
      } catch (e) {
        console.warn("Cache API read error, falling back to network:", e);
      }
    }

    // 2. Fetch with progress if not in cache
    if (!modelBuffer) {
      this.isDownloading = true;
      this.downloadAbortController = new AbortController();
      const effectiveSignal = signal || this.downloadAbortController.signal;

      this.onStatus({
        type: "status",
        stage: "model-download",
        progress: 0,
        bytesLoaded: 0,
        totalBytes: manifest.sizeBytes || 92600000,
      });

      const response = await fetch(publicUrl, { signal: effectiveSignal });
      if (!response.ok) throw new Error(`Model download failed with HTTP ${response.status}`);

      const total = Number(response.headers.get("Content-Length")) || manifest.sizeBytes || 92600000;
      const reader = response.body.getReader();
      const chunks = [];
      let loaded = 0;
      const startTime = performance.now();

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;

        const elapsedSec = (performance.now() - startTime) / 1000;
        const speedMBps = elapsedSec > 0.1 ? (loaded / (1024 * 1024)) / elapsedSec : 0;
        const percent = Math.min(99, Math.round((loaded / total) * 100));

        this.onDownloadProgress({
          loaded,
          total,
          percent,
          speedMBps: Number(speedMBps.toFixed(1)),
        });

        this.onStatus({
          type: "status",
          stage: "model-download",
          progress: percent,
          bytesLoaded: loaded,
          totalBytes: total,
          speedMBps: Number(speedMBps.toFixed(1)),
        });
      }

      this.isDownloading = false;
      const blob = new Blob(chunks, { type: "application/octet-stream" });
      modelBuffer = await blob.arrayBuffer();

      // Save to Cache API for instant offline loads
      if ("caches" in window) {
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(publicUrl, new Response(blob));
          navigator.storage?.persist?.();
        } catch (e) {
          console.warn("Cache API save error:", e);
        }
      }
    }

    // 3. Post buffer to worker as Transferable to avoid memory duplication
    this.onStatus({
      type: "status",
      stage: "model-initialize",
      progress: 99,
      fromCache,
    });

    const ready = new Promise((resolve, reject) => this.pending.set("initialize", { resolve, reject }));
    this.worker.postMessage(
      {
        type: "initialize",
        model: { ...manifest, publicUrl },
        modelBuffer,
        preferredBackends: manifest.validatedBackends || ["wasm"],
      },
      [modelBuffer]
    );

    const result = await ready;
    this.initialized = true;
    return { ...result, fromCache };
  }

  cancelDownload() {
    if (this.isDownloading && this.downloadAbortController) {
      this.downloadAbortController.abort();
      this.isDownloading = false;
    }
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
    this.cancelDownload();
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

