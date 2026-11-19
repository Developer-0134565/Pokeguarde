// PG-06: utilidades puras de renderizado de sprites overworld.
// Aislado de la Guardería: este archivo no importa pet-engine, nursery, i18n ni API.
// Las funciones son deterministas y se prueban en `scripts/pg06-viewer-check.ts`.

export type Rect = { x: number; y: number; w: number; h: number };
export type RGB = readonly [number, number, number];
export type PaletteMode = "rgba" | "gbc4" | "gbc16";
export type Img = { width: number; height: number; data: Uint8ClampedArray };

/** Paleta GBC de cuatro tonos, la misma que usa el renderer funcional. */
export const GBC4: RGB[] = [
  [0x0f, 0x38, 0x0f],
  [0x30, 0x62, 0x30],
  [0x8b, 0xac, 0x0f],
  [0x9b, 0xbc, 0x0f],
];

/**
 * Paleta de 16 tonos derivada de GBC4 (4 bases x 4 niveles). Es una
 * aproximación determinista para el visor, NO una paleta oficial.
 *
 * "16" es el tamaño de la paleta, no el número de colores que aparecen en cada
 * sprite: el cuantizador elige el tono más cercano por distancia RGB al cuadrado
 * y las paletas originales están concentradas en pocas zonas de color. Por eso
 * en la práctica se usan 5-8 de los 16 tonos (Electrode: 7-8 según el recuento).
 */
export const GBC16: RGB[] = (() => {
  const levels = [0.45, 0.7, 1, 1.2];
  const out: RGB[] = [];
  for (const base of GBC4) {
    for (const k of levels) {
      out.push([
        Math.min(255, Math.round(base[0] * k)),
        Math.min(255, Math.round(base[1] * k)),
        Math.min(255, Math.round(base[2] * k)),
      ] as RGB);
    }
  }
  return out;
})();

export function paletteOf(mode: PaletteMode): RGB[] | null {
  if (mode === "gbc4") return GBC4;
  if (mode === "gbc16") return GBC16;
  return null;
}

const clampByte = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/**
 * Mide, para cada una de las 16 celdas, el rectángulo mínimo que contiene
 * píxeles visibles (alfa > 8). Las coordenadas devueltas son absolutas dentro
 * del spritesheet. Una celda vacía devuelve w=h=0.
 */
export function frameRects(img: Img, cellW: number, cellH: number): Rect[] {
  const rects: Rect[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x0 = col * cellW;
      const y0 = row * cellH;
      let minX = cellW;
      let minY = cellH;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < cellH; y++) {
        const sy = y0 + y;
        if (sy >= img.height) break;
        for (let x = 0; x < cellW; x++) {
          const sx = x0 + x;
          if (sx >= img.width) break;
          const a = img.data[(sy * img.width + sx) * 4 + 3];
          if (a > 8) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      rects.push(
        maxX < 0
          ? { x: x0, y: y0, w: 0, h: 0 }
          : { x: x0 + minX, y: y0 + minY, w: maxX - minX + 1, h: maxY - minY + 1 },
      );
    }
  }
  return rects;
}

/** Recorta un rectángulo del sheet a un buffer RGBA independiente. */
export function crop(img: Img, r: Rect): Img {
  if (r.w <= 0 || r.h <= 0) return { width: 0, height: 0, data: new Uint8ClampedArray(0) };
  const data = new Uint8ClampedArray(r.w * r.h * 4);
  for (let y = 0; y < r.h; y++) {
    const sy = r.y + y;
    for (let x = 0; x < r.w; x++) {
      const s = (sy * img.width + r.x + x) * 4;
      const d = (y * r.w + x) * 4;
      data[d] = img.data[s];
      data[d + 1] = img.data[s + 1];
      data[d + 2] = img.data[s + 2];
      data[d + 3] = img.data[s + 3];
    }
  }
  return { width: r.w, height: r.h, data };
}

/** Huella FNV-1a de los canales alfa; sirve para comparar normal vs. shiny. */
export function alphaDigest(img: Img, r: Rect): string {
  let h = 0x811c9dc5;
  if (r.w <= 0 || r.h <= 0) return "empty";
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const a = img.data[((r.y + y) * img.width + r.x + x) * 4 + 3];
      h ^= a;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
  }
  return h.toString(16).padStart(8, "0");
}

