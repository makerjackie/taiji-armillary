import * as THREE from "three";
import {
  PLATES,
  createBronzeMaterial,
  createPlateMaps,
  createTaijiTexture,
  createTorusInscription,
  type PlateSpec,
} from "./textures";

export interface SpinPart {
  object: THREE.Object3D;
  axis: THREE.Vector3;
  speed: number;
}

function addPivots(
  parent: THREE.Object3D,
  radius: number,
  mat: THREE.Material,
  count = 2,
) {
  const axle = new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10);
  const cap = new THREE.SphereGeometry(0.07, 12, 12);
  const knob = new THREE.CylinderGeometry(0.08, 0.1, 0.08, 12);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    const group = new THREE.Group();
    const rod = new THREE.Mesh(axle, mat);
    rod.rotation.x = Math.PI / 2;
    const ball = new THREE.Mesh(cap, mat);
    ball.position.z = 0.22;
    const end = new THREE.Mesh(knob, mat);
    end.rotation.x = Math.PI / 2;
    end.position.z = 0.28;
    group.add(rod, ball, end);
    group.position.set(x, y, 0);
    group.lookAt(0, 0, 0);
    parent.add(group);
  }
}

function createLatticeRing(
  radius: number,
  width: number,
  mat: THREE.Material,
  bars = 48,
) {
  const group = new THREE.Group();
  const tube = 0.045;
  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(radius + width / 2, tube, 12, 180),
    mat,
  );
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(radius - width / 2, tube, 12, 180),
    mat,
  );
  const top = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 10, 160),
    mat,
  );
  top.scale.z = 0.2;
  top.position.z = 0.07;
  const bot = top.clone();
  bot.position.z = -0.07;
  group.add(outer, inner, top, bot);

  const barGeo = new THREE.BoxGeometry(width, 0.038, 0.038);
  const rivetGeo = new THREE.SphereGeometry(0.028, 8, 8);
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * Math.PI * 2;
    const bar = new THREE.Mesh(barGeo, mat);
    bar.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    bar.rotation.z = a;
    group.add(bar);
    if (i % 2 === 0) {
      const rivet = new THREE.Mesh(rivetGeo, mat);
      rivet.position.set(
        Math.cos(a) * (radius + width / 2),
        Math.sin(a) * (radius + width / 2),
        0.04,
      );
      group.add(rivet);
    }
  }
  return group;
}

function createSolidRing(
  radius: number,
  tube: number,
  maps: { map: THREE.Texture; bumpMap: THREE.Texture },
  repeat = 1,
) {
  const group = new THREE.Group();
  const map = maps.map.clone();
  const bump = maps.bumpMap.clone();
  map.wrapS = THREE.RepeatWrapping;
  bump.wrapS = THREE.RepeatWrapping;
  map.repeat.set(repeat, 1);
  bump.repeat.set(repeat, 1);
  const mat = createBronzeMaterial({ map, bumpMap: bump });
  mat.side = THREE.FrontSide;
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 18, 192),
    mat,
  );
  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube * 0.45, 10, 160),
    createBronzeMaterial(),
  );
  inner.scale.set(1, 1, 1.35);
  group.add(mesh, inner);

  const beadGeo = new THREE.SphereGeometry(tube * 0.62, 10, 10);
  const beadMat = createBronzeMaterial();
  const n = Math.max(24, Math.floor(radius * 10));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const bead = new THREE.Mesh(beadGeo, beadMat);
    bead.position.set(Math.cos(a) * radius, Math.sin(a) * radius, tube * 0.55);
    group.add(bead);
  }
  addPivots(group, radius, beadMat, 4);
  return group;
}

function createPlate(spec: PlateSpec, y: number) {
  const group = new THREE.Group();
  const maps = createPlateMaps(spec);
  const topMat = createBronzeMaterial(maps, { transparent: true });
  const sideMat = createBronzeMaterial();

  const top = new THREE.Mesh(
    new THREE.RingGeometry(spec.inner, spec.outer, 128),
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

  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(spec.outer, 0.018, 8, 96),
    sideMat,
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = spec.height / 2;

  group.add(top, bottom, outerWall, innerWall, lip);
  group.position.y = y;
  group.userData.speed = spec.speed;
  return group;
}

function createTaiji(radius: number) {
  const group = new THREE.Group();
  const h = 0.16;
  const tex = createTaijiTexture();
  const topMat = new THREE.MeshPhysicalMaterial({
    map: tex,
    metalness: 0.08,
    roughness: 0.52,
    clearcoat: 0.22,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.45,
    emissive: new THREE.Color(0x1a2430),
    emissiveIntensity: 0.08,
  });
  const sideMat = createBronzeMaterial();
  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, h, 64),
    [sideMat, topMat, sideMat],
  );
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.04, 12, 80),
    sideMat,
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = h / 2;
  group.add(disk, rim);
  group.position.y = 0.12;
  group.userData.speed = 0.22;
  return group;
}

