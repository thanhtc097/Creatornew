import { runEnhancePipeline } from "./engine.js";

let activeJobId = null;

self.onmessage = async (event) => {
  const { type, jobId } = event.data;

  if (type === "cancel") {
    if (activeJobId === jobId) {
      activeJobId = null;
    }
    return;
  }

  if (type === "process") {
    activeJobId = jobId;
    const {
      sourceBuffer,
      srcW,
      srcH,
      destW,
      destH,
      options,
    } = event.data;

    try {
      const sourceData = new Uint8ClampedArray(sourceBuffer);

      const resultPixels = runEnhancePipeline(
        sourceData,
        srcW,
        srcH,
        destW,
        destH,
        options,
        ({ stage, progress, message }) => {
          if (activeJobId === jobId) {
            self.postMessage({
              type: "progress",
              jobId,
              stage,
              progress,
              message,
            });
          }
        }
      );

      if (activeJobId !== jobId) {
        self.postMessage({ type: "cancelled", jobId });
        return;
      }

      self.postMessage(
        {
          type: "result",
          jobId,
          resultBuffer: resultPixels.buffer,
          width: destW,
          height: destH,
        },
        [resultPixels.buffer]
      );
      activeJobId = null;
    } catch (err) {
      self.postMessage({
        type: "error",
        jobId,
        message: err instanceof Error ? err.message : String(err),
      });
      activeJobId = null;
    }
  }
};
