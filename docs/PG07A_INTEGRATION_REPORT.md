# PG-07A — Integración de sprites overworld en la Guardería

**Estado:** IMPLEMENTADO Y VERIFICADO el 19-nov-2026. Es un cambio **visual**: el
Canvas sigue siendo 160×144, el fondo sigue siendo
`apps/web/assets/room/guarderia.png` y no se han tocado motor, mecánicas,
persistencia, saves, fixtures ni PKHeX. El visor aislado de PG-06 permanece
intacto y sigue siendo independiente.

## 1. Arquitectura implementada

```
navegador (127.0.0.1:8787)
  nursery.ts ── importa ──> sprite-runtime.ts ── importa ──> sprite-render.ts (PG-06)
       │                          │
       │ paintOverworld(...)      │ fetch una vez
       │ (null => drawPet)        ▼
       │                   GET /api/sprites/catalog
       ▼                   GET /api/sprites/<nombre.png>
  Canvas 160×144                  │
                                  ▼
                     apps/server/src/sprites.ts
                     (solo lectura, /tmp autorizado)
```

- **`sprite-runtime.ts`** es el único adaptador nuevo: mantiene el catálogo y la
  caché de hojas, resuelve la especie/forma/variante, decide dirección y frame,
  calcula el tier, llama al renderer puro y devuelve una caja pintada o `null`.
- **`nursery.ts`** solo cambia el punto de dibujo de la mascota en `drawRoom()`,
  añade los selectores al panel lateral e inicializa el catálogo al abrir la
  Guardería. `drawGame()` (minijuegos) sigue siendo 100 % procedural.
- **Preferencias**: `localStorage["pokeguarde.pg07a.render"]`, p. ej.
  `{"mode":"overworld","palette":"rgba"}`. Nunca se escriben en SQLite ni en el
  perfil de la mascota; no afectan a exportación ni legalidad.
- Modo y paleta se pueden cambiar **en caliente**, sin recargar ni perder estado.

## 2. Archivos modificados y añadidos

| Archivo | Cambio |
|---|---|
| `apps/server/src/sprites.ts` | **Nuevo.** Catálogo y validación de recursos, solo lectura. |
| `apps/server/src/index.ts` | Dos rutas GET de sprites, cabeceras en `json()` y dos módulos nuevos en el mapa transpilado. |
| `apps/web/src/sprite-runtime.ts` | **Nuevo.** Adapter, preferencias, animación y fallback. |
| `apps/web/src/nursery.ts` | Selectores, estado visual, inicialización y sustitución segura del dibujo en `drawRoom()`. |
| `apps/web/src/i18n.ts` | Claves `render.*` en ES y EN. |
| `apps/web/src/style.css` | Estilos `.pg-render`, `.pg-render-row` y `#pg-render-status`. |
| `scripts/pg07a-integration-check.ts` | **Nuevo.** 54 pruebas puras de integración, resolución y fallback. |
| `scripts/check.sh` | Ejecuta la nueva suite antes del sidecar. |
| `docs/PG07A_INTEGRATION_REPORT.md` | **Nuevo.** Este documento. |

No se modificaron `pet-engine.ts`, `db.ts`, la API de persistencia, los saves,
los fixtures, PKHeX ni `docs/stitch/reference/`.

## 3. Resolución de sprites por especie y forma

- El catálogo se construye en el servidor desde `sprite-metadata.json` (medidas
  PG-06) y el CSV de alturas de PokéAPI cacheado en `/tmp/opencode/pg06/`.
  Devuelve **810 entradas** con `speciesId`, archivo base (`NNN.png`), shiny
  (`NNNs.png`), formas (`NNN_0.png`, …), altura, celda y tier.
- `resolveEntry()` filtra por `speciesId`, usa **siempre el archivo base** cuando
  no se pide una forma, y solo elige `forms[String(form)]` cuando la mascota
  aporta un índice de forma. Si la forma no existe, cae al base.
- `profileOf()` de la API **no expone `form`**; por ahora el adapter acepta el
  parámetro opcional pero la Guardería no lo envía. Es una limitación
  documentada, no un dato inventado.
- El shiny se resuelve solo si existe `NNNs.png`; si no, se usa el base sin
  falsificar la variante.

## 4. Escalado y animaciones

- Se reutiliza `sprite-render.ts` sin reescribirlo: `frameRects()` mide los 16
  fotogramas desde el canal alfa (no asume 4×4 fijo), `scaleForTier()` escala
  por la altura visible, `prepareFrame()` aplica paleta y `paint()` ancla por los
  pies con `imageSmoothingEnabled = false`.
- Filas verificadas: **0 abajo, 1 izquierda, 2 derecha, 3 arriba**.
- Andando: 4 columnas a 280 ms/frame. En reposo: columnas alternas 0 y 2 a
  700 ms. La dirección se deriva del movimiento horizontal real con una ventana
  de 220 ms; si la mascota está quieta se conserva la última dirección.
- Tier automático por altura: ≤0,4 m → 16; <1 m → 24; <2 m → 40; ≥2 m → 64.
  Ajustes puntuales: Onix (95) y Wailord (321) bajan a **40** para no tapar la
  ventana y el mostrador del fondo en un LCD de 144 px de alto.
- Paleta por defecto: **RGBA original**. Opcionales: GBC4 (4 colores exactos) y
  GBC16 (16 tonos derivados, de los que cada frame usa 5–8).

## 5. Estrategia de fallback

`paintOverworld()` devuelve `null` —y `nursery.ts` llama al `drawPet()`
procedural original— en cualquiera de estos casos:

