# 08 — Informe ejecutivo

**Misión:** PG-STITCH-01 · Auditoría integral de diseños Google Stitch y planificación de implementación
**Agente principal:** Sol (OpenCode) · **Fecha:** 2026-11-19
**Modo:** READ-ONLY sobre el repositorio. Sin implementación.

---

## 1. Resumen en una página

**HECHO OBSERVADO:** la exportación señalada por el usuario (`stitch_pokeguarde_ui_evolution_system.zip`, 4.495 B, SHA-256 `72ad383e…4917c1`) es íntegra pero contiene **un único Markdown de 87 líneas**. **No contiene ninguna de las 12 pantallas.** Los ZIP adicionales locales y versionados contienen **3 diseños base y 5 variantes** (12 `code.html`, 8 hashes únicos), sin identificadores `SCREEN_XX`. Por tanto, la afirmación «se han entregado 12 pantallas» no se sostiene con los archivos disponibles: las 12 SCREEN solo existen como tabla declarativa.

**HECHO OBSERVADO:** la aplicación real está operativa para fases 0-5 y PG-07A: ingestión de saves, inventario, triple veredicto de legalidad con PKHeX.Core, motor Tamagotchi determinista, render GBC 160×144, exportación con dry-run y archivo nuevo, i18n ES, día/noche y sprites overworld. **No existe** ninguna implementación de jugadores, guarderías compartidas, solicitudes, permisos, crianza, huevos, eclosión, Guardipuntos ni tienda.

**DECISIÓN DOCUMENTADA:** las reglas funcionales sólidas (capacidad 2, propiedad permanente, recuperación sin anfitrión, tres permisos, siete estados con reserva atómica, un huevo por participante, incubación 15 min–3 h) están en los documentos del proyecto. Las afirmaciones de Stitch que van más allá (Manaphy+Ditto→Phione, cuatro etapas de eclosión, UTC obligatoria, «cero microtransacciones», cuarentena social, 510 EV en Gen II) **no son decisiones vigentes**.

**PROPUESTA TÉCNICA:** orden de ejecución PG-07B → PG-07C → PG-08 → PG-09 → PG-10. La primera fase implementable con seguridad es **PG-07B** (carcasa, botones y HUD), siempre con autorización explícita y sin tocar motor, BD, saves ni PKHeX.

**CONFIRMACIÓN:** el repositorio permanece sin modificaciones atribuibles a esta misión (sección 12).

---

## 2. Estado del ZIP

| ZIP | Tamaño | SHA-256 | Resultado |
|---|---|---|---|
| `~/Descargas/stitch_pokeguarde_ui_evolution_system.zip` | 4.495 B | `72ad383e154176c6591b71f91edcc40a3040634be468e9da050e4648884917c1` | Íntegro; **1 Markdown**, sin pantallas |
| `POKEGUARDE_STITCH_COMPLETE_2026-11-19.zip` | 2.503.615 B | `bfa58b8637e37bcdc9a3c355e711a19536c7a5a43ce782ac90ab2cf1531c50c9` | Íntegro; 24 archivos; versionado como untracked |
| 8 ZIP adicionales en Descargas | — | Ver informe 01 | 3 diseños base + 5 variantes; 3 originales coinciden byte a byte |

Los scripts inline de los mockups **no se ejecutaron**. Todos los URLs externos se leyeron como texto; no se contactó a ningún proveedor.

---

## 3. Número de pantallas realmente encontradas

- **Declaradas:** 12 (SCREEN_25, 23, 21, 19, 17, 15, 13, 10, 8, 6, 4, 2).
- **Encontradas como archivo:** **0**.

- **Diseños gráficos disponibles:** **3 base** (guardería desktop, ficha desktop, ficha mobile) **+ 5 variantes** = 8 `screen.png` únicos.
- **Con mockup reconocible:** guardería (2 mascotas), ficha (dos resoluciones), guarderías de 3 ocupantes, « POPÓ!», laboratorio genético, equipo 3/6.
- **Solo descripción textual:** directorio, crianza, huevos, eclosión, animación Phione, tienda, perfil/privacidad, cajas PC, inspección forense.

**BLOQUEO:** no es posible auditar visualmente nueve de las doce pantallas.

---

## 4. Estado de la aplicación actual

**VERIFICADO en ejecuciones previas documentadas** (no reproducidas en esta misión por el modo READ-ONLY):

- Backend Bun + SQLite local en `127.0.0.1`; API de saves, mascotas y sprites; sidecar .NET con PKHeX.Core 26.10.18.
- Motor puro con siete acciones, seis minijuegos, EV/Stat Exp reales y límites legales por generación.
- Render 160×144 con fondo canónico, paleta 4 colores, fuente 3×5, HUD HTML, escala entera y día/noche.
- Legalidad triple: `legal`, `unverified`, `illegal`, con motivos concretos y destinos de exportación.
- Exportación: dry-run por defecto, recorte con `withheld`, archivo nuevo, hashes y auditoría en SQLite.
- PG-07A: sprites overworld con medición de frames por alfa y fallback procedural; solo visual.

