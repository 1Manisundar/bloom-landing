// The night behind everything: the same two soft lights as the CSS poster (amber and iris), drawn inside the
// scene so they can glide between chapters with the camera rather than step.

import { BufferGeometry, Color, Float32BufferAttribute, Mesh, ShaderMaterial, Vector4 } from "three";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec4 uLights;            // amber x, y, iris x, y: 0 to 1, y measured from the top like CSS
  uniform float uGlow;
  uniform float uAspect;
  uniform vec3 uInk;
  uniform vec3 uAmber;
  uniform vec3 uIris;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 stretch = vec2(uAspect, 1.0);
    float reach = 0.58 * max(uAspect, 1.0);
    float amber = smoothstep(reach, 0.0, length((uv - uLights.xy) * stretch));
    float iris = smoothstep(reach * 0.9, 0.0, length((uv - uLights.zw) * stretch));
    vec3 color = uInk * (1.0 + 0.25 * uv.y) + uAmber * amber * amber * uGlow * 0.16 + uIris * iris * iris * 0.085;
    // A grain of noise so the dark gradients do not band.
    color += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface Backdrop {
  mesh: Mesh;
  uniforms: ShaderMaterial["uniforms"];
}

export function createBackdrop(): Backdrop {
  // One triangle that covers the screen.
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uLights: { value: new Vector4(0.72, 0.38, 0.16, 0.84) },
      uGlow: { value: 0.15 },
      uAspect: { value: 1.6 },
      uInk: { value: new Color("#0d0a18") },
      uAmber: { value: new Color("#ffb020") },
      uIris: { value: new Color("#6a4bd8") },
    },
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return { mesh, uniforms: material.uniforms };
}
