# 07 — Pruebas y riesgos

**Misión:** PG-STITCH-01 · **Fase:** G · **Fecha:** 2026-11-19
**Modo:** verificación no destructiva. Prioridad: inspección estática.

## 1. Comprobaciones SÍ ejecutadas (solo lectura)

| Comprobación | Método | Resultado |
|---|---|---|
| Existencia del ZIP declarado | `stat` | Sí, 4.495 B |
| Integridad del ZIP declarado | `unzip -t` | Correcta |
| Hash del ZIP declarado | `sha256sum` | `72ad383e…4917c1` |
| Contenido real del ZIP | `unzip -l` + extracción a `/tmp/opencode/pg-stitch-01/stitch` | 1 Markdown de 9.102 B, 87 líneas |
| Integridad del ZIP versionado | `unzip -t` | Correcta, 24 archivos |
| Hash del ZIP versionado | `sha256sum` | `bfa58b86…50c9` |
| Coincidencia de 3 ZIP originales | `sha256sum` | Coinciden byte a byte |
| Duplicados entre 12 `code.html` | `sha256sum` | 8 hashes únicos (3 pares duplicados) |
| Resoluciones de 8 `screen.png` | lectura de cabeceras / `file` | Ver `01_INVENTARIO_STITCH.md` §4.1 |
| Fondo canónico | dimensiones + hash | 160×144 RGBA, `bcedbd66…` |
| Fondo de Stitch | dimensiones + hash | 1200×896 RGB, `55b20c80…` |
| Referencias externas | lectura y búsqueda en los HTML | Tailwind, Google Fonts, lh3, jsdelivr/raw.githubusercontent |
| Scripts inline | lectura estática (sin ejecución) | Simulaciones DOM; sin backend |
| Ausencia de cacas en el motor | `grep -i` en `apps/` | 0 coincidencias |
| Ausencia de propiedad/permisos | `grep` de `owner|user_id|permission|guest|visitante` en `apps/` | 0 coincidencias |
| Rutas de documentación | comprobación de existencia | Todas las citadas existen |
| Mapa de líneas de código | `grep -n` / lectura | Refs en informes 02 y 03 |
| Estado Git inicial | `git status --porcelain=v1 --untracked-files=all` + `git rev-parse HEAD` + hash del listado | HEAD `819b73b…`, rama `main`, 34 untracked, hash `57644406…30159` |
| Directorio de entregables | `ls -la` | Vacío al inicio; solo se escribieron los 8 informes |

---

## 2. Pruebas NO ejecutadas y motivo

| Prueba omitida | Motivo |
|---|---|
| `bun run check` | `scripts/check.sh` invoca `dotnet build`, que escribe en `services/pkhex/bin/obj`; prohibido generar archivos en el árbol de trabajo |
| Ejecutar `bun run apps/server/src/index.ts` | Prohibido ejecutar servicios externos; además crearía/escribiría SQLite y cachés |
| Abrir `data/pokegotchi.db` | Base con WAL activo (~2,1 MB); cualquier conexión puede crear `-shm`/`-wal` |
| Ejecutar tests HTTP de la API | Requiere servidor en marcha |
| Ejecutar los scripts inline de los `code.html` | Prohibido expresamente por la misión |
| Contactar a Google Fonts, CDN de Tailwind, lh3, jsdelivr o GitHub | Prohibido enviar datos o consultar proveedores externos |
| Verificar licencias de fuentes/sprites de terceros | Requiere consulta externa; queda como INCERTIDUMBRE |
| Probar exportación real a un save | Requiere escribir binarios; prohibido modificar partidas |
| `agent-browser` sobre la app | Requiere servidor; prohibido |
| Verificar el fundido nocturno real | No existe `guarderia-night.png`; además requiere render en marcha |

**HECHO OBSERVADO:** las fases 0-5 y PG-07A están documentadas como verificadas en ejecuciones previas (`AGENTS.md`, `PG07A_INTEGRATION_REPORT.md`); esa evidencia se acepta como antecedente, no se reprodujo en esta misión.

---

## 3. Riesgos generales

