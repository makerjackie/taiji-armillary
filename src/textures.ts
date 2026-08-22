import * as THREE from "three";
import {
  DIRECTIONS_8,
  FONT,
  HOU_TIAN,
  JIA_ZI,
  LUO_SHU,
  MANSIONS_28,
  MOUNTAINS_24,
  RING_INSCRIPTIONS,
  SOLAR_TERMS,
} from "./data";

const YANG = "#e6dfd2";
const YIN = "#6e8b9c";

export type PlateKind =
  | "trigram"
  | "names"
  | "luoshu"
  | "directions"
  | "mountains"
  | "terms"
  | "jiazi"
  | "mansions"
  | "ticks"
  | "hexagrams";

export interface PlateSpec {
  name: string;
  inner: number;
  outer: number;
  height: number;
  kind: PlateKind;
  speed: number;
}

export const PLATES: PlateSpec[] = [
  { name: "卦象", inner: 1.22, outer: 1.72, height: 0.1, kind: "trigram", speed: 0.42 },
  { name: "卦名", inner: 1.74, outer: 2.18, height: 0.11, kind: "names", speed: -0.28 },
  { name: "洛书", inner: 2.2, outer: 2.52, height: 0.09, kind: "luoshu", speed: 0.55 },
  { name: "方位", inner: 2.54, outer: 2.92, height: 0.1, kind: "directions", speed: -0.22 },
  { name: "二十四山", inner: 2.94, outer: 3.48, height: 0.13, kind: "mountains", speed: 0.31 },
  { name: "节气", inner: 3.5, outer: 4.02, height: 0.11, kind: "terms", speed: -0.38 },
  { name: "六十甲子", inner: 4.04, outer: 4.62, height: 0.12, kind: "jiazi", speed: 0.26 },
  { name: "二十八宿", inner: 4.64, outer: 5.12, height: 0.1, kind: "mansions", speed: -0.24 },
  { name: "周天", inner: 5.14, outer: 5.48, height: 0.08, kind: "ticks", speed: 0.16 },
  { name: "六十四卦", inner: 5.5, outer: 6.05, height: 0.14, kind: "hexagrams", speed: -0.19 },
];

function clampByte(v: number) {
  return Math.max(0, Math.min(255, v | 0));
}

function grain(ctx: CanvasRenderingContext2D, size: number, amount = 26) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] = clampByte(d[i] + n);
    d[i + 1] = clampByte(d[i + 1] + n * 0.88);
    d[i + 2] = clampByte(d[i + 2] + n * 0.62);
  }
  ctx.putImageData(img, 0, 0);
}

function fillBronze(ctx: CanvasRenderingContext2D, size: number) {
  const g = ctx.createRadialGradient(
    size * 0.38,
    size * 0.32,
    size * 0.05,
    size * 0.5,
    size * 0.52,
    size * 0.72,
  );
  g.addColorStop(0, "#d7b07a");
  g.addColorStop(0.35, "#b07a45");
  g.addColorStop(0.7, "#7a4a28");
  g.addColorStop(1, "#3a2216");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  grain(ctx, size);
}

function embossedFill(ctx: CanvasRenderingContext2D, draw: () => void) {
  ctx.save();
  ctx.shadowColor = "rgba(255, 220, 170, 0.35)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#5a351c";
  draw();
  ctx.shadowColor = "rgba(20, 8, 0, 0.85)";
  ctx.shadowOffsetX = -1;
  ctx.shadowOffsetY = -1;
  ctx.fillStyle = "#2a160c";
  draw();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#3d2414";
  draw();
  ctx.restore();
}

function drawTrigram(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  lines: readonly number[],
) {
  const w = size;
  const lh = size * 0.13;
  const gap = size * 0.16;
  const startY = y + size * 0.32;
  for (let i = 0; i < 3; i++) {
    const ly = startY - i * (lh + gap);
    if (lines[i]) {
      ctx.fillRect(x - w / 2, ly, w, lh);
    } else {
      const broken = w * 0.38;
      ctx.fillRect(x - w / 2, ly, broken, lh);
      ctx.fillRect(x + w / 2 - broken, ly, broken, lh);
    }
  }
}

