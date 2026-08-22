import * as THREE from "three";
import { createBronzeMaterial, createPetalMaps } from "./textures";
import {
  createDotMaps,
  createMeanderMaps,
  createWuXingMaps,
} from "./petal-textures";

function inlay() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc9a36a,
    metalness: 1,
    roughness: 0.18,
    emissive: new THREE.Color(0x4a3014),
    emissiveIntensity: 0.08,
  });
}

function thickRing(
  inner: number,
  outer: number,
  height: number,
  maps: { map: THREE.Texture; bumpMap: THREE.Texture },
) {
  const g = new THREE.Group();
  const topMat = createBronzeMaterial(maps, { transparent: true });
  const side = createBronzeMaterial();
  const gold = inlay();
  const top = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 128), topMat);
  top.rotation.x = -Math.PI / 2;
  top.position.y = height / 2;
  const bot = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 48), side);
  bot.rotation.x = Math.PI / 2;
  bot.position.y = -height / 2;
  const outerW = new THREE.Mesh(
    new THREE.CylinderGeometry(outer, outer, height, 80, 1, true),
    side,
  );
  const innerW = new THREE.Mesh(
    new THREE.CylinderGeometry(inner, inner, height, 80, 1, true),
    side,
  );
  innerW.scale.x = -1;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(outer, 0.015, 8, 80), gold);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = height / 2;
  g.add(top, bot, outerW, innerW, lip);
  return g;
}

function createPetalShape(inner: number, outer: number, half: number) {
  const s = new THREE.Shape();
  const mid = (inner + outer) * 0.52;
  s.moveTo(0, inner * 0.15);
  s.lineTo(-Math.sin(half * 0.55) * mid, Math.cos(half * 0.55) * mid);
  s.lineTo(-Math.sin(half) * (outer * 0.72), Math.cos(half) * (outer * 0.72));
  s.quadraticCurveTo(0, outer + 0.08, Math.sin(half) * (outer * 0.72), Math.cos(half) * (outer * 0.72));
  s.lineTo(Math.sin(half * 0.55) * mid, Math.cos(half * 0.55) * mid);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.09,
    bevelEnabled: true,
    bevelThickness: 0.016,
    bevelSize: 0.014,
    bevelSegments: 2,
    curveSegments: 20,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

const COUNT = 5;
const OPEN = 0.62;
const CLOSED = -0.04;

export function createPetalCompass() {
  const root = new THREE.Group();
  const flip = new THREE.Group();
  const bronze = createBronzeMaterial();
  const gold = inlay();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(5.72, 5.85, 0.12, 72),
    bronze,
  );
  base.position.y = -0.08;
  flip.add(base);

  const outer = thickRing(4.85, 5.7, 0.16, createMeanderMaps(4.85, 5.7));
  outer.position.y = 0.04;
  flip.add(outer);

  const sigil = thickRing(3.55, 4.78, 0.13, createWuXingMaps(3.55, 4.78));
  sigil.position.y = 0.08;
  flip.add(sigil);

  const dots = thickRing(3.12, 3.48, 0.1, createDotMaps(3.12, 3.48));
  dots.position.y = 0.12;
  flip.add(dots);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.9, 0.12, 40), bronze);
  hub.position.y = 0.18;
  const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 8, 24), gold);
  swirl.rotation.x = Math.PI / 2;
  swirl.position.y = 0.26;
  flip.add(hub, swirl);

  const petalMaps = createPetalMaps();
  const petalMat = createBronzeMaterial(petalMaps);
  const geo = createPetalShape(0.7, 3.05, 0.55);
  const pivots: THREE.Group[] = [];
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.rotation.y = -a;
    const blade = new THREE.Mesh(geo, petalMat);
    blade.position.y = 0.22;
    pivot.add(blade);
    flip.add(pivot);
    pivots.push(pivot);
  }

  const reverse = new THREE.Group();
  const back = thickRing(1.1, 5.55, 0.14, createMeanderMaps(1.1, 5.55));
  const core = thickRing(0.2, 1.05, 0.12, createWuXingMaps(0.2, 1.05));
  reverse.add(back, core);
  reverse.rotation.x = Math.PI;
  reverse.position.y = -0.22;
  flip.add(reverse);

  root.add(flip);
  root.scale.setScalar(0.001);
  root.visible = false;

  const setPetals = (k: number) => {
    const rot = THREE.MathUtils.lerp(OPEN, CLOSED, k);
    pivots.forEach((p) => {
      p.children[0].rotation.y = rot;
    });
  };
  setPetals(0);

  return {
    root,
    setPetals,
    setFlip: (k: number) => {
      flip.rotation.x = k * Math.PI;
    },
    spin: (dt: number, speed = 0.22) => {
      sigil.rotation.y += speed * dt;
      outer.rotation.y -= speed * 0.45 * dt;
      dots.rotation.y += speed * 0.8 * dt;
    },
  };
}
