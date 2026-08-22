import * as THREE from "three";
import {
  PLATES,
  createBronzeMaterial,
  createPlateMaps,
  createTorusInscription,
  type PlateSpec,
} from "./textures";
import { easeInOutCubic, easeOutBack, easeOutCubic } from "./fx";
import { createPetalCompass } from "./petal-compass";
import type { Studio } from "./studio";

interface Mount {
  mount: THREE.Group;
  ring: THREE.Group;
  rest: THREE.Euler;
  spin: number;
}

export interface Artifact {
  root: THREE.Group;
  update: (t: number, dt: number, intro: number, paused: boolean, studio: Studio) => void;
  resetShow: () => void;
}

function circlePath(radius: number, segments: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

function moldingProfile(width: number, height: number) {
  const s = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const step = width * 0.22;
  s.moveTo(-hw, -hh);
  s.lineTo(hw, -hh);
  s.lineTo(hw, hh * 0.28);
  s.lineTo(hw - step, hh * 0.28);
  s.lineTo(hw - step, hh);
  s.lineTo(-hw + step, hh);
  s.lineTo(-hw + step, hh * 0.28);
  s.lineTo(-hw, hh * 0.28);
  s.closePath();
  return s;
}

function railProfile(width: number, height: number) {
  const s = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  s.moveTo(-hw, -hh);
  s.lineTo(hw, -hh);
  s.lineTo(hw, hh);
  s.lineTo(-hw, hh);
  s.closePath();
  return s;
}

function extrudeRing(radius: number, shape: THREE.Shape, steps = 180) {
  return new THREE.ExtrudeGeometry(shape, {
    steps,
    bevelEnabled: false,
    extrudePath: circlePath(radius, steps),
    curveSegments: 4,
  });
}

function createInlay() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc9a36a,
    metalness: 1,
    roughness: 0.18,
    emissive: new THREE.Color(0x4a3014),
    emissiveIntensity: 0.08,
    envMapIntensity: 1.2,
  });
}

function addBearings(parent: THREE.Object3D, radius: number, mat: THREE.Material) {
  const axle = new THREE.CylinderGeometry(0.028, 0.034, 0.36, 12);
  const collar = new THREE.TorusGeometry(0.05, 0.012, 8, 20);
  const cap = new THREE.SphereGeometry(0.048, 14, 12);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const g = new THREE.Group();
    const rod = new THREE.Mesh(axle, mat);
    rod.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(collar, mat);
    ring.position.z = 0.14;
    const ball = new THREE.Mesh(cap, mat);
    ball.position.z = 0.22;
    g.add(rod, ring, ball);
    g.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    g.lookAt(0, 0, 0);
    parent.add(g);
  }
}

function addStuds(
  parent: THREE.Object3D,
  radius: number,
  count: number,
  size: number,
  mat: THREE.Material,
  z = 0,
) {
  const geo = new THREE.CylinderGeometry(size, size * 1.15, size * 0.7, 8);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const stud = new THREE.Mesh(geo, mat);
    stud.rotation.x = Math.PI / 2;
    stud.position.set(Math.cos(a) * radius, Math.sin(a) * radius, z);
    parent.add(stud);
  }
}

function createProfiledRing(
  radius: number,
  width: number,
  height: number,
  maps: { map: THREE.Texture; bumpMap: THREE.Texture } | null,
  ornate = true,
) {
  const group = new THREE.Group();
  const bronze = maps
    ? createBronzeMaterial(maps)
    : createBronzeMaterial();
  bronze.side = THREE.FrontSide;
  const shape = ornate ? moldingProfile(width, height) : railProfile(width, height);
  group.add(new THREE.Mesh(extrudeRing(radius, shape), bronze));

  const inlay = new THREE.Mesh(
    new THREE.TorusGeometry(radius, Math.min(width, height) * 0.12, 10, 160),
    createInlay(),
  );
  inlay.scale.z = 0.35;
  group.add(inlay);

  addStuds(group, radius, Math.max(24, Math.floor(radius * 8)), height * 0.28, bronze, height * 0.42);
  addBearings(group, radius, bronze);
  return group;
}

function createLatticeRing(radius: number, span: number, mat: THREE.Material) {
  const group = new THREE.Group();
  const railW = 0.042;
  const railH = 0.055;
  group.add(
    new THREE.Mesh(extrudeRing(radius + span / 2, railProfile(railW, railH), 140), mat),
    new THREE.Mesh(extrudeRing(radius - span / 2, railProfile(railW, railH), 140), mat),
  );
  const rung = new THREE.CylinderGeometry(0.013, 0.013, span, 8);
  const pin = new THREE.SphereGeometry(0.02, 8, 8);
  const n = 36;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const bar = new THREE.Mesh(rung, mat);
    bar.rotation.z = a + Math.PI / 2;
    bar.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    group.add(bar);
    if (i % 2 === 0) {
      const p = new THREE.Mesh(pin, mat);
      p.position.set(
        Math.cos(a) * (radius + span / 2),
        Math.sin(a) * (radius + span / 2),
        0.03,
      );
      group.add(p);
    }
  }
  addBearings(group, radius + span / 2, mat);
  return group;
}

