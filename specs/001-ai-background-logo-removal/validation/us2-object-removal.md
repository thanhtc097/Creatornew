# US2 Object Removal Validation

The production build loaded the checksum-approved 92.6 MB model locally, accepted an authorized project image, created a keyboard mask, ran LaMa through a dedicated WebAssembly worker, and produced a blob result without an image upload.

WebGPU was tested and rejected for this exact artifact after a runtime Fourier-path Add kernel failure. The full browser/device matrix, cancellation timing, network-body inspection, and 20-image quality benchmark remain required before release.
