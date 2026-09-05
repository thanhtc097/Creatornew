# React + Vite

## Background Remover local AI

The authorized logo/object-removal mode runs the Apache-2.0 OpenCV LaMa ONNX model locally through ONNX Runtime Web in a dedicated WebAssembly worker. User images and masks are not uploaded.

- Manifest: `public/models/inpainting-manifest.json`
- Acquire and verify: `npm run model:fetch`
- Pinned SHA-256: `7df918ac3921d3daf0aae1d219776cf0dc4e4935f035af81841b40adcf74fdf2`
- Model source and attribution: OpenCV `inpainting_lama`; LaMa by Suvorov et al.
- The downloaded `.onnx` binary is excluded from source control but must be present before the production build. Release validation must check model checksum, content type, CORS, immutable caching, and worker access.

WebGPU is intentionally disabled for this pinned artifact because the implementation spike found an incompatible Add kernel in the Fourier path. WebAssembly completed the same end-to-end inference.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
