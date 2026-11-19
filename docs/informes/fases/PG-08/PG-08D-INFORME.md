# PG-08D — Informe final

**Motor de crianza, temporizadores persistentes y recuperación inmediata**
Fecha: 19-nov-2026 · Modalidad: implementación local aislada · Estado: **CERRADA Y VERIFICADA**.

## 1. Resultado

VERIFICADO: motor experimental implementado, 36/36 casos correctos, `bun run check`
con EXIT 0, sin commits ni pushes y sin tocar datos de producción.

La generación de huevos es **simulada**. No se crean Pokémon reales, archivos
PKM ni modificaciones de saves. No se activó ningún servicio público.

## 2. FASE 0 — SYNCGATE (previo a cualquier cambio)

- Repo `/home/missingn0/Proyectos/Pokeguarde`, rama `main`,
  `HEAD == origin/main == 7c9c326be0eb4dced4969c5b0f966413d3299dae`.
- `sha256sum -c /tmp/opencode/pg08a-protected-before.sha256` → 17/17 coinciden.
- `bun run check` baseline → EXIT 0 (todas las suites previas).
- Leídos: `AGENTS.md`, informes PG-08A/B/C, `docs/BREEDING_DESIGN_RFC.md`,
  `docs/SHARED_NURSERIES_SPEC.md`, `docs/informes/README.md`, los contratos de
  guarderías, el EventStore, la autoridad simulada y la cola duradera.
- No se sobrescribió ningún cambio local. No se hicieron commits ni pushes.

## 3. Archivos creados

| Archivo | Contenido |
|---|---|
| `packages/core/src/breeding-engine.ts` | Motor puro con cinco puertos inyectables. |
| `scripts/pg08d-check.ts` | Suite aislada de 36 casos. |
| `docs/informes/fases/PG-08/PG-08D/01-ARQUITECTURA.md` | Arquitectura y límites. |
| `docs/informes/fases/PG-08/PG-08D/02-MAQUINA-ESTADOS.md` | Estados, `cycleId`, operaciones. |
| `docs/informes/fases/PG-08/PG-08D/03-POLITICA-INTERVALOS.md` | Tabla 1-12 h y reloj. |
| `docs/informes/fases/PG-08/PG-08D/04-COMPATIBILIDAD.md` | Proveedor y datos pendientes. |
| `docs/informes/fases/PG-08/PG-08D/05-CONTRATOS-RETIRADA-EXPULSION.md` | D6 aplicada. |
| `docs/informes/fases/PG-08/PG-08D/06-MATRIZ-CARRERAS.md` | Casos A-F. |
| `docs/informes/fases/PG-08/PG-08D/07-PRUEBAS.md` | Cobertura y resultados. |
| `docs/informes/fases/PG-08/PG-08D/08-RIESGOS-Y-PENDIENTES.md` | Riesgos y decisiones. |
| `docs/informes/fases/PG-08/PG-08D/09-PROPUESTA-PG08E.md` | Siguiente fase propuesta. |

## 4. Archivos modificados

- `scripts/check.sh`: bloque «Crianza experimental (PG-08D)».
- `docs/informes/README.md`: índice actualizado (sin alterar informes históricos).

No se modificaron: `shared-nurseries.ts`, `shared-store.ts`, `shared-authority.ts`,
`shared-event-queue.ts`, `pg08c-check.ts`, saves, fixtures, sprites, motor
Tamagotchi, PKHeX.Core, `data/pokegotchi.db` ni `MANIFEST.json`.

## 5. Arquitectura implementada

- `BreedingClock` entrega toda hora; la API del motor no acepta `at` de cliente.
- `BreedingCompatibilityProvider` separa reglas oficiales de rareza provisional;
  `unknown` bloquea la producción.
- `BreedingEventSink` registra eventos `breeding.*` en un outbox SQLite con
  claves únicas. Los eventos de custodia siguen por el outbox PG-08C.
- `BreedingCycleStore` persiste ciclo, huevos, claves procesadas y política.
- `CustodyPort` delega retirada y expulsión en PG-08A a través de la autoridad
  simulada; el anfitrión no cambia propiedad ni exporta Pokémon.

