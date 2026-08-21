import * as THREE from "three";

export function easeOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

export function easeInOutCubic(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function easeOutBack(t: number) {
  const x = Math.min(1, Math.max(0, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

export function createStarfield() {
  const count = 2400;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 48 + Math.random() * 90;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
    const warm = 0.62 + Math.random() * 0.28;
    col[i * 3] = warm;
    col[i * 3 + 1] = warm * 0.9;
    col[i * 3 + 2] = warm * 0.74;
    seed[i] = Math.random() * Math.PI * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    }),
  );
  stars.userData.seed = seed;
  stars.userData.base = col.slice();
  return stars;
}

export function twinkleStars(stars: THREE.Points, t: number) {
  const seed = stars.userData.seed as Float32Array;
  const base = stars.userData.base as Float32Array;
  const col = stars.geometry.attributes.color as THREE.BufferAttribute;
  const arr = col.array as Float32Array;
  for (let i = 0; i < seed.length; i++) {
    const k = 0.72 + 0.28 * Math.sin(t * 0.9 + seed[i]);
    arr[i * 3] = base[i * 3] * k;
    arr[i * 3 + 1] = base[i * 3 + 1] * k;
    arr[i * 3 + 2] = base[i * 3 + 2] * k;
  }
  col.needsUpdate = true;
}
