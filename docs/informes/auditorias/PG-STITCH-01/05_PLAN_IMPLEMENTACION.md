# 05 — Plan de implementación incremental

**Misión:** PG-STITCH-01 · **Fase:** E · **Fecha:** 2026-11-19
**Estado:** PROPUESTO. **No se ha implementado ninguna fase.**

> Convención: cada fase separa **VISUAL** (solo frontend), **BACKEND/SEGURIDAD/PERSISTENCIA** y **PKHeX/LEGALIDAD**. Una fase no puede pasar a la siguiente hasta cerrar sus decisiones pendientes.

---

## 0. Principios ordenadores

1. No tocar `data/pokegotchi.db`, saves, fixtures ni exportaciones sin autorización explícita.
2. No introducir dependencias npm, Tailwind, fuentes remotas ni servicios externos.
3. PKHeX.Core sigue siendo la única autoridad de parseo, conversión y legalidad.
4. Los valores de los mockups no son reglas: Gen II sigue usando Stat Exp 65.535 por stat.
5. Toda acción que parezca operativa debe estar respaldada por código real; prohibidas las simulaciones DOM de exportación/sincronización.
6. Las dos plazas pertenecen al modelo de Guarderías compartidas (PG-08); el modo local mantiene una mascota activa hasta que se decida lo contrario.

---

## PG-07B — Carcasa Tamagotchi, botones y HUD

**Objetivo:** dar al frontend la apariencia de dispositivo Pocket Tech 1999 (carcasa ovalada roja/blanca, tres botones) sin alterar el LCD GBC de 160×144 ni las mecánicas.

**Dependencias:** ninguna de backend. Solo requiere aprobación visual y respetar PG-07A.

**Archivos afectados (propuestos):**
- VISUAL: `apps/web/src/style.css`, `apps/web/src/nursery.ts` (solo `paintShell`, `paintControls`, `updateSheet`, `applyScale`), `apps/web/index.html` (etiquetas `data-i18n` si procede).
- SIN TOCAR: `pet-engine.ts`, `db.ts`, `index.ts`, `Program.cs`, saves.

**Componentes nuevos (propuesta):**
- `shell.html`/plantilla de carcasa (o función `paintShellFrame()` en TS sin frameworks).
- Tres controles accesibles con `aria-label` (izq. ciclar, centro A/aceptar, der. B/volver).
- Mapa de eventos teclado/táctil → acciones existentes.

**Componentes reutilizados:** `paintShell()`, `paintControls()`, `updateSheet()`, `applyScale()`, `paintHud()`, paleta `C` y fuente 3×5.

**Riesgos:** (1) romper el reenganche de listeners; (2) escalar la carcasa en vez del canvas y perder pixelación; (3) meter estilos de la carcasa dentro del LCD; (4) romper el layout móvil de 2x (320×288).

**Pruebas:** render 160×144 lógico; escala 2x-7x; `imageSmoothingEnabled=false`; ratio 1,1111; 390×844 sin desbordes; clicks de los 3 botones; teclado; `getImageData` del fondo canónico; regresión de `updateSheet`.

**Criterios de aceptación:** el canvas sigue siendo 160×144 con hash de fondo intacto; los 7 cuidados y 6 entrenamientos siguen funcionando; HUD bajo el lienzo; sin nuevas dependencias; sin cambios en BD ni saves.

**Complejidad relativa:** Media (visual). **Decisiones pendientes:** aprobación del diseño de carcasa; si los botones son solo navegación o también sustituyen a los botones HTML actuales; idioma de las etiquetas.

**Clasificación:** primera fase implementable con seguridad (bajo autorización), porque no toca persistencia, saves ni legalidad.

---

## PG-07C — FICHA/DATOS y componentes compartidos

**Objetivo:** crear una vista FICHA/DATOS reutilizable para mascotas propias y visitantes, con necesidades, estado, EV/Stat Exp, guías, entrenamiento y exportación, sin duplicar lógica.

**Dependencias:** PG-07B (por el contenedor visual). No requiere backend nuevo si solo muestra datos ya disponibles.

**Archivos afectados:**
- VISUAL: `apps/web/index.html` (nueva sección), `main.ts` (navegación), `nursery.ts` (extraer `petSheet`/`exportBlock` a módulo compartido, p. ej. `src/pet-sheet.ts`), `style.css`, `i18n.ts`.
- BACKEND: ninguno en la primera entrega; reutilizar `/api/pets/:id`, `/api/pets/games`, `/api/pets/:id/export`.
- PKHeX: reutilizar el informe de exportación; **sin cambios** en `Program.cs`.

**Componentes nuevos:** `pet-sheet.ts` (ficha compartida), `export-card.ts` (dry-run + escritura), `stat-bars.ts` (barras con `capsFor`).