function drawHexagram(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  n: number,
) {
  const w = size * 0.9;
  const lh = size * 0.07;
  const gap = size * 0.065;
  const startY = y + size * 0.38;
  for (let i = 0; i < 6; i++) {
    const yang = (n >> i) & 1;
    const ly = startY - i * (lh + gap);
    if (yang) {
      ctx.fillRect(x - w / 2, ly, w, lh);
    } else {
      const broken = w * 0.38;
      ctx.fillRect(x - w / 2, ly, broken, lh);
      ctx.fillRect(x + w / 2 - broken, ly, broken, lh);
    }
  }
}

function labelsFor(kind: PlateKind): string[] {
  switch (kind) {
    case "names":
      return HOU_TIAN.map((t) => t.name);
    case "luoshu":
      return LUO_SHU;
    case "directions":
      return DIRECTIONS_8;
    case "mountains":
      return MOUNTAINS_24;
    case "terms":
      return SOLAR_TERMS;
    case "jiazi":
      return JIA_ZI;
    case "mansions":
      return MANSIONS_28;
    default:
      return [];
  }
}

export function createPlateMaps(spec: PlateSpec, size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const bump = document.createElement("canvas");
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext("2d")!;

  ctx.clearRect(0, 0, size, size);
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const outerPx = size / 2 - 2;
  const innerPx = (spec.inner / spec.outer) * outerPx;
  const midPx = (innerPx + outerPx) / 2;
  const ringW = outerPx - innerPx;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerPx, 0, Math.PI * 2);
  ctx.arc(cx, cy, innerPx, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  fillBronze(ctx, size);
  ctx.restore();

  const strokeRing = (c: CanvasRenderingContext2D, r: number, w: number, color: string) => {
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.strokeStyle = color;
    c.lineWidth = w;
    c.stroke();
  };

  strokeRing(ctx, innerPx + 2, 3, "#5c3a22");
  strokeRing(ctx, outerPx - 2, 3, "#5c3a22");
  strokeRing(ctx, innerPx + 2, 1.2, "#e0c08a");
  strokeRing(ctx, outerPx - 2, 1.2, "#e0c08a");

  bctx.strokeStyle = "#3a3a3a";
  bctx.lineWidth = 4;
  bctx.beginPath();
  bctx.arc(cx, cy, innerPx + 2, 0, Math.PI * 2);
  bctx.stroke();
  bctx.beginPath();
  bctx.arc(cx, cy, outerPx - 2, 0, Math.PI * 2);
  bctx.stroke();

  const paintGlyphs = (
    target: CanvasRenderingContext2D,
    forBump: boolean,
    ink?: string,
  ) => {
    const fill = ink ?? (forBump ? "#2a2a2a" : "#2c160c");
    target.save();
    if (spec.kind === "trigram") {
      const count = 8;
      const step = (Math.PI * 2) / count;
      for (let i = 0; i < count; i++) {
        target.save();
        target.translate(cx, cy);
        target.rotate(i * step);
        target.translate(0, -midPx);
        target.rotate(Math.PI);
        target.fillStyle = fill;
        drawTrigram(target, 0, 0, ringW * 0.72, HOU_TIAN[i].lines);
        target.restore();
      }
    } else if (spec.kind === "hexagrams") {
      const count = 64;
      const step = (Math.PI * 2) / count;
      for (let i = 0; i < count; i++) {
        target.save();
        target.translate(cx, cy);
        target.rotate(i * step);
        target.translate(0, -midPx);
        target.rotate(Math.PI);
        target.fillStyle = fill;
        drawHexagram(target, 0, 0, ringW * 0.9, i);
        target.restore();
      }
    } else if (spec.kind === "ticks") {
      const count = 180;
      const step = (Math.PI * 2) / count;
      target.strokeStyle = ink ?? (forBump ? "#333" : "#2c160c");
      for (let i = 0; i < count; i++) {
        target.save();
        target.translate(cx, cy);
        target.rotate(i * step);
        target.beginPath();
        const len = i % 10 === 0 ? ringW * 0.7 : i % 5 === 0 ? ringW * 0.45 : ringW * 0.22;
        target.lineWidth = i % 10 === 0 ? 2.2 : 1.1;
        target.moveTo(0, -outerPx + 4);
        target.lineTo(0, -outerPx + 4 + len);
        target.stroke();
        target.restore();
      }
    } else {
      const items = labelsFor(spec.kind);
      const count = items.length;
      const step = (Math.PI * 2) / count;
      const arc = (Math.PI * 2 * midPx) / count;
      let fontSize = Math.min(ringW * 0.55, arc * 0.78);
      if (spec.kind === "jiazi" || spec.kind === "terms") fontSize *= 0.72;
      fontSize = Math.max(10, Math.min(fontSize, 92));
      target.font = `700 ${fontSize}px ${FONT}`;
      target.textAlign = "center";
      target.textBaseline = "middle";
      target.fillStyle = fill;

      for (let i = 0; i < count; i++) {
        target.save();
        target.translate(cx, cy);
        target.rotate(i * step);
        target.translate(0, -midPx);
        target.rotate(Math.PI);
        const text = items[i];
        if (spec.kind === "jiazi" || spec.kind === "terms") {
          target.fillText(text[0], 0, -fontSize * 0.52);
          target.fillText(text[1], 0, fontSize * 0.52);
        } else {
          target.fillText(text, 0, 0);
        }
        target.restore();
      }
    }

    const divs =
      spec.kind === "jiazi" ? 60 : spec.kind === "hexagrams" ? 64 : spec.kind === "ticks" ? 36 : labelsFor(spec.kind).length || 8;
    for (let i = 0; i < divs; i++) {
      target.save();
      target.translate(cx, cy);
      target.rotate((i + 0.5) * ((Math.PI * 2) / divs));
      target.fillStyle = forBump ? "#4a4a4a" : "#4a2c18";
      target.fillRect(-1, -outerPx + 6, 2, ringW - 12);
      target.restore();
    }
    target.restore();
  };

  if (spec.kind === "trigram" || spec.kind === "hexagrams" || spec.kind === "ticks") {
    ctx.fillStyle = "#2c160c";
    paintGlyphs(ctx, false);
  } else {
    embossedFill(ctx, () => paintGlyphs(ctx, false));
  }
  paintGlyphs(bctx, true);

  const emit = document.createElement("canvas");
  emit.width = size;
  emit.height = size;
  const ectx = emit.getContext("2d")!;
  ectx.fillStyle = "#000000";
  ectx.fillRect(0, 0, size, size);
  paintGlyphs(ectx, false, "#ffd199");

  const map = new THREE.CanvasTexture(canvas);
  const bumpMap = new THREE.CanvasTexture(bump);
  const emissiveMap = new THREE.CanvasTexture(emit);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  bumpMap.anisotropy = 8;
  emissiveMap.anisotropy = 8;
  return { map, bumpMap, emissiveMap };
}

