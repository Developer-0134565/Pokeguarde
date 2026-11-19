// PG-06: comprobaciones técnicas puras del visor (sin navegador, sin sprites reales).
import {
  alphaDigest,
  autoTier,
  crop,
  frameRects,
  GBC16,
  GBC4,
  quantize,
  resizeNearest,
  scaleForTier,
  usedColorCount,
  type Img,
} from "../apps/web/src/sprite-render.ts";

let checks = 0;
const ok = (name: string, cond: boolean) => {
  checks++;
  if (!cond) throw new Error(`FALLO: ${name}`);
  console.log(`  ok  ${name}`);
};

// Hoja sintética 256x256: 16 celdas de 64 con un bloque visible desplazado.
const W = 256;
const data = new Uint8ClampedArray(W * W * 4);
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 4; col++) {
    if (row === 3 && col === 3) continue; // celda vacía a propósito
    for (let y = 4 + row; y < 24 + row; y++) {
      for (let x = 6 + col; x < 26 + col; x++) {
        const i = ((row * 64 + y) * W + col * 64 + x) * 4;
        data[i] = 100; data[i + 1] = 200; data[i + 2] = 40; data[i + 3] = 255;
      }
    }
  }
}
// Un hueco dentro de la celda 1 cambia la silueta sin cambiar su bbox.
const hole = (10 * W + (64 + 10)) * 4 + 3;
data[hole] = 0;
const img: Img = { width: W, height: W, data };
const rects = frameRects(img, 64, 64);

ok("16 rectángulos medidos", rects.length === 16);
ok("rectángulo visible 20x20", rects[0].w === 20 && rects[0].h === 20);
ok("coordenadas absolutas por celda", rects[5].x === 64 * 1 + 6 + 1 && rects[5].y === 64 * 1 + 4 + 1);
ok("celda vacía detectada", rects[15].w === 0 && rects[15].h === 0);
ok("digest alfa es estable", alphaDigest(img, rects[0]) === alphaDigest(img, rects[0]));
ok("digest alfa distingue siluetas", alphaDigest(img, rects[0]) !== alphaDigest(img, rects[1]));

const scaled = scaleForTier({ w: 20, h: 20 }, 40);
ok("tier 40 conserva altura", scaled.h === 40);
ok("tier 40 conserva proporción", scaled.w === 40);
const wide = scaleForTier({ w: 40, h: 20 }, 16);
ok("escala ancha proporcional", wide.w === 32 && wide.h === 16);

const resized = resizeNearest({ width: 2, height: 2, data: Uint8ClampedArray.from([1,2,3,255, 4,5,6,255, 7,8,9,255, 10,11,12,255]) }, 4, 4);
ok("nearest-neighbor produce 4x4", resized.width === 4 && resized.height === 4 && resized.data.length === 64);
ok("nearest-neighbor conserva alfa", resized.data[3] === 255 && resized.data[63] === 255);

const q4 = quantize({ width: 1, height: 1, data: Uint8ClampedArray.from([104,208,120,255]) }, GBC4);
ok("paleta 4 usa solo colores GBC4", GBC4.some((p) => p[0] === q4.data[0] && p[1] === q4.data[1] && p[2] === q4.data[2]));
ok("paleta 4 mantiene alfa", q4.data[3] === 255);
const q16 = quantize({ width: 1, height: 1, data: Uint8ClampedArray.from([104,208,120,255]) }, GBC16);
ok("paleta 16 usa solo colores derivados", GBC16.some((p) => p[0] === q16.data[0] && p[1] === q16.data[1] && p[2] === q16.data[2]));
ok("GBC16 tiene 16 tonos únicos", new Set(GBC16.map((p) => p.join(","))).size === 16);
ok("recuento de tonos usados ignora transparencia", usedColorCount(q16) === 1);
const twoTones = quantize({ width: 2, height: 1, data: Uint8ClampedArray.from([15,56,15,255, 200,32,32,255]) }, GBC16);
ok("recuento distingue dos tonos cuantizados", usedColorCount(twoTones) === 2);
ok("transparencia se preserva", quantize({ width: 1, height: 1, data: Uint8ClampedArray.from([9,9,9,0]) }, GBC4).data[3] === 0);

ok("tier automático 0.3 m -> 16", autoTier(0.3) === 16);
ok("tier automático 1.2 m -> 40", autoTier(1.2) === 40);
ok("tier automático 8.8 m -> 64", autoTier(8.8) === 64);

// Las cuatro categorías escalan desde el alfa y conservan la proporción.
for (const tier of [16, 24, 40, 64] as const) {
  const s = scaleForTier({ w: 24, h: 36 }, tier);
  ok(`tier ${tier} conserva la altura visible`, s.h === tier);
  ok(`tier ${tier} conserva la proporción (24x36)`, s.w === Math.round((24 * tier) / 36));
}

// Hojas no cuadradas: 128x192 con celdas 32x48 y 208x208 con celdas 52x52.
function sheetWithBlocks(w: number, h: number, cellW: number, cellH: number): Img {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      for (let y = 5; y < 23; y++) {
        for (let x = 3; x < 15; x++) {
          const i = ((row * cellH + y) * w + col * cellW + x) * 4;
          d[i] = 104; d[i + 1] = 208; d[i + 2] = 40; d[i + 3] = 255;
        }
      }
    }
  }
  return { width: w, height: h, data: d };
}
const odd = sheetWithBlocks(128, 192, 32, 48);
const oddRects = frameRects(odd, 32, 48);
ok("hoja 128x192 produce 16 rectángulos", oddRects.length === 16);
ok("celda no cuadrada usa cellH real", oddRects[5].y === 48 + 5 && oddRects[5].h === 18);
ok("rectángulo no se sale de la hoja 128x192", oddRects.every((r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= 128 && r.y + r.h <= 192));
const sheet208 = sheetWithBlocks(208, 208, 52, 52);
const wideRects = frameRects(sheet208, 52, 52);
ok("hoja 208x208 produce 16 rectángulos", wideRects.length === 16);
ok("última celda 52x52 no se recorta", wideRects[15].x === 3 * 52 + 3 && wideRects[15].x + wideRects[15].w <= 208);
ok("todas las celdas no cuadradas tienen píxeles visibles", oddRects.every((r) => r.w > 0 && r.h > 0 && crop(odd, r).data.length === r.w * r.h * 4));
ok("animación de 16 frames sin celdas vacías", wideRects.every((r) => r.w === 12 && r.h === 18));

console.log(`PG-06 viewer-check: ${checks} comprobaciones correctas.`);