**Componentes reutilizados:** `main.ts:239-343` (ficha Pokémon), `nursery.ts:494-530,427-492`, `pet-engine.ts` (`capsFor`, `evTotals`, `moodOf`), i18n.

**Riesgos:** duplicar la ficha y que diverge; confundir EV con Stat Exp; romper el modal `<dialog id="mon">`; perder el botón de exportar al repintar.

**Pruebas:** ficha de mascota Gen 1/2 (65.535) y Gen 3+ (255/510); veredicto legal/unverified/ilegal; export dry-run y applied/withheld; teclado y accesibilidad.

**Criterios de aceptación:** una sola implementación de la ficha; Parcial→Implementado para SCREEN_23 en lo que no depende de permisos; sin simulaciones; i18n ES completo.

**Complejidad relativa:** Media-Alta (refactorización). **Decisiones pendientes:** si FICHA/DATOS sustituye o complementa `#pg-sheet`; qué campos se muestran a un visitante; cuándo se habilita la edición de amistad/movimientos (hoy no implementada).

---

## PG-08 — Jugadores, Guarderías compartidas, solicitudes, permisos y recuperación

**Objetivo:** convertir las decisiones DECIDIDAS en `SHARED_NURSERIES_SPEC.md` y `AGENTS.md` en backend transaccional e interfaz social, preservando titularidad y modo local.

**Dependencias:** PG-07C para la ficha de visitante. Requiere decisiones de autenticación y cifrado antes de cualquier exposición web.

**Archivos afectados:**
- BACKEND/PERSISTENCIA: `apps/server/src/db.ts` (tablas `users`, `nurseries`, `stays`, `requests`, `permissions`, `audit_log`; columna `owner` en `pets`), `index.ts` (rutas), migración **autorizada** (nunca ejecutar en esta misión).
- SEGURIDAD: cifrado en almacenamiento y tránsito, verificación de permisos en servidor, idempotencia con claves de operación, trazabilidad.
- VISUAL: `index.html`, `main.ts` (pestañas Jugadores/Solicitudes), `i18n.ts`, `style.css`.
- PKHeX: solo para decidir qué veredictos permiten depósito; **no** alterar `Program.cs` sin aprobación.

**Componentes nuevos:** gestor de estados (7 estados), reserva atómica, directorio, bandeja de solicitudes, panel de permisos, recuperación offline.

**Componentes reutilizados:** `listPets`, `getPetById`, `petView`, `main.ts` listas, i18n.

**Riesgos críticos:** (1) duplicación de Pokémon; (2) reserva no atómica; (3) exponer saves originales; (4) dependencia de conexión para recuperar; (5) mezclar publicidad y ocupación; (6) sobrescribir saves por acciones multijugador.

**Pruebas:** concurrencia de dos solicitudes sobre la última plaza; idempotencia de aceptar/recoger; revocación de permisos en caliente; recuperación con anfitrión offline; que un Pokémon no esté en dos guarderías; auditoría de cambios; que el save original no se exponga ni se modifique.

**Criterios de aceptación:** capacidades 2; 7 estados; solicitud pendiente sin depósito; reserva atómica; 3 permisos desactivados por defecto; propiedad permanente; modo local sin cuentas.

**Complejidad relativa:** Muy alta (backend + seguridad + migración + UI). **Decisiones pendientes:** autenticación (¿local sin cuentas vs web con cuentas?), transporte/cifrado, protocolo concreto de recuperación offline, identidad del propietario, modelo de notificaciones.

**Clasificación:** NO implementable hasta cerrar autenticación y cifrado; las decisiones funcionales ya están tomadas, los mecanismos no.

---

## PG-09 — Crianza, compatibilidad, huevos y eclosión

**Objetivo:** implementar crianza entre propietarios con consentimiento, un huevo por participante e incubación 15 min–3 h, con integridad verificable.

**Dependencias:** PG-08 (propiedad, permisos, transacciones) y aprobación de reglas pendientes (Manaphy/Ditto→Phione, fórmula, saves).

**Archivos afectados:**
- BACKEND: `db.ts` (tablas `breeding_requests`, `eggs`, `hatch_events`), `index.ts` (rutas), reloj de servidor.
- PKHeX/LEGALIDAD: `Program.cs` solo si se decide generar huevos legalmente en el save; validación de compatibilidad por generación y cadenas oficiales.
- VISUAL: vistas de crianza, huevos e eclosión; sprites de Phione (licencia pendiente).
- MOTOR: `pet-engine.ts` solo si el huevo se convierte en mascota; **no** alterar `capsFor`.

**Componentes nuevos:** validador de compatibilidad, generador de huevo con semilla de servidor, temporizador UTC con política offline, eclosión.

**Componentes reutilizados:** legalidad y `ExportTargets`, motor de timestamps, render de sprites, i18n.

