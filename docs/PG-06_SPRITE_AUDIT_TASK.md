# PG-06 — Auditoría de sprites overworld y spike de renderizado

**Estado:** PLANNED. **Responsable propuesto:** OpenCode/Sol. **Fecha:** 2026-11-19. **Regla:** auditoría read-only primero; implementación solo del spike visual, sin modificar motor, datos, API ni saves.

## Contexto verificable
- Repositorio local: `/home/missingn0/Proyectos/Pokeguarde`; remoto `Developer-0134565/Pokeguarde`.
- Archivo de sprites local del usuario: `/home/missingn0/Descargas/Gen 1-7 OV SPrites.7z` (no está en GitHub).
- Auditoría preliminar reportada por el usuario: **2937 imágenes**; **2758** de 256×256, **158** de 512×512, **8** de 192×192, **7** de 208×208, **5** de 128×192 y **1** de 384×384.
- Cada PNG contiene **16 sprites/fotogramas del mismo Pokémon**, con distintas posiciones y animaciones. **No asumir 4×4 ni dirección/orden de frames sin verificar visualmente**.
- Pantalla Canvas actual **160×144**; fondo real `apps/web/assets/room/guarderia.png`; renderer en `apps/web/src/nursery.ts`, escala entera, nearest-neighbor, anclaje por pies.
- Propuesta de tamaños **16/24/40/64 px de altura visible**, NO aprobada como regla definitiva. Umbrales de altura Pokédex propuestos: <=0,4m, 0,5–0,9m, 1,0–1,9m, >=2,0m. Usar altura oficial como pista, no como tamaño final obligatorio.
- Fuente candidata de alturas: PokéAPI, cacheada localmente con procedencia, licencia y tratamiento de formas; la aplicación en tiempo de ejecución no debe requerir Internet.

## Instrucciones a Sol — trabajo a planificar y ejecutar por fases

### Fase A — solo lectura y reporte
1. `git status --short --branch`, `git log -1 --oneline`, `git remote -v`. **No** hacer `git reset --hard`, `git clean`, `git pull` automático ni sobrescribir trabajo local. Comprobar divergencia con `origin/main` y el checkpoint `checkpoint/pre-stitch-2026-11-19`. Proponer sincronización segura antes de tocar archivos.
2. Inspeccionar el 7z sin modificarlo. Inventariar rutas, especies/formas, duplicados, dimensiones, canales alfa y distribución de los 16 fotogramas. **No asumir** que una celda 64×64 implica dibujo visible de 64×64.
3. Para una muestra estratificada (incluyendo 256, 512 y tamaños atípicos), determinar cuadrícula real, rectángulo de alfa visible por fotograma, orden de orientación/animación, ancla de pies y si los 16 cuadros son homogéneos. Generar contacto visual por hoja y un CSV/JSON de metadatos.
4. Validar contra especies reales: Electrode, Manaphy, Nidoking, Magnemite; extremos Joltik, Onix y Wailord si están en el paquete. Documentar ausencias y variaciones de formas.
5. Investigar altura oficial y especies/ID, anotar origen y permisos de uso de sprites, revisar si conviene cache local. No descargar automáticamente los 2937 PNG a Git ni incorporarlos sin aprobación de tamaño/licencias.
6. Presentar una tabla de distribución de tamaños visibles y comparativa de cuatro escalas propuestas sobre pantalla 160×144. Explicar si 64px para Onix/Wailord causa oclusión y cómo ajustar casos excepcionales.

### Fase B — diseño técnico, no cambios funcionales
7. Proponer `SpriteManifest` (speciesId, form, sourcePath, sheetWidth/Height, frameRects[16], animationMap, anchor, visibleBounds, tier, overrides, provenance) y render por recorte `drawImage` con nearest-neighbor. No atar lógica de mascotas a archivos PNG.
8. Comparar render Canvas2D por capas y menús GBC en HTML/CSS, o Canvas completo. Orden de capas propuesto: fondo → objetos de suelo/cacas → Pokémon → FX → menú/diálogo. **Cacas no tienen aún reglas de aparición, persistencia ni efecto nuevo de LIMPIAR aprobados**.
9. Diseñar un **spike reversible** limitado a un visor aislado con controles de especie, dirección, frame, escala, ancla y fondo `guarderia.png`. El visor debe permitir comparar 16/24/40/64px, con recorte transparente y sin deformar. No conectar a endpoints de acciones.
10. Proponer criterios de aceptación y un plan de migración al `nursery.ts` actual. No tocar `pet-engine.ts`, `apps/server`, `services/pkhex`, `data/pokegotchi.db`, saves ni fixtures.

## Entregables esperados
- `docs/SPRITE_AUDIT.md` (fuentes, formatos, anomalías, muestra, licencias y conclusiones).
- `docs/SPRITE_RENDERING_RFC.md` (comparativa de estrategias, tamaños, orden de capas y decisiones abiertas).
- CSV/JSON de metadatos de muestra y hojas de contacto (bajo `docs/sprites/` o `/tmp` si el peso es grande).
- Solo tras revisar A y B: propuesta de spike visual aislado, con ruta y pruebas, **sin implementar aún en la Guardería funcional**.
- `bun run check` si se llega a modificar código, capturas 1280×900 y 390×844, y diff explicativo.

## Criterios de bloqueo
- Si no está disponible el 7z, registrar bloqueo; no inventar dimensiones ni animaciones.
- Si los sprites tienen copyright/licencia incierta, no publicarlos automáticamente en GitHub.
- Si el árbol local tiene cambios sin commitear, preservar todo y solicitar confirmación antes de cualquier operación destructiva.
- Si hay incompatibilidad con la base de datos o mecánica, no modificarla: documentar alternativa.

**Primera acción solicitada:** Sol debe responder con un plan de ejecución concreto de PG-06, el estado Git local y las preguntas bloqueantes, antes de escribir código.