function createNeedles(mat: THREE.Material) {
  const group = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.016, 0.016, 1.35, 8);
  const tips = new THREE.ConeGeometry(0.038, 0.16, 8);
  const placements: Array<[number, number, number, number, number, number]> = [
    [0, 7.05, 0, 0, 0, 0],
    [0, -7.05, 0, 0, 0, 0],
    [7.05, 0, 0, 0, 0, Math.PI / 2],
    [-7.05, 0, 0, 0, 0, Math.PI / 2],
    [0, 0, 7.05, Math.PI / 2, 0, 0],
    [0, 0, -7.05, Math.PI / 2, 0, 0],
  ];
  for (const [x, y, z, rx, ry, rz] of placements) {
    const g = new THREE.Group();
    const rod = new THREE.Mesh(geo, mat);
    const t1 = new THREE.Mesh(tips, mat);
    t1.position.y = 0.72;
    g.add(rod, t1);
    g.position.set(x, y, z);
    g.rotation.set(rx, ry, rz);
    group.add(g);
  }
  return group;
}

export function createArtifact(): { root: THREE.Group; spinning: SpinPart[] } {
  const root = new THREE.Group();
  const spinning: SpinPart[] = [];
  const bronze = createBronzeMaterial();
  const torusMaps = createTorusInscription();

  const luopan = new THREE.Group();
  luopan.add(createTaiji(1.18));
  PLATES.forEach((spec, i) => {
    const plate = createPlate(spec, 0.02 + i * 0.012);
    luopan.add(plate);
    spinning.push({
      object: plate,
      axis: new THREE.Vector3(0, 1, 0),
      speed: spec.speed,
    });
  });
  spinning.push({
    object: luopan.children[0],
    axis: new THREE.Vector3(0, 1, 0),
    speed: 0.22,
  });
  root.add(luopan);

  const equatorMount = new THREE.Group();
  equatorMount.rotation.x = Math.PI / 2;
  const equator = createSolidRing(6.42, 0.16, torusMaps, 1);
  equator.scale.z = 0.38;
  equatorMount.add(equator);
  root.add(equatorMount);
  spinning.push({
    object: equator,
    axis: new THREE.Vector3(0, 0, 1),
    speed: 0.05,
  });

  const orbits: Array<{
    r: number;
    tube: number;
    rot: [number, number, number];
    speed: number;
    lattice?: boolean;
    width?: number;
  }> = [
    { r: 6.72, tube: 0.07, rot: [0, 0, 0], speed: 0.11 },
    { r: 6.95, tube: 0.062, rot: [0.72, 0.15, 0.35], speed: -0.1 },
    { r: 7.18, tube: 0.058, rot: [1.05, -0.55, 0.4], speed: 0.08 },
    {
      r: 7.42,
      tube: 0.05,
      rot: [0.4, 1.05, -0.55],
      speed: -0.13,
      lattice: true,
      width: 0.2,
    },
    {
      r: 7.68,
      tube: 0.048,
      rot: [1.25, 0.85, 0.2],
      speed: 0.06,
      lattice: true,
      width: 0.16,
    },
  ];

  for (const o of orbits) {
    const mount = new THREE.Group();
    mount.rotation.set(...o.rot);
    const ring = o.lattice
      ? createLatticeRing(o.r, o.width ?? 0.2, bronze)
      : createSolidRing(o.r, o.tube, torusMaps, 1);
    mount.add(ring);
    root.add(mount);
    spinning.push({
      object: ring,
      axis: new THREE.Vector3(0, 0, 1),
      speed: o.speed,
    });
  }

  const needles = createNeedles(bronze);
  root.add(needles);
  spinning.push({
    object: needles,
    axis: new THREE.Vector3(0, 1, 0),
    speed: 0.04,
  });

  return { root, spinning };
}

export function createStarfield() {
  const count = 2800;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 40 + Math.random() * 80;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    const warm = 0.75 + Math.random() * 0.25;
    col[i * 3] = warm;
    col[i * 3 + 1] = warm * 0.9;
    col[i * 3 + 2] = warm * 0.7;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
}
