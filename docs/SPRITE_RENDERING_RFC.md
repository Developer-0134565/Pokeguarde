# PG-06 — RFC de renderizado de sprites (Fase B, diseño)

**Estado:** DISEÑO CONSOLIDADO. El visor aislado quedó implementado en Fase C y
validado en Fase D; no se ha modificado código de producción. Los datos medidos
están en `SPRITE_AUDIT.md`, `PG06_VIEWER_RESULTS.md` y `/tmp/opencode/pg06/`.

## 1. Objetivo y límites

Objetivo: poder mostrar al Pokémon adoptado como un sprite overworld real dentro
del LCD 160×144 de la Guardería, manteniendo la escala entera, el nearest-neighbor
y el anclaje por pies, sin acoplar el motor a formatos de archivo.

**Fuera de alcance del RFC:** cambiar `pet-engine.ts`, la API, SQLite, los saves,
PKHeX, las reglas de EV/legalidad, las cooldowns, la exportación ni las reglas de
cacas (no aprobadas). Tampoco se decide aquí la licencia de los sprites.

## 2. `SpriteManifest` propuesto

Un descriptor pequeño, explícito y serializable; el PNG original nunca se referencia
desde la lógica de mascotas.

```ts
type Direction = "down" | "left" | "right" | "up"; // filas confirmadas en Fase C
type Tier = 16 | 24 | 40 | 64;

type SpriteManifest = {
  id: string;                 // "025-normal", "025-shiny", "034_1"
  speciesId: number;          // 25 (clave de dominio, no nombre de archivo)
  form: string;               // "normal" | "alola" | "fighter03" ...
  shiny: boolean;
  source: {
    path: string;             // solo en herramientas de build; NUNCA en runtime
    sha256: string;
    license: "approved" | "pending" | "rejected";
    attribution: string;
  };
  sheet: { width: number; height: number; cellWidth: number; cellHeight: number };
  frameRects: Array<{ x: number; y: number; w: number; h: number }>; // 16, medidos por alfa
  footOffsetY: number;        // píxeles desde la celda hasta la línea de pies
  animation: Record<Direction, number[]>; // 4 índices por fila (0..15)
  animationMs: number;        // p. ej. 280 (coincide con el frame actual)
  visibleBounds: { w: number; h: number };
  tier: Tier;                 // calculado + overrides
  overrides?: { tier?: Tier; directionOrder?: Direction[]; anchorX?: number };
  palette: "rgba" | "gbc4" | "gbc16"; // resultado del pipeline de build
};
```

Normas derivadas de la auditoría:

- `frameRects` se calculan con el rectángulo alfa real, **no** con `cellWidth ×
  cellHeight`; el pie se ancla con `footOffsetY` medido por celda
  (`~60-64` en celdas de 64, `~104-128` en celdas de 128).
- Las formas `P` se convierten a RGBA durante el build; las hojas sin transparencia
  (`54D.png`) y la incompleta (`600_REAL.png`) quedan fuera del manifest.
- `speciesId` se resuelve desde el PID/especie del save, nunca desde el nombre del
  PNG; el nombre del archivo solo sirve al importador.
- Si un `speciesId` no tiene manifest, se mantiene el dibujo procedural actual
  (`drawPet`) como **fallback**. Nunca se inventa un sprite.

### Cálculo del tier (propuesta)

1. Tier base por altura de Pokédex: ≤0,4→16; 0,5–0,9→24; 1,0–1,9→40; ≥2,0→64.
2. Corrección por silueta: si `visibleBounds.h` es > 1,5× o < 0,6× la mediana
   del tier, aplicar el tier vecino; si el ancho final > 80 px en el lienzo,
   bajar un nivel.
3. `overrides.tier` gana siempre. Casos candidatos a override: Onix/Wailord/legendarios
   (limitados a 40 o 64 según occlusión) y Joltik (16px puede ser demasiado pequeño).
4. Escala uniforme `factor = tier / visibleBounds.h`, redondeo a entero para el
   destino. Si el factor no es entero, **normalizar en el build**; en runtime solo
   `drawImage` con enteros (ver §3).

## 3. Estrategias de render comparadas

| Estrategia | Ventajas | Costes / riesgos | Uso propuesto |
|---|---|---|---|
| **A. Hojas PNG originales + recorte en runtime** | Cero preprocessing; probar rápido 16/24/40/64. | Full-color choca con la estética GBC de 4 colores; downscale no entero con `imageSmoothingEnabled=false` deja píxeles desiguales; 12 MB de originales no versionables. | **Solo spike aislado**, con assets en `/tmp`. |
| **B. Atlas derivado normalizado por tier** (recortar alfa → escalar → opcionalmente cuantizar a 4/16 colores → empaquetar) | Sin escalado en runtime; píxel exacto; posibilita paleta GBC; subset pequeño; no versiona originales. | Pipeline de build y decisión de paleta; requiere aprobación de licencia antes de versionar derivados. | **Producción recomendada**, tras aprobación. |
| **C. Dibujo procedural actual** (`drawPet`) | Determinista, 4 colores, sin assets, ya funciona. | No representa a la especie real. | **Fallback** y referencia visual. |
| **D. Canvas completo con menús dibujados** | Una sola superficie; composición simple. | Duplica el trabajo de texto/i18n ya hecho en HTML. | No recomendado. |
| **E. Canvas para escena + HTML/CSS para HUD/menús** (estado actual) | Reutiliza `#pg-hud`, i18n, foco y teclado; carcasa Tamagotchi en CSS. | Dos sistemas de coordenadas. | **Recomendado**, coherente con Stitch. |

