import * as THREE from "three";
import { FONT } from "./data";

function clampByte(v: number) {
  return Math.max(0, Math.min(255, v | 0));
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
  g.addColorStop(1, "#3a2214");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d[i] = clampByte(d[i] + n);
    d[i + 1] = clampByte(d[i + 1] + n * 0.88);
    d[i + 2] = clampByte(d[i + 2] + n * 0.62);
  }
  ctx.putImageData(img, 0, 0);
}

function clipRing(
  ctx: CanvasRenderingContext2D,
  size: number,
  inner: number,
  outer: number,
) {
  const cx = size / 2;
  const cy = size / 2;
  const outerPx = size / 2 - 2;
  const innerPx = (inner / outer) * outerPx;
  ctx.beginPath();
  ctx.arc(cx, cy, outerPx, 0, Math.PI * 2);
  ctx.arc(cx, cy, innerPx, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  return { cx, cy, innerPx, outerPx, mid: (innerPx + outerPx) / 2 };
}

function toTex(canvas: HTMLCanvasElement, bump: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(canvas);
  const bumpMap = new THREE.CanvasTexture(bump);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  bumpMap.anisotropy = 8;
  return { map, bumpMap };
}

export function createMeanderMaps(inner: number, outer: number, size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  const { cx, cy, innerPx, outerPx, mid } = clipRing(ctx, size, inner, outer);
  fillBronze(ctx, size);
  ctx.restore();

  const unit = (outerPx - innerPx) * 0.72;
  const count = Math.max(24, Math.floor((Math.PI * 2 * mid) / (unit * 1.8)));
  ctx.strokeStyle = "#2a150c";
  ctx.lineWidth = Math.max(2.2, unit * 0.12);
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / count) * Math.PI * 2);
    ctx.translate(0, -mid);
    const s = unit;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, s * 0.35);
    ctx.lineTo(-s * 0.7, -s * 0.35);
    ctx.lineTo(-s * 0.15, -s * 0.35);
    ctx.lineTo(-s * 0.15, s * 0.05);
    ctx.lineTo(s * 0.15, s * 0.05);
    ctx.lineTo(s * 0.15, -s * 0.35);
    ctx.lineTo(s * 0.7, -s * 0.35);
    ctx.lineTo(s * 0.7, s * 0.35);
    ctx.stroke();
    ctx.restore();
  }

  const bump = document.createElement("canvas");
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext("2d")!;
  bctx.fillStyle = "#777";
  bctx.fillRect(0, 0, size, size);
  return toTex(canvas, bump);
}

export function createDotMaps(inner: number, outer: number, size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  const { cx, cy, mid } = clipRing(ctx, size, inner, outer);
  fillBronze(ctx, size);
  ctx.restore();
  const n = 72;
  ctx.fillStyle = "#2a150c";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(a) * mid, cy - Math.cos(a) * mid, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const bump = document.createElement("canvas");
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext("2d")!;
  bctx.fillStyle = "#777";
  bctx.fillRect(0, 0, size, size);
  return toTex(canvas, bump);
}

export function createWuXingMaps(inner: number, outer: number, size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  const { cx, cy, innerPx, outerPx, mid } = clipRing(ctx, size, inner, outer);
  fillBronze(ctx, size);
  ctx.restore();
  const names = ["木", "火", "土", "金", "水"];
  const fontSize = Math.min((outerPx - innerPx) * 0.55, 96);
  ctx.font = `700 ${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#2a150c";
  names.forEach((name, i) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 5) * Math.PI * 2);
    ctx.translate(0, -mid);
    ctx.rotate(Math.PI);
    ctx.fillText(name, 0, 0);
    ctx.restore();
  });
  const bump = document.createElement("canvas");
  bump.width = size;
  bump.height = size;
  const bctx = bump.getContext("2d")!;
  bctx.fillStyle = "#777";
  bctx.fillRect(0, 0, size, size);
  return toTex(canvas, bump);
}
