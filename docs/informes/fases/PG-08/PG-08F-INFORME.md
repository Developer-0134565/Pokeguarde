# PG-08F — Informe final

**Fecha:** 19-nov-2026. **Estado:** completada y verificada en local.
**Autorización:** ejecutar PG-08F condicionada a SyncGate; sin commits, pushes,
despliegues ni modificación de partidas. Todo lo entregado es simulación
interna: **no hay funcionalidad disponible en producción**.

---

## 1. SyncGate

**SG-05: PASS WITH WARNINGS.** Detalle completo en
[`PG-08F/SYNCGATE.md`](PG-08F/SYNCGATE.md). No se ejecutaron `fetch`, `commit`,
`push`, `reset`, `clean`, `stash`, `pull`, `rebase` ni `merge`.

- Rama: `main`.
- HEAD local: `7c9c326be0eb4dced4969c5b0f966413d3299dae`.
- `origin/main`: `7c9c326be0eb4dced4969c5b0f966413d3299dae`.
- `HEAD...origin/main`: `0 0`; sin conflictos ni índice preparado.
- 40 entradas locales modificadas/sin seguimiento de PG-08B…E, Stitch y
  sidecar: **conservadas**, no commiteadas ni sobrescritas.
- Baseline antes de implementar: `bun run check` EXIT 0; PG-08A 284/284,
  PG-08B 22/22, PG-08C 33/33, PG-08D 36/36, PG-08E 48/48 (423 PG-08; PG-07H
  101/101 se contabiliza aparte).
- Advertencias: trabajo local sin commitear y archivos WAL/SHM preexistentes
  junto a la BD protegida. Ninguna compromete integridad ni implementación.

## 2. Archivos modificados y creados

**Creados por PG-08F:**

| Archivo | SHA-256 |
|---|---|
| `packages/core/src/egg-pair-domain.ts` | `c380534dca31c4ff9c82bb2fe7c4f901e9a0a108317dc76658a28c6c20de6530` |
| `apps/server/src/shared-egg-pair-store.ts` | `f9f7b200fa401a99c86e7043a385f0b0582e5f810e223035680e3ac185596ac5` |
| `scripts/pg08f-check.ts` | `96e9c1d2600246169b90843337d1c8df4c788625065c544e7bd68a7f6dc83a48` |
| `docs/informes/fases/PG-08/PG-08F/SYNCGATE.md` | (creado en FASE 0) |
| `docs/informes/fases/PG-08/PG-08F/` (10 documentos restantes) | ver índice |
| `docs/informes/fases/PG-08/PG-08F-INFORME.md` | este documento |
| `/home/missingn0/Descargas/PG-08F-INFORME.md` | copia local entregada |

**Modificados por PG-08F:**

- `scripts/check.sh`: añade la suite PG-08F. SHA-256 final
  `2507b37938246340791987b1cf64ce407555d71e092aedfad7878f74ccde32fd`.
- `docs/informes/README.md`: índice actualizado; informes históricos intactos.

No se modificaron frontend de Stitch, estilos, assets, saves, fixtures, PKM,
PKHeX.Core, legalidad, motor Tamagotchi ni `data/pokegotchi.db`. No se
realizaron commits ni pushes.

## 3. Distribución 1+1

Implementada en `egg-pair-domain.ts` + `shared-egg-pair-store.ts`.

- Un ciclo completado produce **dos huevos simulados**, anfitrión e invitado,
  con el mismo `cycleId` y un solo intervalo de crianza (PG-08D intacto).
- `pairEggIdFor(cycle, event, role)` deriva IDs deterministas y distintos,
  reutilizando `eggIdFor` de PG-08E.
- Propietarios independientes por rol (`host` / `guest_owner`); un jugador no
  puede reclamar el huevo ajeno (`RECIPIENT_MISMATCH`).
- La propiedad de los progenitores es inmutable
  (`PARENT_OWNERSHIP_CHANGED`).
- La capacidad se comprueba para ambos; si falta, el par queda recuperable en
  `pair_backlog`, sin reasignación ni duplicación. `DEFAULT_PAIR_CAPACITY=4`
  es un valor de prueba, **no** una política aprobada.

## 4. Garantías de atomicidad

**Transacción real** dentro de una única SQLite para ciclo, dos huevos,
historial, eventos, outbox y backlog: `produceTx()` inserta el ciclo en
`queued`, persiste ambos huevos y solo entonces confirma `produced`. Un fallo
inyectado en el segundo huevo revierte todo; el reintento crea dos huevos, no
uno. `PRAGMA foreign_keys=ON`, `busy_timeout=5000`, claves de idempotencia
`UNIQUE`.

**No hay atomicidad distribuida** entre esta BD, `pokegotchi.db`, el EventStore
PG-08B o la autoridad simulada. Entre recursos con distinto límite se usa
**recuperación consistente por replay y backlog**, documentada como tal, sin
afirmar una transacción inexistente. `replay()` cuenta duplicados y no crea un
tercer huevo; `retry()` reintenta entregas de forma idempotente.

Detalle en [`DISTRIBUCION-1-1.md`](PG-08F/DISTRIBUCION-1-1.md) y
[`ATOMICIDAD-Y-CONCURRENCIA.md`](PG-08F/ATOMICIDAD-Y-CONCURRENCIA.md).