**Riesgos críticos:** (1) fabricar datos ilegales; (2) duplicar huevos/recompensas; (3) manipulación del reloj del cliente; (4) consentimiento implícito por permiso de breeding; (5) efectos no resueltos en saves originales; (6) assets de Phione sin licencia.

**Pruebas:** incompatibilidad por generación; consentimiento denegado; dos propietarios → un huevo cada uno; propietario único → reparto pendiente; límites 15 min y 3 h; aceleración GP deshabilitada sin saldo; reintento idempotente; revalidación PKHeX; reloj manipulado.

**Criterios de aceptación:** 1 huevo por participante; rango de incubación respetado; sin cambios en IV (0-15 en Gen I/II); sin writes a saves sin autorización; transaccional.

**Complejidad relativa:** Muy alta. **Decisiones pendientes:** fórmula exacta, resultado Manaphy+Ditto, reglas de reloj/offline, costes GP, herencia de movimientos, efectos en saves, licencia de Phione.

**Clasificación:** BLOQUEADO por decisiones funcionales; no implementar.

---

## PG-10 — Guardipuntos, tienda y decoración

**Objetivo:** crear una divisa gratuita obtenida jugando y un catálogo de decoración de la habitación, sin compras reales ni transferencias.

**Dependencias:** PG-07B (render), decisión de fuentes de GP. Opcionalmente PG-08 si los GP se vinculan a perfil.

**Archivos afectados:**
- BACKEND/PERSISTENCIA: `db.ts` (`wallet`, `catalog`, `room_decor`), `index.ts` (rutas de saldo y compra), validación de saldo en servidor.
- VISUAL: `nursery.ts` (`ROOM_OBJECTS` extensible), tienda, inventario de decoración, `i18n.ts`.
- MOTOR: junction con `points` (:542, tope 9.999) solo como fuente, no como divisa.

**Componentes nuevos:** catálogo curado, transacción de gasto, persistencia de decoración por habitación.

**Componentes reutilizados:** `ROOM_OBJECTS`, `drawRoom`, `paintHud`, i18n.

**Riesgos:** divisa transferible o comprable (contradice el RFC); duplicación por concurrentes; romper el fondo canónico al superponer objetos; costes inventados.

**Pruebas:** saldo no negativo; gasto atómico; sin transferencia; sin endpoints de pago; decoración persistente; render sin romper 160×144 y pixelación.

**Criterios de aceptación:** GP solo jugando; catálogo curado; sin dinero real; sin impacto en saves; costes aprobados documentalmente.

**Complejidad relativa:** Media-Alta. **Decisiones pendientes:** fuentes y costes exactos, límite de saldo, alcance por perfil/habitación, relación con `points`.

**Clasificación:** NO implementable hasta fijar costes y fuentes; la parte puramente visual del catálogo podría prototiparse, pero sin economía activa.

---

## 1. Orden recomendado

| Orden | Fase | Motivo |
|---|---|---|
| 1 | **PG-07B** | Visual, sin persistencia ni saves; desbloquea el contenedor para todo lo demás |
| 2 | **PG-07C** | Reutiliza datos existentes; ordena la ficha antes de añadir visitantes |
| 3 | **PG-08** | Base de propiedad/permisos; requisito previo inevitable de PG-09 y de GP por jugador |
| 4 | **PG-09** | Depende de PG-08 y de decisiones pendientes; mayor riesgo legal/PKHeX |
| 5 | **PG-10** | Puede solaparse con PG-08, pero se beneficia de su modelo de identidad |

PG-09 y PG-10 **no deben implementarse en paralelo** con PG-08 hasta que existan transacciones y auditoría.

---

## 2. Primera fase implementable con seguridad

**PG-07B**, siempre que:
- se autorice expresamente su implementación;
- se conserven criterios de aceptación del informe 06;
- no se modifiquen `pet-engine.ts`, `db.ts`, `index.ts`, `Program.cs`, saves ni assets canónicos;
- se ejecuten `bun run check` y las comprobaciones de render **con autorización** para escribir artefactos de build.

Es la única fase cuyo riesgo se limita a la presentación y que puede revertirse sin migraciones de datos.

---

## 3. Matriz rápida de separación de responsabilidades

| Fase | Visual | Backend | Seguridad | Persistencia | PKHeX |
|---|---|---|---|---|---|
| PG-07B | Sí | No | No | No | No |
| PG-07C | Sí | No (reutiliza) | No | No | No (reutiliza informe) |
| PG-08 | Sí | Sí | Sí (crítico) | Sí (migración) | Solo política de veredictos |
| PG-09 | Sí | Sí | Sí (crítico) | Sí | Sí (crítico) |
| PG-10 | Sí | Sí | Sí (saldo) | Sí | No |