**NO IMPLEMENTADO:** PG-08, PG-09 y PG-10; pestaña FICHA/DATOS; Equipo Activo como vista; usuarios, permisos, solicitudes, crianza, huevos, GP, tienda, perfil, notificaciones.

---

## 5. Componentes reutilizables

| Componente | Ruta | Uso previsto |
|---|---|---|
| Motor determinista | `apps/web/src/pet-engine.ts` | PG-07B/C, base de cuidados de PG-08/09 |
| Render y HUD GBC | `apps/web/src/nursery.ts` | PG-07B/C, PG-10 |
| Escalado/pixelación | `nursery.ts:895-915` | Todas las fases visuales |
| Ficha y veredictos | `apps/web/src/main.ts:222-343` | PG-07C, inspección legal |
| i18n (232 claves) | `apps/web/src/i18n.ts` | Todas las fases |
| Sprites PG-07A | `sprite-render.ts`, `sprite-runtime.ts`, `sprites.ts` | PG-07B/C, PG-10 |
| Exportación con dry-run | `nursery.ts:427-492,704-760`; `sidecar.ts` | PG-07C, PG-09 |
| API y PKHeX | `apps/server/src/index.ts`, `Program.cs` | PG-07C, PG-09 |
| SQLite y migraciones | `apps/server/src/db.ts` | PG-08, PG-09, PG-10 |
| Fondo canónico y día/noche | `guarderia.png`, `daynight.ts` | PG-07B, PG-10 |

---

## 6. Funcionalidades faltantes

1. Dos plazas con selección de foco y visitantes.
2. Identidad de propietario, titularidad persistente y recuperación offline.
3. Usuarios/directorio, solicitudes, siete estados, reserva atómica, revocación de permisos.
4. Crianza con consentimiento, compatibilidad por generación y regla Phione (pendiente de aprobación).
5. Huevos, incubación 15 min–3 h, aceleración y antifraude.
6. Eclosión y animación de Phione (sin asset ni licencia).
7. Guardipuntos, tienda y decoración.
8. Perfil, notificaciones y privacidad; cifrado en tránsito y almacenamiento.
9. Vista FICHA/DATOS y Equipo Activo como navegación.
10. Reglas de cacas (si se aprueban).
11. Edición de amistad y movimientos (fuera de la implementación actual).
12. Exportación a otro save compatible mediante cadenas oficiales (hoy solo copia nueva del origen).

---

## 7. Contradicciones principales

| # | Resumen |
|---|---|
| C1 | 12 pantallas declaradas vs 0 archivos |
| C2 | 3 ocupantes en mockups vs capacidad 2 decidida |
| C3 | Gen II con 510 EV/naturaleza/IV vs Stat Exp 65.535 por stat |
| C4 | «Cero Microtransacciones» vs modelos futuros propuestos en el RFC |
| C5 | Cuarentena propuesta vs `unverified` no bloqueante |
| C6 | Fondo Stitch 1200×896 vs canónico 160×144 |
| C7 | Exportación/checksums simulados vs protocolo real |
| C8 | EXP x1.5, SRAM y puntos «PC» sin respaldo |
| C9 | Cacas sin reglas aprobadas |
| C10 | CDN/fuentes externas vs app local sin dependencias |
| C11 | Stat Exp «suma 65.535» vs tope por stat |
| C12 | UTC cerrada vs reglas de reloj pendientes |
| C13 | Manaphy+Ditto→Phione como decidido vs RFC que solo contempla excepciones |
| C14 | 4 etapas y 2 huevos vs 1 huevo por participante |
| C15 | Capacidad 2 interpretada como dos activas en local vs una activa real |
| C16 | PG-06 `PLANNED` vs completado en roadmap |
| C17 | Tiers 16/24/40/64 como regla vs no aprobados y con overrides |

Detalle y citas en `04_CONTRADICCIONES_Y_DECISIONES.md`.

---

## 8. Riesgos

**Críticos:** simulación de acciones operativas (R6), exposición/sobrescritura de saves (R7), reserva no atómica (R8), consentimiento implícito (R9), huevos ilegales (R11), efectos no resueltos en saves (R13), migraciones destructivas (R16).

**Altos:** ruptura del canvas/escala (R1), pérdida de listeners (R2), fichas duplicadas (R3), datos falsos de mockups (R4), dependencias externas (R5), manipulación de reloj (R10), pérdida del modo local (R15).