function createPlate(spec: PlateSpec, y: number) {
  const group = new THREE.Group();
  const maps = createPlateMaps(spec);
  const topMat = createBronzeMaterial(maps, { transparent: true });
  const sideMat = createBronzeMaterial();
  const gold = createInlay();

  const top = new THREE.Mesh(
    new THREE.RingGeometry(spec.inner, spec.outer, 160),
    topMat,
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = spec.height / 2;

  const bottom = new THREE.Mesh(
    new THREE.RingGeometry(spec.inner, spec.outer, 64),
    sideMat,
  );
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -spec.height / 2;

  const outerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.outer, spec.outer, spec.height, 96, 1, true),
    sideMat,
  );
  const innerWall = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.inner, spec.inner, spec.height, 96, 1, true),
    sideMat,
  );
  innerWall.scale.x = -1;

  const lipOuter = new THREE.Mesh(
    new THREE.TorusGeometry(spec.outer, 0.016, 8, 96),
    gold,
  );
  lipOuter.rotation.x = Math.PI / 2;
  lipOuter.position.y = spec.height / 2;

  const lipInner = new THREE.Mesh(
    new THREE.TorusGeometry(spec.inner, 0.014, 8, 80),
    gold,
  );
  lipInner.rotation.x = Math.PI / 2;
  lipInner.position.y = spec.height / 2;

  group.add(top, bottom, outerWall, innerWall, lipOuter, lipInner);
  group.position.y = y;
  group.userData.speed = spec.speed;
  return group;
}

function createTaiji(radius: number) {
  const group = new THREE.Group();
  const r = radius;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, -Math.PI / 2, Math.PI / 2, true);
  shape.absarc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, false);
  shape.absarc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.022,
    bevelSegments: 3,
    curveSegments: 64,
  });
  geo.rotateX(-Math.PI / 2);

  const yangMat = new THREE.MeshPhysicalMaterial({
    color: 0xa0784c,
    metalness: 0.82,
    roughness: 0.48,
    clearcoat: 0.08,
    clearcoatRoughness: 0.55,
  });
  const yinMat = new THREE.MeshPhysicalMaterial({
    color: 0x5a3a24,
    metalness: 0.86,
    roughness: 0.52,
    clearcoat: 0.06,
    clearcoatRoughness: 0.6,
  });
  const yang = new THREE.Mesh(geo, yangMat);
  const yin = new THREE.Mesh(geo, yinMat);
  yin.rotateY(Math.PI);

  const eyeGeo = new THREE.CylinderGeometry(r * 0.13, r * 0.13, 0.07, 28);
  const yangEye = new THREE.Mesh(eyeGeo, yinMat);
  const yinEye = new THREE.Mesh(eyeGeo, yangMat);
  yangEye.position.set(0, 0.14, r / 2);
  yinEye.position.set(0, 0.14, -r / 2);

  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(r + 0.08, r + 0.12, 0.1, 64),
    createBronzeMaterial(),
  );
  well.position.y = -0.04;

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(r + 0.04, 0.028, 10, 64),
    createBronzeMaterial(),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06;

  group.add(well, yang, yin, yangEye, yinEye, rim);
  group.position.y = 0.16;
  return group;
}

