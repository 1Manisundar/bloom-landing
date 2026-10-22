// Chapter II: what you read, watch and build arrives as cards and is taken in by the brain. Each card flies
// a curved path from far out, tumbling, and shrinks to nothing as it reaches the middle. The whole flight is
// worked out in the vertex shader from the clock, so a dozen cards cost next to nothing.

import {
  AdditiveBlending, DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial, Vector3,
} from "three";
import { mulberry32 } from "./shapes";

export const CARD_COUNT = 12;
/** Seconds for one card to make the trip. */
export const CARD_PERIOD = 5.2;
/** How far through its trip a card is when the brain takes it in. */
export const CARD_ARRIVES = 0.9;

const VERTEX = /* glsl */ `
  attribute vec4 aCard;            // three random numbers, and where in the cycle this card starts
  uniform float uTime;
  uniform float uPeriod;
  uniform vec3 uTextSide;          // points toward the side of the screen the text is on (zero on a phone)
  varying vec2 vUv;
  varying float vFade;
  varying float vKind;

  mat3 turnY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  mat3 turnZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }

  void main() {
    vUv = uv;
    vKind = floor(aCard.x * 4.0);
    float t = fract(uTime / uPeriod + aCard.w);

    // Where it sets out from: somewhere on a wide shell around the brain.
    float u = aCard.x * 2.0 - 1.0, th = aCard.y * 6.2832, s = sqrt(1.0 - u * u);
    vec3 start = vec3(s * cos(th), u * 0.55, s * sin(th)) * (6.0 + 2.5 * aCard.z);
    // A card that would set out from over the text sets out from the opposite side instead.
    float over = dot(start, uTextSide);
    if (over > -1.0) start -= uTextSide * (over + 1.0 + 2.0 * aCard.z);
    // A point off to one side that bends the path into an arc.
    vec3 bend = start * 0.5 + normalize(cross(start, vec3(0.0, 1.0, 0.0)) + 0.001) * (aCard.z - 0.5) * 5.0
      + vec3(0.0, (aCard.x - 0.5) * 2.4, 0.0);

    // It drifts at first, then is pulled in faster and faster.
    float e = t * t * (1.6 - 0.6 * t);
    vec3 centre = mix(mix(start, bend, e), mix(bend, vec3(0.0, 0.2, 0.0), e), e);

    float appear = smoothstep(0.0, 0.14, t);
    float taken = 1.0 - smoothstep(0.66, 0.93, t);
    float tumble = 1.0 - e;
    mat3 turn = turnY(0.5 + tumble * 3.2 * (aCard.x - 0.5) * 2.0) * turnZ(tumble * 1.3 * (aCard.y - 0.5) * 2.0);
    vec3 p = centre + turn * (position * (0.3 + 0.7 * taken) * appear * taken);

    vFade = appear * taken;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uShow;
  varying vec2 vUv;
  varying float vFade;
  varying float vKind;

  float box(vec2 p, vec2 size, float r) {
    vec2 q = abs(p) - size + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.0, 0.64);
    float d = box(p, vec2(0.48, 0.3), 0.045);
    float edge = smoothstep(0.014, 0.0, abs(d + 0.008));
    float inside = smoothstep(0.0, -0.01, d);

    // A tag in the corner and a few lines of writing: enough to read as "something you took in".
    float tag = smoothstep(0.0, -0.004, box(p - vec2(-0.33, 0.19), vec2(0.075, 0.028), 0.01));
    float lines = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float len = 0.2 + 0.14 * fract(vKind * 0.37 + fi * 0.61);
      lines += smoothstep(0.0, -0.003, box(p - vec2(-0.4 + len, 0.08 - fi * 0.085), vec2(len, i == 0 ? 0.017 : 0.008), 0.006));
    }

    vec3 tint = vKind < 0.5 ? vec3(1.0, 0.68, 0.1) : vKind < 1.5 ? vec3(1.0, 0.28, 0.42) : vKind < 2.5 ? vec3(0.42, 0.3, 1.0) : vec3(1.0, 0.86, 0.66);
    float light = edge * 1.3 + inside * (0.07 + tag * 0.75 + lines * 0.5);
    gl_FragColor = vec4(tint * light * vFade * uShow, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface Cards {
  mesh: Mesh;
  uniforms: ShaderMaterial["uniforms"];
  /** Each card's place in the cycle, 0 to 1: used to know when one reaches the brain. */
  offsets: number[];
}

export function createCards(): Cards {
  const r = mulberry32(23);
  const plane = new PlaneGeometry(1.15, 1.15 * 0.64);
  const geometry = new InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.setAttribute("position", plane.getAttribute("position"));
  geometry.setAttribute("uv", plane.getAttribute("uv"));
  geometry.instanceCount = CARD_COUNT;

  const data = new Float32Array(CARD_COUNT * 4);
  const offsets: number[] = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    // Evenly spread through the cycle, with a little raggedness so they never arrive in step.
    const offset = (i + r() * 0.6) / CARD_COUNT;
    offsets.push(offset);
    data.set([r(), r(), r(), offset], i * 4);
  }
  geometry.setAttribute("aCard", new InstancedBufferAttribute(data, 4));

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uShow: { value: 0 }, uPeriod: { value: CARD_PERIOD }, uTextSide: { value: new Vector3() } },
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return { mesh, uniforms: material.uniforms, offsets };
}