/** Escala para un tier: altura objetivo medida sobre el alfa, ancho proporcional. */
export function scaleForTier(visible: { w: number; h: number }, tier: number) {
  const h = Math.max(1, visible.h);
  const factor = tier / h;
  return {
    factor,
    w: Math.max(1, Math.round(visible.w * factor)),
    h: Math.max(1, Math.round(visible.h * factor)),
  };
}

/** Redimensionado nearest-neighbor puro, sin depender del navegador. */
export function resizeNearest(src: Img, dw: number, dh: number): Img {
  const data = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(src.height - 1, Math.floor(((y + 0.5) * src.height) / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(src.width - 1, Math.floor(((x + 0.5) * src.width) / dw));
      const s = (sy * src.width + sx) * 4;
      const d = (y * dw + x) * 4;
      data[d] = src.data[s];
      data[d + 1] = src.data[s + 1];
      data[d + 2] = src.data[s + 2];
      data[d + 3] = src.data[s + 3];
    }
  }
  return { width: dw, height: dh, data };
}

/** Cuantiza a la paleta dada; el alfa se conserva binarizado. */
export function quantize(src: Img, palette: RGB[]): Img {
  const data = new Uint8ClampedArray(src.data.length);
  for (let i = 0; i < src.data.length; i += 4) {
    const a = src.data[i + 3] > 8 ? 255 : 0;
    let best = 0;
    let bestD = Infinity;
    for (let p = 0; p < palette.length; p++) {
      const dr = src.data[i] - palette[p][0];
      const dg = src.data[i + 1] - palette[p][1];
      const db = src.data[i + 2] - palette[p][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    data[i] = clampByte(palette[best][0]);
    data[i + 1] = clampByte(palette[best][1]);
    data[i + 2] = clampByte(palette[best][2]);
    data[i + 3] = a;
  }
  return { width: src.width, height: src.height, data };
}

/**
 * Cuenta los colores RGB distintos de los píxeles opacos de un frame ya
 * preparado. Sirve para explicar cuántos tonos de una paleta se usan realmente.
 */
export function usedColorCount(img: Img): number {
  const seen = new Set<number>();
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i + 3] <= 8) continue;
    seen.add((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]);
  }
  return seen.size;
}

/** Prepara el frame exacto para pintar: recorte -> paleta -> escala entera. */
export function prepareFrame(
  sheet: Img,
  r: Rect,
  tier: number,
  mode: PaletteMode,
): { img: Img; scale: ReturnType<typeof scaleForTier>; rect: Rect } {
  const rect = r;
  const cropped = crop(sheet, rect);
  const scale = scaleForTier({ w: rect.w, h: rect.h }, tier);
  const palette = paletteOf(mode);
  const colored = palette ? quantize(cropped, palette) : cropped;
  return { img: resizeNearest(colored, scale.w, scale.h), scale, rect };
}

/** Convierte un buffer preparado en un canvas (solo se llama en el navegador). */
export function toCanvas(img: Img): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, img.width);
  c.height = Math.max(1, img.height);
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  const data = new ImageData(new Uint8ClampedArray(img.data), c.width, c.height);
  g.putImageData(data, 0, 0);
  return c;
}

/** Lee un spritesheet ya cargado como imagen a un buffer RGBA puro. */
export function imageToImg(image: HTMLImageElement): Img {
  const c = document.createElement("canvas");
  c.width = image.naturalWidth;
  c.height = image.naturalHeight;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  g.drawImage(image, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  return { width: c.width, height: c.height, data: new Uint8ClampedArray(d.data) };
}

/** Dibuja con anclaje por pies y coordenadas enteras. */
export function paint(
  g: CanvasRenderingContext2D,
  prepared: ReturnType<typeof prepareFrame>,
  footX: number,
  footY: number,
) {
  g.imageSmoothingEnabled = false;
  const c = toCanvas(prepared.img);
  const x = Math.round(footX - c.width / 2);
  const y = Math.round(footY - c.height);
  g.drawImage(c, x, y);
  return { x, y, w: c.width, h: c.height };
}

/** Tier sugerido por altura de Pokédex, antes de corregir por silueta. */
export function autoTier(heightMeters: number): 16 | 24 | 40 | 64 {
  if (heightMeters <= 0.4) return 16;
  if (heightMeters < 1) return 24;
  if (heightMeters < 2) return 40;
  return 64;
}
