const MODEL_MODULE_URL = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm";

export async function removeImageBackground(file, { onProgress = () => {}, signal, loadModule = () => import(/* @vite-ignore */ MODEL_MODULE_URL) } = {}) {
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const module = await loadModule();
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const processImage = module.default || module.removeBackground;
  return await processImage(file, {
    progress: (key, current, total) => {
      if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
      const percent = total ? Math.round((current / total) * 100) : 10;
      onProgress({ key, percent: Math.min(95, Math.max(5, percent)) });
    },
    output: { format: "image/png" },
  });
}

export function backgroundErrorMessage(error) {
  if (error?.name === "AbortError") return { code: "cancelled", message: "Background removal cancelled." };
  return { code: "processing-failed", message: "Unable to run the AI model. Check your connection and try again." };
}
