# PG-08G.2E — INFORME CONSOLIDADO — BREEDING CONTRACT FINALIZATION

**Fecha:** 19-nov-2026. **Estado:** documentación y auditoría completadas;
**PG-08G.3 NO autorizado**.

## 1. Resumen de decisiones incorporadas

Se han incorporado BR-01…BR-07 como decisiones del propietario:

- inventario de 20 huevos por usuario;
- chequeo determinista cada 60 minutos;
- umbral `HungryActual / HungryMax >= 0.70` para ambos progenitores;
- producción atómica 1+1;
- recogida idempotente con tránsito al inventario;
- cooldown desde la entrada al inventario, sin crear C4;
- política offline `ALL`, progresiva, con ventanas de 24 h y sin descartar
  tiempo; `maxEvents = 5` queda bajo revisión, no modificado.

Además se conserva el contrato PG-08G.3 ya aprobado: Gen II, RNG
HMAC-SHA256, 1+1, cuatro capas de legalidad, `realPkm:false` y
`exportable:false`.

## 2. Contratos actualizados

| Documento | Contenido |
|---|---|
| `CONTRATO-CRIANZA-V3.md` | Decisiones aprobadas y compatibilidad con PG-08A–G2D. |
| `INVENTARIO-Y-CAPACIDAD.md` | C2 frente a 20, pendientes, inventario y llenado. |
| `CHEQUEOS-HORARIOS.md` | Chequeo horario, identidad y resultados posibles. |
| `HUNGRY-Y-OFFLINE.md` | Umbral, evolución real de `hunger` y ventanas. |
| `PRODUCCION-Y-RECOGIDA.md` | Atomicidad 1+1, estados e idempotencia. |
| `INCUBACION-Y-COOLDOWN.md` | Inicio del cooldown y duración no localizada. |
| `CONFLICTOS-Y-DECISIONES.md` | Dieciséis conflictos con estado y recomendación. |
| `PLAN-PG08G3-ACTUALIZADO.md` | Diez incrementos revisados, no ejecutados. |

Los informes históricos no se han reescrito. PG-08A sigue intacto.

## 3. Conflictos detectados

Los ocho conflictos exigidos por la misión están documentados como C-1…C-8.
Se añadieron C-9…C-16:

- `ALL` no existe hoy en `OfflinePolicy`.
- El chequeo horario convive con la tabla de rareza de PG-08D.
- `maxEvents = 5` no cubre 24 chequeos por ventana.
- `HungryActual`/`HungryMax` no existen como campos.
- `PairMember` no expone hambre.
- No hay referencia local de la duración del cooldown.
- «Inventario» puede significar `stored` o `claimed`.
- El actual `WINDOW_EXCEEDED` descarta tiempo, contrario a BR-07.

## 4. Alternativas recomendadas

1. Inventario = `claimed`, previa aprobación para revisar `CAPACITY_STATES`.
2. `PENDING_CAPACITY` independiente y acotado, valor pendiente.
3. Si un inventario está lleno, fallo atómico de los dos huevos sin consumir
   idempotencia.
4. Chequeo horario como evaluación; producción aún condicionada por rareza
   salvo decisión contraria.
5. Hungry evaluado en cada chequeo con instantánea determinista, no solo al
   final de la ausencia.
6. Los chequeos fallidos cuentan como eventos procesados, no como huevos.
7. 72 horas se procesan como tres ventanas de 24 horas con `checkId`
   determinista.
8. `maxEvents = 24` por ventana de 24 horas, **propuesto**; no aplicado.
9. `incubationStartedAt` igual al `at` de la recogida confirmada.
10. Sin duración de cooldown documentada: fallo cerrado con
    `UNKNOWN_HATCH_COOLDOWN`.

## 5. Decisiones que requieren aprobación humana

- Definición exacta de inventario y consecuencia sobre C2.
- Valor de `PENDING_CAPACITY` o confirmación de que queda diferido.
- Vigencia de la tabla de rareza frente al chequeo horario.
- Mapeo de `HungryActual`/`HungryMax` y proyección de hambre al par.
- Si los chequeos fallidos consumen presupuesto de eventos.
- `maxEvents = 24` y procesamiento progresivo de 72 h.
- Referencia de la duración del cooldown de incubación.
- Interpretación A/B/C de recogida e inventario.

## 6. Estado de preparación de PG-08G.3

El diseño está más completo que en PG-08G.2D, pero sigue **NO autorizado**.
Los incrementos I1…I10 están descritos con dependencias, pruebas, riesgos,
criterios de aceptación y reversibilidad. Ninguno se ha ejecutado.

## 7. SyncGate

- HEAD local = `origin/main` = `7c9c326be0eb4dced4969c5b0f966413d3299dae`;
  divergencia `0 0`; rama `main`.
- Entradas locales iniciales: 48; conservadas.
- `bun run check` EXIT 0; PG-08A–F 473/473; PG-07H 101/101; sidecar 0/0.
- 17/17 hashes protegidos.
- BD `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`,
  `integrity_check = ok`, 4 mascotas; WAL/SHM intactos.
- Sin commits ni pushes; sin cambios de producción, saves, fixtures, BD,
  frontend ni sidecar.

## 8. Verificación final

| Comprobación | Resultado final |
|---|---|
| `bun run check` | EXIT 0; PG-08A–F 473/473; PG-07H 101/101 |
| Hashes protegidos | 17/17 coincidentes |
| Integridad SQLite | `ok`; 4 mascotas |
| Hash de `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |
| HEAD / `origin/main` | `7c9c326…`, divergencia `0 0` |
| `git status --short` | 49 entradas (48 previas + `PG-08G2E/`) |
| Commits y pushes | ninguno |
| Producción, saves, fixtures, frontend, sidecar | sin modificaciones |
| Entregables | 10 `.md` en `PG-08G2E/` |

## 9. Restricción final

Esta misión documenta y audita. **No comienza PG-08G.3.** Se espera una
autorización expresa de ejecución antes de crear cualquier módulo, migración,
store, archivo PKM o cambio de producción.
