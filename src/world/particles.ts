// The particles. Every shape's positions sit on the graphics card from the start; moving between two shapes
// is one number (uMix), and the vertex shader does the rest, so a morph costs nothing on the main thread.

import {
  AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector2, Vector4,
} from "three";
import { RING_TILT, mulberry32, type ShapeName } from "./shapes";

const VERTEX = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute vec3 aColor;
  attribute vec4 aSeed;            // three random numbers, and which orbit ring the particle rides
  attribute float aCluster;        // which cluster of the example week this particle's idea is in (-1: none)

  uniform float uMix;              // 0 = the "from" shape, 1 = the "to" shape
  uniform float uTime;
  uniform float uSize;
  uniform float uDrift;
  uniform float uGain;
  uniform float uCool;
  uniform float uPulse;
  uniform float uSolid;
  uniform vec2 uHighlight;         // a cluster to light up, and how much (0 = none)
  uniform float uFromOrbit;
  uniform float uToOrbit;
  uniform vec4 uTilt;

  varying vec3 vColor;
  varying float vAlpha;

  // The rings keep turning, each at its own pace, the outer ones slower: intervals that widen.
  vec3 turnRing(vec3 p, float ring, float t) {
    float tilt = ring < 0.5 ? uTilt.x : ring < 1.5 ? uTilt.y : ring < 2.5 ? uTilt.z : uTilt.w;
    float speed = ring < 0.5 ? 0.55 : ring < 1.5 ? -0.34 : ring < 2.5 ? 0.21 : -0.13;
    float c = cos(tilt), s = sin(tilt);
    vec3 q = vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
    float a = t * speed, ca = cos(a), sa = sin(a);
    q = vec3(ca * q.x - sa * q.z, q.y, sa * q.x + ca * q.z);
    return vec3(q.x, c * q.y + s * q.z, -s * q.y + c * q.z);
  }

  // A cheap, smooth, swirling field: what carries a particle off its straight line between two shapes.
  vec3 swirl(vec3 p, float t) {
    return vec3(
      sin(p.y * 1.7 + t) + sin(p.z * 1.3 - t * 0.7),
      sin(p.z * 1.9 + t * 0.8) + sin(p.x * 1.1 + t),
      sin(p.x * 1.5 - t) + sin(p.y * 1.2 + t * 0.6)
    );
  }

  void main() {
    vec3 a = aFrom;
    vec3 b = aTo;
    if (uFromOrbit > 0.5) a = turnRing(a, aSeed.w, uTime);
    if (uToOrbit > 0.5) b = turnRing(b, aSeed.w, uTime);

    // Particles do not all leave at once: each has its own short delay, so a morph travels like a wave.
    float m = clamp(uMix * 1.45 - aSeed.x * 0.45, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    vec3 p = mix(a, b, m);
    float inFlight = 4.0 * m * (1.0 - m);
    p += swirl(p * 0.7 + aSeed.yzx * 6.2832, uTime * 0.35) * (inFlight * 0.4 + uDrift);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = -mv.z;
    float twinkle = 0.72 + 0.28 * sin(uTime * 2.0 + aSeed.x * 40.0);

    // Not-yet-understood things are cold and grey; understood ones are warm.
    float lum = dot(aColor, vec3(0.3, 0.5, 0.2));
    vColor = mix(aColor, vec3(0.5, 0.48, 0.78) * (0.45 + lum), uCool);
    // A particle right in front of the lens fades instead of filling the screen.
    vAlpha = twinkle * uGain * (1.0 + uPulse * 0.7) * smoothstep(0.5, 2.4, depth);

    // The brain is lit like a solid thing: the side facing away falls into shadow, so the near side's
    // folds are not muddled by the far side showing through, and the edges catch a little extra light.
    vec3 outward = normalize((p - vec3(0.0, 0.2, 0.0)) / vec3(1.0, 0.74, 1.6));
    float facing = dot(normalize(normalMatrix * outward), normalize(-mv.xyz));
    float lit = smoothstep(-0.3, 0.2, facing) * (0.6 + 0.7 * pow(1.0 - clamp(facing, 0.0, 1.0), 1.5));
    vAlpha *= mix(1.0, 0.06 + lit, uSolid);

    // The story can light up one cluster of ideas: it brightens, and everything else steps back a little.
    float chosen = step(abs(aCluster - uHighlight.x), 0.1);
    vAlpha *= 1.0 + uHighlight.y * (chosen * 1.6 - (1.0 - chosen) * 0.45);

    gl_PointSize = uSize * (0.4 + 0.6 * aSeed.y) * (1.0 + inFlight * 0.35) * (1.0 + chosen * uHighlight.y * 0.35) / max(depth, 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor * vAlpha, a);
    #include <colorspace_fragment>
  }
`;

/** Gold and amber most of all, then a little of Neuro's pink, iris violet and warm white. */
const PALETTE: Array<[string, number]> = [
  ["#ffd84a", 0.36], ["#ffb020", 0.28], ["#ff8fae", 0.12], ["#8f72ff", 0.1], ["#fff1d6", 0.14],
];

export interface Particles {
  points: Points;
  /** Which two shapes the particles are travelling between. Cheap: the buffers are already uploaded. */
  setShapes(from: ShapeName, to: ShapeName): void;
  uniforms: ShaderMaterial["uniforms"];
}

export function createParticles(count: number, targets: Record<ShapeName, Float32Array>, clusterOf: Float32Array): Particles {
  const r = mulberry32(7);
  const colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const swatch = PALETTE.map(([hex]) => new Color(hex));
  for (let i = 0; i < count; i++) {
    let pick = r(), c = 0;
    while (c < PALETTE.length - 1 && pick > PALETTE[c][1]) { pick -= PALETTE[c][1]; c++; }
    colors[i * 3] = swatch[c].r; colors[i * 3 + 1] = swatch[c].g; colors[i * 3 + 2] = swatch[c].b;
    seeds[i * 4] = r(); seeds[i * 4 + 1] = r(); seeds[i * 4 + 2] = r(); seeds[i * 4 + 3] = i % 4;
  }

  const attrs = {} as Record<ShapeName, BufferAttribute>;
  for (const name of Object.keys(targets) as ShapeName[]) attrs[name] = new BufferAttribute(targets[name], 3);

  const geometry = new BufferGeometry();
  // three wants a "position"; the shader never reads it.
  geometry.setAttribute("position", attrs.hero);
  geometry.setAttribute("aFrom", attrs.hero);
  geometry.setAttribute("aTo", attrs.noise);
  geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 4));
  geometry.setAttribute("aCluster", new BufferAttribute(clusterOf, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    uniforms: {
      uMix: { value: 0 }, uTime: { value: 0 }, uSize: { value: 24 }, uDrift: { value: 0 }, uGain: { value: 1 },
      uCool: { value: 0 }, uPulse: { value: 0 }, uSolid: { value: 0 }, uHighlight: { value: new Vector2(-1, 0) }, uFromOrbit: { value: 0 }, uToOrbit: { value: 0 },
      uTilt: { value: new Vector4(...RING_TILT) },
    },
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;

  let from: ShapeName = "hero", to: ShapeName = "noise";
  return {
    points,
    uniforms: material.uniforms,
    setShapes(nextFrom, nextTo) {
      if (nextFrom !== from) { from = nextFrom; geometry.setAttribute("aFrom", attrs[from]); }
      if (nextTo !== to) { to = nextTo; geometry.setAttribute("aTo", attrs[to]); }
      material.uniforms.uFromOrbit.value = from === "orbit" ? 1 : 0;
      material.uniforms.uToOrbit.value = to === "orbit" ? 1 : 0;
    },
  };
}
