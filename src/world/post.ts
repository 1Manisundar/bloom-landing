// The lens: a soft bloom on everything bright, and a vignette that keeps the eye in the middle.

import { HalfFloatType, type Camera, type Scene, type WebGLRenderer } from "three";
import { BloomEffect, EffectComposer, EffectPass, RenderPass, VignetteEffect } from "postprocessing";

export interface Lens {
  render(deltaSeconds: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export function createLens(renderer: WebGLRenderer, scene: Scene, camera: Camera, small: boolean): Lens {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType, multisampling: 0 });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 0.2,
    luminanceSmoothing: 0.3,
    intensity: small ? 0.85 : 1.0,
    radius: 0.74,
    // The glow is soft, so it is worked out on a half-size picture: a quarter of the pixels, and bloom is
    // most of what a frame costs. A phone uses fewer blur steps as well.
    resolutionScale: 0.5,
    levels: small ? 5 : 6,
  });
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.62 });
  composer.addPass(new EffectPass(camera, bloom, vignette));

  return {
    render: (dt) => composer.render(dt),
    resize: (w, h) => composer.setSize(w, h),
    dispose: () => composer.dispose(),
  };
}