**Medios:** cuarentena no aprobada (R12), licencias (R14), responsive (R17), cacas (R18), dependencias innecesarias (R19), interpretación del Markdown como 12 pantallas (R20).

Listado completo con mitigaciones en `07_PRUEBAS_Y_RIESGOS.md`.

---

## 9. Dependencias

**Actuales (producción):** Bun, TypeScript, Canvas, SQLite (`bun:sqlite`), .NET 10 con PKHeX.Core 26.10.18 en sidecar. Sin frameworks UI, sin WASM, sin nube.

**Propuestas por Stitch y RECHAZADAS:** Tailwind CDN, siete familias de Google Fonts, imágenes en `lh3.googleusercontent.com`, fuentes de `jsdelivr`/`raw.githubusercontent.com`. Ninguna se incorporó ni se consultó.

**Licencias:** sprites y fuentes de terceros, sin resolver; uso local/no distribuible según `PG07A_INTEGRATION_REPORT.md:101-116,164-168`.

---

## 10. Plan y orden recomendado

| Orden | Fase | Naturaleza | Bloqueos |
|---|---|---|---|
| 1 | **PG-07B** — carcasa, botones, HUD | Solo visual | Ninguno técnico; requiere autorización |
| 2 | **PG-07C** — FICHA/DATOS y compartidos | Visual + refactor | Ninguno de backend |
| 3 | **PG-08** — jugadores, guarderías, solicitudes, permisos, recuperación | Backend + seguridad + BD | Autenticación y cifrado sin decidir |
| 4 | **PG-09** — crianza, huevos, eclosión | Backend + PKHeX + BD | Fórmula, Phione, reloj, GP y saves sin resolver |
| 5 | **PG-10** — GP, tienda, decoración | Backend + visual | Costes y fuentes de GP sin decidir |

Detalle por fase (objetivo, archivos, componentes, riesgos, pruebas, criterios, complejidad y decisiones pendientes) en `05_PLAN_IMPLEMENTACION.md`.

---

## 11. Primera fase que puede implementarse con seguridad

**PG-07B**, condicionada a:

1. Autorización explícita del usuario.
2. No modificar `pet-engine.ts`, `db.ts`, `index.ts`, `Program.cs`, saves, fixtures ni assets canónicos.
3. No añadir dependencias ni fuentes remotas.
4. Conservar canvas 160×144, pixelación, escala vigente y `updateSheet()`.
5. Ejecutar `bun run check` y las ocho pruebas visuales del informe 06 **cuando se permita generar artefactos de build**.

Es la única fase reversible sin migraciones de datos ni implicaciones legales.

---

## 12. Confirmación de integridad del repositorio

| Comprobación | Inicial | Final | Coincide |
|---|---|---|---|
| HEAD | `819b73b49a8aca76486173917d7abdb4518290ab` | `819b73b49a8aca76486173917d7abdb4518290ab` | Sí |
| Rama | `main` | `main` | Sí |
| Cambios rastreados | 0 | 0 | Sí |
| 34 entradas untracked | Sí | Sí | Sí |
| SHA-256 de `git status --porcelain=v1 --untracked-files=all` | `5764440642f084e5d417d0e3735a5a7f38c2763fd2eac97d2dab199e85830159` | `5764440642f084e5d417d0e3735a5a7f38c2763fd2eac97d2dab199e85830159` | **Sí** |

**HECHO OBSERVADO:** el repositorio permanece sin modificaciones atribuibles a esta misión. No se hicieron commits ni pushes, no se instalaron dependencias, no se ejecutaron migraciones, no se iniciaron servicios, no se modificaron partidas ni diseños originales. Los únicos archivos creados son los ocho informes en `/home/<usuario>/Descargas/PG-STITCH-01-AUDIT/` y los temporales de extracción bajo `/tmp/opencode/pg-stitch-01/`.

---

## 13. Incidencias de ejecución y bloqueos

- **Terra** (auditoría de arquitectura) falló con «ChatGPT usage limit reached»; su trabajo fue asumido directamente por Sol mediante inspección estática (informe 02).
- **Luna** completó el informe de decisiones documentales y contradicciones, integrado en el informe 04.
- **Astra** no fue lanzado (no aportaba trabajo no solapado).
- **BLOQUEO A:** 9 de 12 pantallas no existen como archivos.
- **BLOQUEO B:** licencias de fuentes/sprites no verificables sin contacto externo.
- **BLOQUEO C:** verificación dinámica omitida por las restricciones de modo READ-ONLY (informe 07 §2).

**La misión termina aquí: la auditoría está preparada y existe un plan verificable para autorizar posteriormente PG-07B, PG-07C, PG-08, PG-09 y PG-10. No se ha comenzado ninguna implementación.**