export function createTaijiTexture(size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = YANG;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5, false);
  ctx.fillStyle = YIN;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy - r / 2, r / 2, 0, Math.PI * 2);
  ctx.fillStyle = YANG;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy + r / 2, r / 2, 0, Math.PI * 2);
  ctx.fillStyle = YIN;
  ctx.fill();

  const eye = r / 6.2;
  ctx.beginPath();
  ctx.arc(cx, cy - r / 2, eye, 0, Math.PI * 2);
  ctx.fillStyle = YIN;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy + r / 2, eye, 0, Math.PI * 2);
  ctx.fillStyle = YANG;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#6a4a2a";
  ctx.lineWidth = size * 0.012;
  ctx.stroke();
  ctx.strokeStyle = "#e6c98a";
  ctx.lineWidth = size * 0.004;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function drawLeiwen(ctx: CanvasRenderingContext2D, width: number, y: number, h: number) {
  const unit = h * 1.6;
  ctx.strokeStyle = "#2a150c";
  ctx.lineWidth = Math.max(1.2, h * 0.12);
  ctx.beginPath();
  for (let x = 0; x < width + unit; x += unit) {
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + h * 0.35);
    ctx.lineTo(x + unit * 0.45, y + h * 0.35);
    ctx.lineTo(x + unit * 0.45, y + h * 0.72);
    ctx.lineTo(x + unit * 0.82, y + h * 0.72);
    ctx.lineTo(x + unit * 0.82, y);
  }
  ctx.stroke();
}