La identidad del ciclo incluye revisión de la pareja: retirar y volver a depositar
produce un ID distinto y el temporizador arranca desde cero. Los huevos
confirmados sobreviven a la cancelación.

## 6. Resultados de pruebas

- `bun run scripts/pg08d-check.ts` → **36 casos correctos, 0 fallidos**.
- `bun run check` → EXIT 0: Motor, Día/noche, Traducciones, PG-07A 54,
  PG-07B/C/D/E, sidecar PKHeX, PG-07F 132, PG-07G 69/69, PG-07H 101/101,
  PG-08A 284/284, PG-08B 22/22, PG-08C 33/33 y PG-08D 36/36.
- El informe de cobertura se revisó además del exit code.

## 7. Hashes protegidos (reconfirmados)

| Archivo | SHA-256 |
|---|---|
| `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |
| `packages/core/src/shared-nurseries.ts` | `bcc3309aecd816fda6648475bdd587a92a438884f4c6771973dce8e34055e513` |
| `packages/core/src/breeding-engine.ts` | `e80a24d8de7d79b9170b8404dfd2336dcf4b52136904d86b5cd3149e1b10480e` |
| `apps/server/src/shared-store.ts` | `625c62c1de6eb60426d706d1aba72cfe697df6964c992e715b5c291c22f58861` |
| `apps/server/src/shared-authority.ts` | `0ee083d81ccd33a266de5764421e5a4b10afbd610cad5c01026726b5008016d8` |
| `apps/server/src/shared-event-queue.ts` | `b24f30c3787b436b12c3cbb1e70a1ae4636975c492d6dd20bbf2e6dc7523539a` |
| `scripts/pg08c-check.ts` | `81b35c2301f85d8f8a706098e46441eb3ae149816bf6f189f19b61c02033537a` |
| `scripts/pg08d-check.ts` | `1ff80b5ff9dde9f6af37227fcd7552a986bb438c65544bec5cdc1329d7833fe3` |
| `scripts/check.sh` | `1b28ae29af3e1113ba31481f1ef8b54dde8c1999e4a993c95fe7ba05242ed2e8` |
| `docs/informes/MANIFEST.json` | `675f2f683d66392bc699f5f6d3e1da7bf62d12a7b1d1c398aeb6f380d339941b` |

Los 17 archivos del manifiesto protegido de PG-08A siguen coincidiendo.

## 8. Estado Git

`HEAD == origin/main == 7c9c326be0eb4dced4969c5b0f966413d3299dae` en `main`.
Cambios locales sin commitear (10 modificados y nuevos archivos untracked).
**Sin commits ni pushes.** No hay BDs temporarias en `data/`.

## 9. Simulación frente a funcionalidad real

| Simulado en PG-08D | No implementado |
|---|---|
| Huevos como registros `simulated: true` | PKM, herencia, IV/DV, naturaleza, movimientos, habilidad, shiny |
| Autoridad local con tokens de prueba | Cuentas reales, servicio desplegado, garantía online |
| Outbox en BD temporal aislada | Sincronización entre jugadores reales |
| Intervalos provisionales 1-12 h | Balance definitivo y catálogo oficial de rarezas |
| Retirada delegada en PG-08A | Exportación del Pokémon a otro save |

## 10. Decisiones pendientes

No adoptadas silenciosamente: rareza definitiva, tabla definitiva de intervalos,
acumulación offline, destinatario de huevos, capacidad máxima, herencia genética,
generaciones compatibles, excepciones de especies y destino al finalizar la
estancia. D4, D8 y D9 siguen pendientes.

## 11. Riesgos

Concurrencia probada por serialización de comandos, no con hilos reales ni red.
Se detectó una colisión de dedupe al cambiar conectividad de la guardería; se
evitó en la suite usando `hostConnected: false` y debe revisarse si se integra
`setConnectivity` con retiradas. La compatibilidad real carece de datos
verificables: `unknown` bloquea producción por diseño.

## 12. Propuesta de siguiente fase

**PG-08E (no autorizada):** catálogo verificable de compatibilidad Gen 1-5,
resolución de decisiones pendientes, spike aislado con PKHeX.Core para validar
un huevo en memoria sin escribir saves. Detalle en
[09 propuesta PG08E](PG-08D/09-PROPUESTA-PG08E.md).
