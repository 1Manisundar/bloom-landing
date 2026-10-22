// The links of the example week's map: thin lines between ideas, with a spark running along each one. They draw
// themselves in as you scroll (uReveal), so you watch the map form rather than find it finished.

import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, LineSegments, ShaderMaterial } from "three";
import { mulberry32, type GraphData } from "./shapes";

const VERTEX = /* glsl */ `
  attribute float aAlong;
  attribute float aPhase;
  attribute float aOrder;
  uniform float uReveal;
  varying float vAlong;
  varying float vPhase;
  varying float vGrown;
  void main() {
    vAlong = aAlong;
    vPhase = aPhase;
    vGrown = clamp((uReveal * 1.35 - aOrder) / 0.35, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uShow;
  varying float vAlong;
  varying float vPhase;
  varying float vGrown;
  void main() {
    if (vAlong > vGrown) discard;
    float at = fract(uTime * 0.22 + vPhase);
    float spark = smoothstep(0.09, 0.0, abs(at - vAlong));
    vec3 color = mix(vec3(1.0, 0.44, 0.03), vec3(1.0, 0.86, 0.4), spark);
    gl_FragColor = vec4(color * (0.2 + spark * 1.6) * uShow, 1.0);
    #include <colorspace_fragment>
  }
`;

export interface GraphLines {
  lines: LineSegments;
  uniforms: ShaderMaterial["uniforms"];
}

export function createGraphLines(graph: GraphData): GraphLines {
  const r = mulberry32(11);
  const edgeCount = graph.edges.length / 2;
  const positions: number[] = [], along: number[] = [], phase: number[] = [], order: number[] = [];
  for (let e = 0; e < edgeCount; e++) {
    const a = graph.edges[e * 2], b = graph.edges[e * 2 + 1], p = r();
    positions.push(graph.nodes[a * 3], graph.nodes[a * 3 + 1], graph.nodes[a * 3 + 2]);
    positions.push(graph.nodes[b * 3], graph.nodes[b * 3 + 1], graph.nodes[b * 3 + 2]);
    along.push(0, 1);
    phase.push(p, p);
    // Links inside a cluster form first; the ones that cross between clusters last.
    const crossing = graph.cluster[a] !== graph.cluster[b];
    const o = crossing ? 0.72 + r() * 0.28 : r() * 0.7;
    order.push(o, o);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aAlong", new Float32BufferAttribute(along, 1));
  geometry.setAttribute("aPhase", new Float32BufferAttribute(phase, 1));
  geometry.setAttribute("aOrder", new Float32BufferAttribute(order, 1));

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uShow: { value: 0 }, uReveal: { value: 1 } },
  });
  const lines = new LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.visible = false;
  return { lines, uniforms: material.uniforms };
}