**Decisión propuesta:** E para la shell + B para los sprites + C si falta asset.
Orden de capas, sin cambios funcionales:

1. fondo (`guarderia.png` / nocturno con crossfade),
2. objetos de suelo (cuenco; futuras cacas **solo como capa**, sin reglas nuevas),
3. Pokémon (sprite o fallback),
4. FX (corazones, destellos, enables),
5. HTML: HUD, menús GBC y diálogos (fuera del lienzo, como hoy).

## 4. Controlador de animación (solo diseño)

- Entradas: dirección (por ahora fija «down» en el visor; en el futuro derivada de
  un estado de la mascota **sin modificar el motor**), `moving: boolean`, `sleeping`,
  `now`, `frameMs ≈ 280` (misma cadencia que el renderer actual).
- `idle`: frame 0 + parpadeo opcional; `walk`: 0→1→2→3; `sleep`: usar el fallback
  acurrucado, porque el paquete no tiene pose de dormir.
- Ningún frame modifica EV, needs, amistad ni puntos. La animación es presentación.

## 5. Prototipo aislado (IMPLEMENTADO en Fase C, sin integrar)

Resultados y capturas: `PG06_VIEWER_RESULTS.md`. Sigue pendiente la decisión de
licencia/paleta para cualquier integración futura.

Ruta implementada: `apps/web/viewer.html` + `apps/web/src/sprite-viewer.ts` +
`apps/web/src/sprite-render.ts`, servidos por un **añadido opcional** al mapa de
módulos del servidor, o ejecutables con un servidor estático independiente. El
visor no importaría `nursery.ts`, no consultaría `/api/*` y no tocaría `pet-engine.ts`.

Controles: selector de especie (mínimo 101, 490, 034, 081, 095, 321, 595, 810),
normal/shiny, dirección, frame 0..15, tier 16/24/40/64, ancla, fondo
`guarderia.png` on/off, cuadrícula on/off y botón de comparación lado a lado.
Los PNG se cargarían desde `/tmp/opencode/pg06/extracted/` mediante un prefijo
configurable de solo desarrollo; **ningún PNG entra en Git** en este paso.

Criterios de aceptación del visor:

1. Las 16 celdas se recortan con sus rectángulos alfa medidos; sin blur ni crop.
2. `imageSmoothingEnabled = false`; posiciones enteras; pie exactamente en `groundY`.
3. Las cuatro escalas se pueden comparar sobre el mismo fondo sin deformar.
4. Fallback visible si no hay manifest o si el PNG falla.
5. Sin peticiones a Internet en runtime; sin acceso a BD, saves ni API.
6. `bun run check` sigue pasando y el diff se limita a archivos nuevos aislados.
7. Capturas 1280×900 y 390×844 sin desbordes, con el HUD actual intacto.

## 6. Plan de migración conditional (no ejecutar sin autorización)

1. Aprobación de licencia y decisión de paleta (RGBA completo vs. GBC4/16).
2. Generar un subset derivado (specie IDs reales de la BD + extremos) con
   manifiesto y hashes; no copiar los 2937 originales.
3. Añadir `sprite-render.ts` con `loadManifest`/`drawSprite` y el fallback a `drawPet`
   **sin cambiar firmas de `pet-engine.ts`**.
4. Sustituir solo la llamada `drawPet(...)` de `drawRoom` por `drawSprite(...)`;
   conservar `petPosition` y `ROOM.walk`.
5. Verificar `bun run check`, ida y vuelta de API, 4 mascotas intactas y capturas.

## 7. Decisiones abiertas (bloqueos)

- **Licencia**: sin autorización no se versiona ningún sprite ni derivado.
- **Paleta**: RGBA sigue siendo el valor por defecto. El visor añade GBC4 y GBC16
  (16 tonos derivados de los que se usan 5–8 por sprite). Falta decidir cuál se
  emplearía en una integración; las maquetas Stitch piden LCD GBC.
- **Numeración**: `100`/`101` coinciden con Voltorb/Electrode, pero hay IDs 810–815
  atípicos y faltan 751/807/814. ¿Mapa explícito o detección por nombre?
- **Direcciones**: resuelto en Fase C (fila 1 = izquierda, fila 2 = derecha).
- **Escala**: ¿tier fijo por especie o ajustado por silueta con overrides?
- **Cacas**: sin reglas aprobadas; el RFC solo reserva la capa.
- **Prototipo**: autorizado e implementado; **no integrado** en la Guardería.

## 8. Conservación

No se han ejecutado `git pull`, `reset`, `clean` ni escrituras en `data/`,
`fixtures/`, saves, `apps/server`, `services/pkhex`, `pet-engine.ts` ni
`nursery.ts`. `docs/stitch/reference/` sigue sin seguimiento y intacto.