export function createArtifact(): Artifact {
  const root = new THREE.Group();
  const bronze = createBronzeMaterial();
  const torusMaps = createTorusInscription();
  const mounts: Mount[] = [];

  const luopan = new THREE.Group();
  const taiji = createTaiji(1.14);
  luopan.add(taiji);
  const plates: THREE.Group[] = [];
  PLATES.forEach((spec, i) => {
    const rise = 0.018 * (PLATES.length - i);
    const plate = createPlate(spec, rise);
    plates.push(plate);
    luopan.add(plate);
  });
  root.add(luopan);

  const petalCompass = createPetalCompass();
  root.add(petalCompass.root);

  const coreLight = new THREE.PointLight(0xc4a070, 0.55, 8, 2.2);
  coreLight.position.set(0, 0.4, 0);
  root.add(coreLight);

  const orbitDefs: Array<{
    r: number;
    w: number;
    h: number;
    rot: [number, number, number];
    speed: number;
    lattice?: boolean;
    span?: number;
    maps?: boolean;
  }> = [
    { r: 6.38, w: 0.28, h: 0.16, rot: [Math.PI / 2, 0, 0], speed: 0.12, maps: true },
    { r: 6.72, w: 0.11, h: 0.09, rot: [0, 0, 0], speed: 0.09, maps: true },
    { r: 7.02, w: 0.1, h: 0.085, rot: [0.7, 0.16, 0.38], speed: -0.07, maps: true },
    { r: 7.3, w: 0.09, h: 0.08, rot: [1.05, -0.48, 0.3], speed: 0.06 },
    { r: 7.58, w: 0.08, h: 0.07, rot: [0.4, 1.05, -0.48], speed: -0.1, lattice: true, span: 0.2 },
    { r: 7.88, w: 0.075, h: 0.065, rot: [1.26, 0.8, 0.16], speed: 0.055, lattice: true, span: 0.16 },
  ];

  orbitDefs.forEach((o) => {
    const mount = new THREE.Group();
    const rest = new THREE.Euler(...o.rot);
    const ring = o.lattice
      ? createLatticeRing(o.r, o.span ?? 0.18, bronze)
      : createProfiledRing(o.r, o.w, o.h, o.maps ? torusMaps : null, true);
    mount.add(ring);
    root.add(mount);
    mounts.push({ mount, ring, rest, spin: o.speed });
  });

  let showTime = 0;
  let ringsPosed = false;
  const SWAP_AT = 3.5;
  const SWAP_DUR = 1.8;
  const CLOSE_AT = 5.8;
  const CLOSE_DUR = 2.2;
  const FLIP_AT = 8.4;
  const FLIP_DUR = 2.1;

  const placeLuopan = (visible: boolean, intro: number, swapK = 0) => {
    const enter = easeOutCubic(intro / 0.28);
    luopan.visible = visible && enter > 0.02 && swapK < 0.98;
    luopan.scale.setScalar(Math.max(0.001, enter * (1 - swapK * 0.92)));
    luopan.position.y = -swapK * 1.8;
  };

  const placePetal = (visible: boolean, swapK = 1) => {
    petalCompass.root.visible = visible && swapK > 0.02;
    petalCompass.root.scale.setScalar(Math.max(0.001, visible ? swapK : 0.001));
    petalCompass.root.position.y = THREE.MathUtils.lerp(-2.2, 0.05, swapK);
  };

  const update = (
    _t: number,
    dt: number,
    intro: number,
    paused: boolean,
    studio: Studio,
  ) => {
    const spinMul = studio.spin;

    if (studio.mode === "D" && intro >= 1 && !paused) showTime += dt;

    if (studio.mode === "A") {
      placeLuopan(true, intro, 0);
      placePetal(false, 0);
    } else if (studio.mode === "B" || studio.mode === "C") {
      placeLuopan(false, 1, 1);
      placePetal(true, 1);
      petalCompass.setPetals(studio.close);
      petalCompass.setFlip(studio.flip);
    } else {
      const swapK = easeInOutCubic((showTime - SWAP_AT) / SWAP_DUR);
      const closeK = easeInOutCubic((showTime - CLOSE_AT) / CLOSE_DUR);
      const flipK = easeInOutCubic((showTime - FLIP_AT) / FLIP_DUR);
      placeLuopan(true, intro, swapK);
      placePetal(true, swapK);
      petalCompass.setPetals(closeK);
      petalCompass.setFlip(flipK);
    }

    if (!paused) {
      if (studio.mode === "A") {
        taiji.rotation.y += 0.46 * dt * spinMul;
        plates.forEach((plate, i) => {
          plate.rotation.y += PLATES[i].speed * dt * spinMul;
        });
      } else if (studio.mode === "B" || studio.mode === "C") {
        petalCompass.spin(dt, 0.28 * spinMul);
      } else {
        const swapK = easeInOutCubic((showTime - SWAP_AT) / SWAP_DUR);
        const closeK = easeInOutCubic((showTime - CLOSE_AT) / CLOSE_DUR);
        const spinFade = 1 - closeK * 0.85;
        taiji.rotation.y += 0.46 * dt * (1 - swapK) * spinMul;
        plates.forEach((plate, i) => {
          plate.rotation.y += PLATES[i].speed * dt * (1 - swapK) * spinMul;
        });
        if (swapK > 0.2) petalCompass.spin(dt, 0.28 * spinFade * spinMul);
      }
    }

    mounts.forEach((m, i) => {
      m.mount.visible = studio.rings;
      const delay = i * 0.09;
      const local = easeOutBack((intro - delay) / Math.max(0.001, 1 - delay));
      if (intro < 1) {
        ringsPosed = false;
        m.mount.rotation.set(
          THREE.MathUtils.lerp(Math.PI / 2, m.rest.x, local),
          THREE.MathUtils.lerp(0, m.rest.y, local),
          THREE.MathUtils.lerp(0, m.rest.z, local),
        );
        m.mount.scale.setScalar(Math.max(0.001, local));
      } else if (!ringsPosed) {
        m.mount.rotation.copy(m.rest);
        m.mount.scale.setScalar(1);
      }
      if (!paused && intro > delay && studio.rings) {
        m.ring.rotateZ(m.spin * dt * spinMul);
      }
    });
    if (intro >= 1) ringsPosed = true;
  };

  return {
    root,
    update,
    resetShow: () => {
      showTime = 0;
    },
  };
}
