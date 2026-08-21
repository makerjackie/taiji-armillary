import * as THREE from "three";
import {
  PLATES,
  createBronzeMaterial,
  createPlateMaps,
  createTorusInscription,
  type PlateSpec,
} from "./textures";
import { easeOutBack, easeOutCubic } from "./fx";

interface Mount {
  mount: THREE.Group;
  ring: THREE.Group;
  rest: THREE.Euler;
  spin: number;
}

export interface Artifact {
  root: THREE.Group;
  update: (t: number, dt: number, intro: number, paused: boolean) => void;
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
    color: 0xe7e0d2,
    metalness: 0.08,
    roughness: 0.28,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    emissive: new THREE.Color(0xf2ead8),
    emissiveIntensity: 0.06,
  });
  const yinMat = new THREE.MeshPhysicalMaterial({
    color: 0x5f7d90,
    metalness: 0.16,
    roughness: 0.34,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    emissive: new THREE.Color(0x1c3340),
    emissiveIntensity: 0.05,
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
    new THREE.TorusGeometry(r + 0.04, 0.038, 12, 80),
    createInlay(),
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
  PLATES.forEach((spec, i) => {
    const rise = 0.018 * (PLATES.length - i);
    luopan.add(createPlate(spec, rise));
  });
  root.add(luopan);

  const coreLight = new THREE.PointLight(0xffe0b8, 2.2, 12, 1.8);
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
    { r: 6.38, w: 0.28, h: 0.16, rot: [Math.PI / 2, 0, 0], speed: 0.045, maps: true },
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

  const update = (_t: number, dt: number, intro: number, paused: boolean) => {
    luopan.scale.setScalar(Math.max(0.001, easeOutCubic(intro / 0.28)));
    if (!paused) taiji.rotation.y += 0.18 * dt;

    PLATES.forEach((spec, i) => {
      const plate = luopan.children[i + 1];
      if (!paused) plate.rotation.y += spec.speed * dt;
    });

    mounts.forEach((m, i) => {
      const delay = i * 0.09;
      const local = easeOutBack((intro - delay) / Math.max(0.001, 1 - delay));
      if (intro < 1) {
        m.mount.rotation.set(
          THREE.MathUtils.lerp(Math.PI / 2, m.rest.x, local),
          THREE.MathUtils.lerp(0, m.rest.y, local),
          THREE.MathUtils.lerp(0, m.rest.z, local),
        );
        m.mount.scale.setScalar(Math.max(0.001, local));
      }
      if (!paused && intro > delay) m.ring.rotateZ(m.spin * dt);
    });
  };

  return { root, update };
}
