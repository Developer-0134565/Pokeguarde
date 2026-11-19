# 03 — Matriz pantallas Stitch vs. código existente

**Misión:** PG-STITCH-01 · **Fase:** C · **Fecha:** 2026-11-19

## Criterios de clasificación

| Categoría | Criterio |
|---|---|
| IMPLEMENTADO | Existe en código con el mismo propósito y está verificado en fases previas. |
| PARCIAL | Existe una base reutilizable, pero falta parte sustancial de la pantalla. |
| PENDIENTE | No hay implementación alguna en código. |
| CONTRADICTORIO | La pantalla afirma datos o reglas opuestos a decisiones vigentes. |
| NO VERIFICABLE | No hay archivo de pantalla o no es posible comprobarlo con la evidencia disponible. |

> **Advertencia global:** las 12 SCREEN solo existen como filas de una tabla en el Markdown del ZIP. Para las filas 1, 2, 6, 10, 11 y 12 hay además mockups parciales (z12/z5, z10/z7, z11/z6); para el resto solo hay descripción textual. Por eso varias filas son `NO VERIFICABLE` en lo visual y `PENDIENTE` en lo funcional.

---

## Matriz principal

| # | SCREEN | Clasificación | Base real reutilizable | Falta / contradicción | Referencias |
|---|---|---|---|---|---|
| 25 | Guardería 2/2 Pokémon | **PARCIAL / CONTRADICTORIO** | Motor, render 160×144, cuidados, sprites, HUD, día/noche | Solo **una** mascota activa; el mockup muestra 2 (y variantes muestran 3); carcasa ovalada y 3 botones físicos no implementados como dispositivo | `pet-engine.ts:218,316-324,482-557`; `nursery.ts:154,302-308,318-402,599,864-891`; `main.ts:462-480`; mockup z12/z5 |
| 23 | Ficha Manaphy y permisos | **PARCIAL / CONTRADICTORIO** | Modal de ficha, veredictos, exportación, EV pendientes | No hay permisos por visita, ni visitante, ni vista FICHA/DATOS; mockup mezcla Gen II con 510 EV/naturaleza/IV | `main.ts:222-343`; `nursery.ts:427-530`; `db.ts:75-91` (sin `owner`); mockups z10/z7, z11/z6 |
| 21 | Directorio de jugadores | **PENDIENTE** | Nada específico; patrón de lista en `boxesView` | No hay usuarios, búsqueda, filtros, invitaciones, bloqueos ni notificaciones | `main.ts:268-318`; `SHARED_NURSERIES_SPEC.md:27-41`; `index.ts` (sin rutas) |
| 19 | Crianza y validación | **PENDIENTE / CONTRADICTORIO** | Legalidad triple y `ExportTargets` | No hay compatibilidad, consentimiento ni flags `allow_breeding`; la regla Manaphy+Ditto→Phione no está aprobada en el RFC | `Program.cs:875-908`; `db.ts:75-91`; `BREEDING_DESIGN_RFC.md:12-20`; Stitch §15 |
| 17 | Huevos e incubación GP | **PENDIENTE** | Reloj y timestamps del motor (`advance`) | No hay huevos, cooldown 15 min–3 h, costes GP ni anti-manipulación; fórmula pendiente | `pet-engine.ts:14-18,218`; `BREEDING_DESIGN_RFC.md:28-58` |
| 15 | Eclosión Phione | **PENDIENTE / NO VERIFICABLE** | `drawPet` y sistema de frames | No hay eclosión ni Phione; secuencia de 4 etapas no documentada; sin archivo de pantalla | `nursery.ts:1118`; mockup inexistente; Stitch §28-29 |
| 13 | Animación interactiva Phione | **PENDIENTE / NO VERIFICABLE** | Render de sprites, paleta GBC, `frameRects` | Sin asset de Phione, sin minijuego de eclosión; sin archivo de pantalla | `sprite-render.ts:55`; `sprite-runtime.ts:130`; mockup inexistente |
| 10 | Tienda GP y decoración | **PENDIENTE** | `ROOM_OBJECTS`, `points` del motor (tope 9.999) | No hay GP, tienda, catálogo de decoraciones ni persistencia de decoración; la unidad «PC» del mockup no tiene respaldo | `nursery.ts:1000`; `pet-engine.ts:542`; `MONETIZATION_DESIGN_RFC.md:21-29` |
| 8 | Perfil y privacidad | **PENDIENTE** | i18n y patrón de diálogo `<dialog id="mon">` | Sin cuentas, perfil, notificaciones, privacidad ni cifrado en tránsito/almacenamiento | `index.html:45-48`; `i18n.ts`; `POKEMON_SECURITY_RFC.md` (propuesta) |
| 6 | Equipo y mochila | **IMPLEMENTADO (con matices)** | Pestañas `party` y `bag` del detalle de save | Ya existe como pestaña de la biblioteca, no como vista propia «Equipo Activo»; el mockup `3/6` contradice la capacidad real de la guardería, no del equipo | `main.ts:173-221` (200-203); `main.ts:268-318`; mockups z1/z2/z8 |
| 4 | Cajas PC y filtros de legalidad | **IMPLEMENTADO** | Pestaña `boxes` + `legalityView` + filtros `legal`/`q` + semáforo | Ya operativo; el mockup forense con Celebi GS-Ball no existe como archivo | `main.ts:173-221,268-318`; `index.ts:460`; `nursery.ts` veredictos; `Program.cs:875-895` |
| 2 | Inspección de legalidad (forense PKHeX) | **PARCIAL / NO VERIFICABLE** | PKHeX.Core es autoridad; `inspect`, `scan`, `members`, veredictos con motivos | La ficha actual muestra motivos y veredicto, pero no hay vista «forense» dedicada ni archivo de pantalla; el número de checksums del mockup es ficticio en otros diseños | `Program.cs:78,875-895`; `main.ts:222-237`; `README.md`, `docs/LEGALIDAD.md`; mockup inexistente |