## 5. Pokémon DEMO

- Catálogo tipado de **15 iniciales** Gen I–V con números de Pokédex
  verificables y checksum; sin PKM.
- `createDemoStarter()` fija procedencia permanente
  `DEMO_INTERNAL_NON_EXPORTABLE`, no dependiente del frontend y no reversible
  por metadatos.
- Seis restricciones de dominio: `breed`, `export`, `trade`, `transfer`,
  `import_convert`, `legal_bypass`. `assertDemoAllowed()` y
  `assertBreedablePair()` bloquean crianza, exportación e intercambio
  **por contrato**. No existen rutas HTTP que los invoquen todavía.
- Importados existentes no se reclasifican; procedencia insuficiente →
  `UNKNOWN_UNVERIFIED` con fallo cerrado. PKHeX no se altera.

Detalle en [`POKEMON-DEMO.md`](PG-08F/POKEMON-DEMO.md).

## 6. Entrega y genética

- `EggDeliveryPort` implementado por el store con `pendingEggs`,
  `verifyRecipient`, `prepareDelivery`, `confirmDelivery`, `status` y `retry`.
- Etapas `produced → stored → assigned → available → claimed → delivered`,
  derivadas de los estados PG-08E sin duplicar la máquina de estados.
- **No** entrega huevos a cajas reales, no genera PKM, no modifica inventarios.
- `unresolvedGenetics()` reserva especie, naturaleza, IV/DV, habilidad,
  género, shiny, movimientos heredados, algoritmo y semilla, todos `null`.
  No se calcula genética ni se usa azar.

## 7. Estudio de autoridad online

READ-ONLY, sin despliegue, credenciales, dependencias de pago ni proveedor
elegido. Compara identidad, autenticación, registro, persistencia, recuperación
con anfitrión desconectado, sincronización, replay, TLS, secretos, backups y
failover en tres niveles: arquitectura local actual, simulación y producción.
Costes estimados solo de forma cualitativa (bajo/medio/alto) por falta de
precios verificados. **La auditoría no fue independiente**: el subagente agotó
su cuota; se declara expresamente. Ver
[`AUTORIDAD-ONLINE-SPIKE.md`](PG-08F/AUTORIDAD-ONLINE-SPIKE.md).

## 8. Pruebas ejecutadas

| Suite | Resultado |
|---|---:|
| PG-07H | 101/101 |
| PG-08A | 284/284 |
| PG-08B | 22/22 |
| PG-08C | 33/33 |
| PG-08D | 36/36 |
| PG-08E | 48/48 |
| **PG-08F** | **50/50** |
| **Total PG-08 A–F** | **473/473** |

`bun run check` → **EXIT 0** con la nueva suite integrada. `bun run
scripts/pg08f-check.ts` → 50 casos correctos, 0 fallidos. El detalle está en
[`PRUEBAS.md`](PG-08F/PRUEBAS.md).

Durante el desarrollo la propia suite detectó y corrigió tres defectos:
inserción de huevos antes de la FK del ciclo, `ORDER BY created_at` sobre una
columna inexistente en `pair_eggs`, y una línea base fija de saves que ya no
coincidía con los saves preexistentes en `data/saves/`.

## 9. Integridad

- **17/17 hashes protegidos coinciden**, incluidos los siete `.srm` de
  `fixtures/`.
- `data/pokegotchi.db`:
  `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`
  (idéntico al histórico). El almacén de pares rechaza explícitamente esa ruta.
- Sin PKM ni saves nuevos respecto al inicio de la suite; exportaciones y
  fixtures intactos.
- `integrityCheck()` del almacén: `ok:true`, sin pares incompletos
  confirmados, eventos/outbox/entregas coherentes.
- Las BD de prueba viven en `/tmp/opencode/pg08f-*` y se limpian al terminar.

## 10. Limitaciones conocidas

- Todo es simulación local: no hay servidor público, cuentas, OAuth,
  cifrado en tránsito ni entrega real.
- La autoridad es simulada; dos workers en el mismo equipo no prueban
  concurrencia distribuida.
- La atomicidad es real solo dentro de una SQLite; entre recursos distintos
  hay recuperación por replay.
- El bloqueo DEMO de exportación/intercambio existe en el dominio, pero
  ningún flujo HTTP lo invoca todavía.
- No hay genética, eclosión ni IV/DV calculados.
- La auditoría online no fue independiente.
- Capacidad, asignación y acumulación siguen sin decisión definitiva.

## 11. Estado final y siguiente fase

HEAD local y remoto siguen en
`7c9c326be0eb4dced4969c5b0f966413d3299dae`; los cambios de PG-08B…F y Stitch
permanecen sin commitear. **No se hicieron commits ni pushes.**

**PG-08G queda solo como propuesta no autorizada** en
[`PROPUESTA-PG08G.md`](PG-08F/PROPUESTA-PG08G.md): políticas de capacidad y
asignación, entrega con transporte local inmutable, catálogo DEMO conectado,
contrato genético verificable y auditoría independiente. Requiere autorización
explícita. D4, D8 y D9 siguen pendientes.