export function createTorusInscription(size = [2048, 256] as const) {
  const [w, h] = size;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const bronze = ctx.createLinearGradient(0, 0, 0, h);
  bronze.addColorStop(0, "#5a3218");
  bronze.addColorStop(0.5, "#c9955a");
  bronze.addColorStop(1, "#4a2814");
  ctx.fillStyle = bronze;
  ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d[i] = clampByte(d[i] + n);
    d[i + 1] = clampByte(d[i + 1] + n * 0.88);
    d[i + 2] = clampByte(d[i + 2] + n * 0.62);
  }
  ctx.putImageData(img, 0, 0);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#4a2c18");
  g.addColorStop(0.12, "rgba(0,0,0,0)");
  g.addColorStop(0.88, "rgba(0,0,0,0)");
  g.addColorStop(1, "#4a2c18");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  drawLeiwen(ctx, w, h * 0.08, h * 0.16);
  drawLeiwen(ctx, w, h * 0.76, h * 0.16);

  const items = RING_INSCRIPTIONS;
  const colW = w / items.length;
  const fontSize = Math.min(h * 0.38, colW * 0.7);
  ctx.font = `700 ${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#2a150c";
  items.forEach((text, i) => {
    ctx.fillText(text, (i + 0.5) * colW, h * 0.52);
    ctx.fillRect((i + 1) * colW - 1, h * 0.28, 2, h * 0.44);
  });

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  const bumpMap = map.clone();
  return { map, bumpMap };
}

export function createPetalMaps(size = 768) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  fillBronze(ctx, size);

  ctx.strokeStyle = "#e0c08a";
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, size - 36, size - 36);
  ctx.strokeStyle = "#5c3a22";
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, size - 56, size - 56);
  drawLeiwen(ctx, size, 40, 36);
  drawLeiwen(ctx, size, size - 76, 36);

  ctx.save();
  ctx.translate(size / 2, size * 0.58);
  ctx.fillStyle = "#2c160c";
  drawTrigram(ctx, 0, 0, size * 0.28, HOU_TIAN[0].lines);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(size / 2, size * 0.28, size * 0.08, 0, Math.PI * 2);
  ctx.strokeStyle = "#2c160c";
  ctx.lineWidth = 6;
  ctx.stroke();

  const bump = document.createElement("canvas");
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext("2d")!;
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);
  bctx.strokeStyle = "#2a2a2a";
  bctx.lineWidth = 8;
  bctx.strokeRect(18, 18, size - 36, size - 36);

  const map = new THREE.CanvasTexture(canvas);
  const bumpMap = new THREE.CanvasTexture(bump);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  bumpMap.anisotropy = 8;
  return { map, bumpMap };
}

export function createBronzeMaterial(
  maps?: {
    map?: THREE.Texture;
    bumpMap?: THREE.Texture;
    emissiveMap?: THREE.Texture;
  },
  opts: { transparent?: boolean } = {},
) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: maps?.map ? 0xffffff : 0xb07a45,
    metalness: 0.88,
    roughness: 0.36,
    clearcoat: 0.16,
    clearcoatRoughness: 0.42,
    envMapIntensity: 1.05,
    transparent: opts.transparent ?? false,
    side: THREE.DoubleSide,
  });
  if (maps?.map) mat.map = maps.map;
  if (maps?.bumpMap) {
    mat.bumpMap = maps.bumpMap;
    mat.bumpScale = 0.05;
  }
  if (maps?.emissiveMap) {
    mat.emissive = new THREE.Color(0x6a4824);
    mat.emissiveMap = maps.emissiveMap;
    mat.emissiveIntensity = 0.09;
  }
  return mat;
}
