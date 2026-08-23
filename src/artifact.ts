import * as THREE from "three";
import {
  PLATES,
  createBronzeMaterial,
  createPlateMaps,
  createTorusInscription,
  type PlateSpec,
} from "./textures";
import { easeOutBack, easeOutCubic } from "./fx";
import type { Studio } from "./studio";
import type { LayerId } from "./data";

interface Mount {
  mount: THREE.Group;
  ring: THREE.Group;
  rest: THREE.Euler;
  spin: number;
}

export interface Artifact {
  root: THREE.Group;
  update: (t: number, dt: number, intro: number, paused: boolean, studio: Studio) => void;
  pick: (raycaster: THREE.Raycaster) => LayerId | null;
  setFocus: (id: LayerId | null) => void;
  layerRadius: (id: LayerId) => number;
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
  group.userData.kind = "plate";
  group.userData.name = spec.name;
  group.userData.speed = spec.speed;
  group.userData.baseY = y;
  group.userData.inner = spec.inner;
  group.userData.outer = spec.outer;
  group.userData.height = spec.height;
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
  group.userData.kind = "core";
  return group;
}

function createNeedle() {
  const group = new THREE.Group();
  const north = new THREE.MeshPhysicalMaterial({
    color: 0x7a2c24,
    metalness: 0.72,
    roughness: 0.38,
  });
  const south = new THREE.MeshPhysicalMaterial({
    color: 0x2a221c,
    metalness: 0.78,
    roughness: 0.42,
  });
  const n = new THREE.Mesh(new THREE.ConeGeometry(0.042, 1.02, 10), north);
  n.rotation.x = Math.PI / 2;
  n.position.z = 0.5;
  const s = new THREE.Mesh(new THREE.ConeGeometry(0.042, 1.02, 10), south);
  s.rotation.x = -Math.PI / 2;
  s.position.z = -0.5;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), createInlay());
  const hair = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.012, 2.15),
    new THREE.MeshPhysicalMaterial({
      color: 0x6b241c,
      metalness: 0.45,
      roughness: 0.48,
    }),
  );
  hair.position.y = -0.16;
  group.add(hair, n, s, cap);
  group.position.y = 0.38;
  group.userData.kind = "core";
  group.userData.ignorePick = false;
  return group;
}

function layerFrom(obj: THREE.Object3D | null): LayerId | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData.kind === "plate") return cur.userData.index as number;
    if (cur.userData.kind === "core") return "core";
    cur = cur.parent;
  }
  return null;
}

function radiusToLayer(r: number): LayerId | null {
  if (r < 1.22) return "core";
  for (let i = 0; i < PLATES.length; i++) {
    const spec = PLATES[i];
    if (r >= spec.inner - 0.03 && r <= spec.outer + 0.03) return i;
  }
  if (r < 8.4) return "rings";
  return null;
}