| ID | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R1 | Romper el canvas 160×144 o la pixelación al migrar la carcasa | Alta | Criterios del informe 06; `getImageData` y `imageRendering` |
| R2 | Perder listeners al repintar la ficha | Alta | `updateSheet()` como único punto de enganche |
| R3 | Duplicar la ficha y que diverge entre Biblioteca y Guardería | Alta | Extraer `pet-sheet.ts`, una sola implementación |
| R4 | Copiar datos falsos de los mockups (510 EV en Gen II, 3 ocupantes) | Alta | `capsFor()`; capacidad 2; revisión de i18n y textos |
| R5 | Incorporar Tailwind CDN o fuentes remotas | Alta | CSS propio; sin dependencias nuevas |
| R6 | Simular acciones operativas (export/sync con `setTimeout`) | Crítica | Reutilizar `exportBlock`/`exportWrite`; prohibida la simulación |
| R7 | Exponer saves originales o sobrescribirlos desde multijugador | Crítica | El servidor nunca sirve binarios de `fixtures/` ni originales; export a archivo nuevo |
| R8 | Reserva de plaza no atómica / duplicación de Pokémon | Crítica | Transacción e idempotencia antes de PG-08 |
| R9 | Consentimiento de crianza implícito por permiso general | Crítica | Consentimiento explícito por crianza; permiso `allow_breeding` solo habilita solicitudes |
| R10 | Manipulación de reloj para acelerar huevos | Alta | Política de servidor; decisión pendiente, no implementar slave de cliente |
| R11 | Generar Pokémon ilegales en huevos | Crítica | Validación PKHeX; no fabricar IV ni met data |
| R12 | Cuarentena social no aprobada | Media | Mantener `illegal` vs `unverified`; no bloquear a `unverified` |
| R13 | Efectos no resueltos en saves originales | Crítica | PG-09 bloqueado hasta resolución documental |
| R14 | Licencia de sprites/fuentes de terceros | Media | Uso local/no distribuible; no publicar |
| R15 | Romper el modo local sin cuentas | Alta | PG-08 debe preservar local offline; ninguna dependencia de conexión |
| R16 | Migración de BD destructiva | Crítica | No ejecutar migraciones sin autorización ni copia de seguridad verificada |
| R17 | Regresión responsive en ≤720 px | Media | Verificar 390×844 y 2x; `overflowX=0` |
| R18 | Cacas introducidas sin reglas | Media | Fuera del motor hasta aprobación |
| R19 | Dependencias innecesarias | Media | Rechazo explícito de librerías UI/CDN |
| R20 | Interpretar el Markdown Stitch como especificación de 12 pantallas | Media | Exigir exportación real de los archivos faltantes |

---

## 4. Referencias externas inseguras detectadas

| Referencia | Tipo | Acción propuesta |
|---|---|---|
| `https://cdn.tailwindcss.com` | Script/CSS remoto | No incorporar |
| `fonts.googleapis.com` / `fonts.gstatic.com` (7 familias) | Fuentes remotas | No incorporar; usar fuente 3×5 y sistema |
| `https://lh3.googleusercontent.com/...` | Imágenes remotas | No incorporar; sprites propios/locales |
| `https://cdn.jsdelivr.net/gh/thegrb90/pokered-starter@master/...pokemon-font.ttf` | Fuente de tercero, licencia no verificada | No incorporar |
| `https://raw.githubusercontent.com/filipekiss/pokemon-font/master/dist/pokemon-font.woff` | Fuente de tercero, licencia no verificada | No incorporar |

**HECHO OBSERVADO:** no se realizó ninguna petición a estas URLs.

---

## 5. Cobertura de pruebas a añadir por fase (propuesta)

| Fase | Pruebas nuevas mínimas |
|---|---|
| PG-07B | Render/canvas/escala/teclado/listeners/sin red; ver §9 del informe 06 |
| PG-07C | Ficha Gen I/II vs Gen III+; export dry-run; una sola implementación; i18n |
| PG-08 | Concurrencia, idempotencia, 7 estados, 3 permisos, recuperación offline, auditoría, sin exposición de saves |
| PG-09 | Compatibilidad, consentimiento, 1 huevo/participante, 15 min–3 h, reloj, PKHeX, reparto pendiente |
| PG-10 | Saldo no negativo, gasto atómico, sin transferencia, sin endpoints de pago, persistencia de decoración |
| Todas | `bun run check` + inspección del informe generado; un test que pasa no prueba cobertura |

---

## 6. Salvedad final

Esta auditoría es **estática**. Ningún resultado aquí sustituye a la verificación en ejecución que exige `AGENTS.md` antes de declarar terminada cualquier fase. Las pruebas dinámicas quedan expresamente pendientes y documentadas.