---

## Desglose por pantalla

### SCREEN_25 — Guardería (2/2)

- **Qué ya existe:** lienzo 160×144 con fondo canónico, paleta 4 colores, 7 acciones con cooldown, 6 minijuegos con EV reales, día/noche, HUD HTML, escala entera y pixelación, sprites overworld.
- **Componentes reutilizables:** `pet-engine.ts`, `nursery.ts`, `sprite-runtime.ts`, `guarderia.png`, `daynight.ts`.
- **Solo visual:** carcasa ovalada roja/blanca, tres botones físicos, iluminación de carcasa.
- **Funcional que falta:** dos plazas con foco seleccionable, visitante, indicadores de propiedad.
- **Cambios de navegación:** añadir entrada GUARDERÍA sin eliminar `#nav-nursery`.
- **Pruebas necesarias:** render a 2x-7x; foco alternante; que el canvas siga siendo 160×144; regresión de listeners (`updateSheet`).
- **Riesgo alto:** duplicar el render o perder `updateSheet`; mezclar la carcasa con el LCD (el LCD debe seguir siendo GBC puro).

### SCREEN_23 — Ficha Manaphy / permisos

- **Qué ya existe:** ficha modal con stats, IV, EV, movimientos, origen, veredicto; exportación con dry-run.
- **Qué falta:** pestaña FICHA/DATOS persistente, permisos por estancia, vista de visitante.
- **Contradicción:** datos Gen II con 510 EV y naturaleza en los mockups.
- **Reutilización:** `main.ts:239-343`, `nursery.ts:494-530`.
- **Riesgo:** copiar los valores del mockup como si fueran reales.

### SCREEN_21 — Directorio

- Nada reutilizable salvo patrones de lista y i18n. Requiere backend de usuarios (PG-08).
- Riesgo: exponer partidas o ubicaciones; violar privacidad independiente de ocupación.

### SCREEN_19 — Crianza

- La validación PKHeX ya existe, pero no la compatibilidad reproductiva.
- Requiere consentimiento explícito del propietario y flags; no derivar consentimiento de la admisión.

### SCREEN_17 — Huevos

- El motor ya tiene marcas de tiempo, pero no hay entidad huevo. Fórmula exacta pendiente; no implementar coeficientes inventados.

### SCREEN_15 / SCREEN_13 — Eclosión y animación Phione

- Sin archivos; solo descripción. No hay assets, no hay sprite de sueño (`PG07A_INTEGRATION_REPORT.md:84-95`). Bloqueadas hasta que exista diseño y licencia de sprite.

### SCREEN_10 — Tienda GP

- `points` del motor es un contador local, no una divisa. No hay persistencia de inventario de decoraciones. Los costes GP están pendientes.

### SCREEN_8 — Perfil/privacidad

- Sin cuentas. El cifrado es propuesta del RFC de seguridad; no hay implementación.

### SCREEN_6 — Equipo y mochila

- Implementado como pestañas (`party`, `bag`) dentro del detalle de partida. No requiere trabajo funcional; solo podría reetiquetarse en i18n si se aprueba.

### SCREEN_4 — Cajas PC

- Implementado: `boxesView`, filtros por legalidad y búsqueda (`index.ts:460`).

### SCREEN_2 — Inspección forense

- PKHeX.Core ya es autoridad y se muestran motivos concretos. Falta una vista forense dedicada si se decide; no hay archivo que dicte su diseño.

---

## 1. Cambios de navegación necesarios (propuesta)

1. Añadir `FICHA/DATOS` como vista adyacente a la Guardería, **sin sustituir** las pestañas `party|boxes|bag|legality`.
2. Añadir `EQUIPO ACTIVO` como alias o atajo a `party`, no como duplicador de estado.
3. `JUGADORES` y `SOLICITUDES` solo cuando PG-08 tenga backend; hasta entonces, no mostrar entradas que prometan funcionalidad inexistente.
4. Mantener `Biblioteca` como contenedor de saves y pestañas actuales.

## 2. Recursos gráficos a conservar obligatoriamente

- `apps/web/assets/room/guarderia.png` (160×144, hash `bcedbd66…`).
- Paleta GBC de `nursery.ts:75` y fuente 3×5 `:87-115`.
- Sprites PG-07A y su fallback procedural.
- No usar `STITCH_UPLOAD/03_RECURSOS_GRAFICOS/guarderia.png` (1200×896).

## 3. Dependencias técnicas detectadas

- Tailwind CDN, Google Fonts y fuentes de terceros: **no incorporar**.
- Sin dependencias nuevas: la app corre con Bun + TypeScript + Canvas + PKHeX.Core en sidecar.

## 4. Riesgos de regresión

| Riesgo | Mitigación |
|---|---|
| Perder listeners al repintar la ficha | Usar `updateSheet()` (`:570-592`) como único punto de repintado |
| Romper el escalado responsive | Mantener `applyScale()` y sus cotas; verificar 2x en 390 px |
| Sustituir el fondo canónico | Comparar hash antes y después de cualquier cambio visual |
| Confundir EV con Stat Exp | Usar `capsFor()` y la rama Gen≤2 del motor |
| Mostrar funcionamiento falso | Ninguna acción de Stitch puede quedar como simulación DOM en producción |