export function createArtifact(): Artifact {
  const root = new THREE.Group();
  const bronze = createBronzeMaterial();
  const torusMaps = createTorusInscription();
  const mounts: Mount[] = [];

  const luopan = new THREE.Group();
  const taiji = createTaiji(1.14);
  const needle = createNeedle();
  luopan.add(taiji, needle);
  const plates: THREE.Group[] = [];
  PLATES.forEach((spec, i) => {
    const rise = 0.018 * (PLATES.length - i);
    const plate = createPlate(spec, rise);
    plate.userData.index = i;
    plates.push(plate);
    luopan.add(plate);
  });
  root.add(luopan);

  const bandMat = new THREE.MeshBasicMaterial({
    color: 0xffe2a8,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const band = new THREE.Mesh(new THREE.RingGeometry(1, 1.2, 160), bandMat);
  band.rotation.x = -Math.PI / 2;
  band.renderOrder = 10;
  band.visible = false;
  band.userData.ignorePick = true;
  const rimMat = createInlay();
  const rimIn = new THREE.Mesh(new THREE.TorusGeometry(1, 0.018, 8, 96), rimMat);
  const rimOut = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.018, 8, 96), rimMat);
  rimIn.rotation.x = Math.PI / 2;
  rimOut.rotation.x = Math.PI / 2;
  rimIn.visible = false;
  rimOut.visible = false;
  rimIn.userData.ignorePick = true;
  rimOut.userData.ignorePick = true;
  luopan.add(band, rimIn, rimOut);

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

  let ringsPosed = false;
  let focused: LayerId | null = null;
  let bandId: LayerId | null | undefined;
  let foldShow = 0;
  const lockAngle = { y: 0 };
  const localHit = new THREE.Vector3();

  const showBand = (inner: number, outer: number, y: number) => {
    band.geometry.dispose();
    band.geometry = new THREE.RingGeometry(inner, outer, 160);
    band.position.y = y;
    band.visible = true;
    rimIn.geometry.dispose();
    rimOut.geometry.dispose();
    rimIn.geometry = new THREE.TorusGeometry(inner, 0.018, 8, 80);
    rimOut.geometry = new THREE.TorusGeometry(outer, 0.02, 8, 96);
    rimIn.position.y = y;
    rimOut.position.y = y;
    rimIn.visible = true;
    rimOut.visible = true;
  };

  const hideBand = () => {
    band.visible = false;
    rimIn.visible = false;
    rimOut.visible = false;
  };

  const layoutBand = () => {
    if (focused === bandId) return;
    bandId = focused;
    luopan.add(band, rimIn, rimOut);
    if (typeof focused === "number") {
      const plate = plates[focused];
      plate.add(band, rimIn, rimOut);
      showBand(
        plate.userData.inner as number,
        plate.userData.outer as number,
        (plate.userData.height as number) / 2 + 0.04,
      );
    } else if (focused === "core") {
      showBand(0.08, 1.2, 0.3);
    } else if (focused === "rings") {
      showBand(6.28, 6.52, 0.08);
    } else {
      hideBand();
    }
  };

  const update = (
    t: number,
    dt: number,
    intro: number,
    paused: boolean,
    studio: Studio,
  ) => {
    const spinMul = studio.spin;
    luopan.scale.setScalar(Math.max(0.001, easeOutCubic(intro / 0.28)));
    foldShow = THREE.MathUtils.damp(foldShow, studio.fold, 5.5, dt);
    bandMat.opacity = 0.28 + 0.12 * (0.5 + 0.5 * Math.sin(t * 3.2));
    layoutBand();

    plates.forEach((plate, i) => {
      const on = focused === i;
      const faded = focused !== null && focused !== "rings" && !on;
      plate.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshPhysicalMaterial | undefined;
        if (!mat || Array.isArray(mesh.material) || mat.opacity === undefined) return;
        mat.transparent = faded;
        mat.opacity = faded ? 0.4 : 1;
      });
    });

    if (!paused) {
      needle.rotation.y =
        Math.sin(t * 1.35) * 0.028 + Math.sin(t * 0.41) * 0.016;
      lockAngle.y += 0.22 * dt * spinMul;
      plates.forEach((plate, i) => {
        if (studio.counter) {
          plate.rotation.y += PLATES[i].speed * dt * spinMul;
        } else {
          plate.rotation.y = lockAngle.y;
        }
      });
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
      } else {
        if (!ringsPosed) {
          m.mount.scale.setScalar(1);
        }
        m.mount.rotation.set(
          THREE.MathUtils.lerp(m.rest.x, Math.PI / 2, foldShow),
          THREE.MathUtils.lerp(m.rest.y, 0, foldShow),
          THREE.MathUtils.lerp(m.rest.z, 0, foldShow),
        );
      }
      if (!paused && intro > delay && studio.rings) {
        m.ring.rotateZ(m.spin * dt * spinMul * (1 - foldShow * 0.7));
      }
    });
    if (intro >= 1) ringsPosed = true;
  };

  const pick = (raycaster: THREE.Raycaster) => {
    const hits = raycaster.intersectObject(root, true);
    for (const hit of hits) {
      if (hit.object.userData.ignorePick) continue;
      localHit.copy(hit.point);
      luopan.worldToLocal(localHit);
      if (Math.abs(localHit.y) < 0.9) {
        const byRadius = radiusToLayer(Math.hypot(localHit.x, localHit.z));
        if (byRadius !== null) return byRadius;
      }
      const fromObj = layerFrom(hit.object);
      if (fromObj !== null) return fromObj;
    }
    if (hits.length) return "rings";
    return null;
  };

  const layerRadius = (id: LayerId) => {
    if (id === "core") return 1.05;
    if (id === "rings") return 7.2;
    const spec = PLATES[id];
    return (spec.inner + spec.outer) / 2;
  };

  return {
    root,
    update,
    pick,
    setFocus: (id) => {
      focused = id;
    },
    layerRadius,
  };
}
