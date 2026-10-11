// One camera on one rail. The rail is a smooth curve through each chapter's shot, and the scroll position
// says how far along it the camera is. A wide screen and a tall one each have their own rail; anything in
// between (a tablet, a narrow window) blends the two.

import { CatmullRomCurve3, MathUtils, PerspectiveCamera, Vector3 } from "three";
import { CHAPTERS, type Chapter, type Shot } from "./chapters";

const FOV_WIDE = 40;
const FOV_TALL = 56;

export interface Rig {
  /**
   * @param along  0 at the first chapter's shot, CHAPTERS.length - 1 at the last
   * @param time   seconds, for the slow breathing of the camera (0 under reduced motion)
   * @param pointer  -0.5 to 0.5 on each axis, already eased
   */
  update(along: number, time: number, pointer: { x: number; y: number }): void;
  resize(aspect: number): void;
}

export function createRig(camera: PerspectiveCamera): Rig {
  const rail = (pick: (c: Chapter) => Shot, part: "pos" | "look") =>
    new CatmullRomCurve3(CHAPTERS.map((c) => new Vector3(...pick(c)[part])), false, "catmullrom", 0.5);
  const rails = {
    widePos: rail((c) => c.wide, "pos"), wideLook: rail((c) => c.wide, "look"),
    tallPos: rail((c) => c.tall, "pos"), tallLook: rail((c) => c.tall, "look"),
  };

  const a = new Vector3(), b = new Vector3(), pos = new Vector3(), look = new Vector3();
  let wideness = 1;

  return {
    resize(aspect) {
      wideness = MathUtils.smoothstep(aspect, 0.7, 1.3);
      camera.aspect = aspect;
      camera.fov = MathUtils.lerp(FOV_TALL, FOV_WIDE, wideness);
      camera.updateProjectionMatrix();
    },
    update(along, time, pointer) {
      const t = MathUtils.clamp(along / (CHAPTERS.length - 1), 0, 1);
      pos.lerpVectors(rails.tallPos.getPoint(t, a), rails.widePos.getPoint(t, b), wideness);
      look.lerpVectors(rails.tallLook.getPoint(t, a), rails.wideLook.getPoint(t, b), wideness);

      // It is never quite still: a slow breath, and a small lean toward the pointer.
      pos.x += Math.sin(time * 0.21) * 0.12 + pointer.x * 0.7;
      pos.y += Math.sin(time * 0.17 + 1) * 0.08 - pointer.y * 0.45;
      pos.z += Math.cos(time * 0.13) * 0.14;

      camera.position.copy(pos);
      camera.lookAt(look);
    },
  };
}