- modo Procedural seleccionado;
- catálogo no disponible, vacío o con fetch fallido;
- especie no resoluble o sin hoja en caché todavía;
- hoja no decodificable, con celdas vacías o fuera de la imagen;
- pose `sleep` (el pack no incluye sprite de dormir; se conserva la pose
  acurrucada procedural);
- excepción al preparar o pintar el frame.

Ningún fallo lanza hacia la interfaz ni detiene el bucle de animación. Si la
hoja falla una vez, se cachea como inválida para no repetir peticiones; el
estado del panel pasa a «Sin sprites locales · fallback procedural».

## 6. Seguridad del servidor de recursos

- El servidor sigue enlazado a `127.0.0.1`.
- `SPRITE_DIR` se resuelve con `resolve()` y solo se acepta si empieza por
  `/tmp/opencode/`; si no, el catálogo está vacío y no hay capacidad de servir
  archivos. La ruta por defecto es la extracción verificada de PG-06.
- El navegador **nunca envía rutas**: solo un nombre de archivo.
  `isValidSpriteName()` exige `^[0-9A-Za-z_+()\-]+\.png$` y prohíbe `..`, `/` y
  `\`. `spritePath()` comprueba además que el resultado siga dentro del
  directorio autorizado.
- Las dos rutas son **GET**; no existe ningún endpoint de escritura. La de PNG
  añade `x-content-type-options: nosniff` y `cache-control: public, max-age=3600`;
  la del catálogo usa `no-store`.
- Un intento de traversal (`..%2F..%2Fetc%2Fpasswd.png`) responde **400**.
- No se han copiado sprites originales ni derivados al repositorio; la licencia
  sigue sin resolver, así que el uso es local y no distribuible.

## 7. Resultados de pruebas

| Comando | Resultado |
|---|---|
| `bun scripts/pg07a-integration-check.ts` | **54/54** correctas |
| `bun scripts/pg06-viewer-check.ts` | **36/36** correctas |
| `bun run check` | Motor, día/noche, i18n e integración OK; sidecar .NET **0 avisos / 0 errores** |

Comprobaciones con servidor real:

- `GET /api/sprites/catalog` → 200, `available:true`, 810 entradas; Electrode
  con celda 64×64, tier 40 y `101s.png`.
- `GET /api/sprites/101.png` → 200 `image/png`, 2719 bytes.
- `/sprite-runtime.js`, `/sprite-render.js` y `/` → 200.
- Navegador: canvas lógico 160×144 con `imageSmoothingEnabled=false`; seis
  muestras de la región de la mascota dan tres hashes distintos (animación).
  Cambiar a Procedural cambia el hash; volver a Overworld lo restaura. Las tres
  paletas producen hashes distintos y la preferencia persiste en localStorage.
- Los siete sprites exigidos se pintaron dentro de la app funcional:
  Electrode, Manaphy, Nidoking, Magnemite, Joltik, Onix y Wailord →
  `painted:[true×7]`, `spriteStatus().loaded=7`.
- Cuatro direcciones validadas con el pipeline real (frames 1/5/9/13, cuatro
  hashes distintos, caja 42×40 anclada en y=130). El movimiento de la Guardería
  es horizontal, por lo que en uso normal se generan las filas 0–2; la fila 3
  está soportada y verificada por el renderer.
- Sprite ausente: al abortar `101.png` y recargar, el estado muestra «Sin sprites
  locales · fallback procedural» y el hash de la mascota coincide con el modo
  Procedural. Sin errores de consola.
- Cambio de mascota: Electrode → Manaphy → Nidoking → Magnemite produce cuatro
  hashes distintos y mantiene la mascota activa correcta.
- Móvil 390×844: canvas CSS 320×288, `overflowX=0`, panel de preferencias de
  348 px sin desbordes.
- Día/noche: el asset `guarderia-night.png` sigue sin existir (404 esperado),
  así que el objetivo de fundido es 0 y el fondo diurno permanece estable; no
  hay regresión respecto a la fase 5.

## 8. Capturas

Todas en `/tmp/opencode/pg07a/` (fuera de Git):

- `01-overworld-desktop.png` — Guardería funcional con Electrode en Overworld.
- `02-seven-species-functional-canvas.png` — las siete especies en el pipeline funcional.
- `03-four-directions.png` — frames 1/5/9/13 a tier 40.
- `04-mobile-overworld.png` — móvil 390×844 sin desbordes.
- `05-desktop-final.png` — estado final en escritorio.

## 9. Problemas pendientes

- Licencia de los sprites: sin resolución; nada se redistribuye.
- La API no expone `form`, así que no se puede seleccionar una forma concreta
  desde la Guardería todavía.
- El pack no tiene pose de sueño; se usa la procedural.
- Falta el asset nocturno real para observar el fundido.
- Movimiento vertical: la Guardería solo se desplaza en horizontal, por lo que
  la dirección «arriba» no aparece en el uso normal.
- Onix y Wailord usan un override de tier (40) distinto del sugerido por altura
  (64) para no cubrir el fondo.

## 10. Recomendaciones para PG-07B

1. Decidir licencia y paleta definitiva antes de cualquier empaquetado.
2. Exponer `form` en `profileOf()` si se quiere resolución exacta de formas.
3. Añadir un sprite de sueño o acordar mantener la pose procedural.
4. Ampliar el movimiento a dos ejes para usar la fila «arriba».
5. Sustituir los overrides por una tabla curada por especie validada visualmente.
6. Integrar el asset nocturno y repetir la comprobación de fundido con sprites.
7. No migrar a las maquetas Stitch sin conservar estos dos modos y el fallback.
