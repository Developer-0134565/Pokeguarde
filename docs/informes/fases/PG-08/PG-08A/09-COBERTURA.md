# PG-08A — Cobertura real y simulada

**Estado:** VERIFICADO (los hechos marcados como simulados NO se presentan como funcionalidad desplegada).

Este documento separa con precisión qué se ha ejecutado de verdad en el repositorio de qué se ha modelado únicamente en un módulo puro en memoria. La distinción es obligatoria: PG-08A prepara una arquitectura; NO activa servicios online ni implementa multijugador.

---

## 1. Cobertura REAL (ejecutada y comprobada)

| Elemento | Qué se ejecutó | Evidencia |
|---|---|---|
| Auditoría de arquitectura |Lectura READ-ONLY de AGENTS.md, README.md, 5 documentos de decisión, 3 informes PG-07 y todo el código relevante (db.ts, index.ts, sidecar.ts, pet-engine.ts, nursery.ts, main.ts, Program.cs, check.sh). | `01-AUDITORIA.md` |
| Línea base | `bun run check` antes de cualquier cambio → EXIT 0, «Todo correcto.», PG-07A 54, PG-07F 132, PG-07G 69/69, PG-07H 101/101, sidecar 0 avisos/0 errores. | `08-PRUEBAS.md` |
| Contratos tipados | Módulo TS puro `packages/core/src/shared-nurseries.ts`, 1165 líneas, SHA-256 `bcc3309aecd…555e513`. Compilado y ejecutado por Bun. | `07-CONTRATOS.md` |
| Validadores estrictos | 8 validadores ejecutados sobre datos válidos e inválidos: identificadores no UUID, claves de idempotencia cortas/no ASCII, estados fuera de enum, veredictos incorrectos, generación 6, origin de Gen 1 con caja 0, clave de consentimiento de 1 carácter. | `07-CONTRATOS.md`, `08-PRUEBAS.md` |
| Suite de pruebas | `scripts/pg08a-check.ts`, 390 líneas, 20 escenarios exigidos, **284/284 comprobaciones correctas**, exit 0. | `08-PRUEBAS.md` |
| Integración en verificación | `scripts/check.sh` ejecuta la suite antes de «Todo correcto.». `bun run check` completo → EXIT 0 con PG-07A–H intactos y la nueva sección PG-08A. | `08-PRUEBAS.md` |
| Integridad de archivos protegidos | `sha256sum -c /tmp/opencode/pg08a-protected-before.sha256` → **17/17 «La suma coincide»**, incluida la BD real. | `10-INTEGRIDAD.md` |
| Estado Git | HEAD `819b73b4…`, 0 commits, 0 pushes, sin cambios en archivos protegidos. | `10-INTEGRIDAD.md` |
| Documentación técnica | 12 documentos bajo `/home/<usuario>/Descargas/PG-08A/` y el informe final. | este conjunto |

**Hecho relevante:** la suite incluye una comprobación activa de no escritura en producción: calcula el SHA-256 de `data/pokegotchi.db` al inicio y al final de las 20 pruebas y exige que sea idéntico.

---

## 2. Cobertura SIMULADA (modelo en memoria, NO desplegado)

| Concepto | Cómo se simula | Qué NO implica |
|---|---|---|
| Registro autoritativo | `createNurserySystem()` mantiene un log de eventos en memoria con `sequence` monótono y `restore(log)`. | No existe servidor, base de datos multijugador, quorum ni persistencia durability. Un reinicio del proceso pierde el log salvo que se vuelvan a inyectar los eventos. |
| Identidad de propietario | `OwnerId` UUID v4 branded, registrado mediante `registerOwner`. | No hay autenticación, credenciales, sesión, token ni prueba de posesión. Cualquier llamador puede declarar cualquier UUID. |
| Consentimiento | `consentKey` ASCII de 8-128 caracteres entregada por el propietario en `grantPermission`. | No hay firma criptográfica, UI de consentimiento, expiración del consentimiento ni auditoría ante terceros. |
| Capacidad y concurrencia | Revisión optimista con `expectedNurseryRevision` y `STALE_REVISION`; las pruebas simulan dos aceptaciones «simultáneas» en el mismo hilo. | No hay bloqueos entre procesos, transacciones SQLite reales ni garantía de serializabilidad distribuida. |
| Recuperación offline | `requestRecovery` emite un `RecoveryVoucher` de 7 días; `completeRecovery` lo consume sin consultar la conectividad del anfitrión. | No hay servicio que emita ni valide el vale fuera del proceso. No se ha probado una partición de red, un servidor caído ni un ataque de repetición entre reinicios reales. |
| Sincronización | `exportEvents()` vuelca el log; `restore()` lo reconstruye y recrea la idempotencia por prefijo de comando. | No hay transporte, confirmación de entrega, reintentos con backoff, resolución de conflictos entre dos réplicas ni reloj lógico distribuido. |
| Estados derivados | `deriveNurseryState()` calcula `available`/`partially_occupied`/`full`/`disconnected`/`unavailable`/`recovery_pending`/`sync_error`. | La UI real de Pokeguarde NO consume estos estados; la Guardería actual sigue siendo la lista local de mascotas. |
| Legalidad | `PokemonRef.verdict` se toma como dato de entrada ya calculado por PKHeX.Core. | El módulo NO invoca al sidecar ni recalcula legalidad. No se ha creado una cuarentena nueva. |
| Datos del Pokémon | `care()` solo emite `care.applied`; `snapshot()` y las comparaciones JSON comprueban que `stay.pokemon` no cambia. | No se ha implementado el efecto real de las bayas EV ni de los minijuegos EV en un save; el motor PG-07 ya existente no ha sido modificado. |
| Crianza | `requestBreeding` comprueba el permiso, emite `breeding.requested` y devuelve `BREEDING_NOT_IMPLEMENTED`. | No hay huevos, compatibilidad, aceleración ni recompensa a propietarios. Cumple la prohibición expresa de la misión. |

---

## 3. Lo que NO está cubierto (decisiones pendientes, no omisiones involuntarias)

1. **Ninguna cobertura de red**: no hay endpoints nuevos, TLS, CORS, rate limiting ni descubrimiento de guarderías.
2. **Ninguna cobertura de cifrado**: ni en reposo ni en tránsito; el RFC de seguridad es PROPUESTA y PG-08A no lo implementa.
3. **Ninguna cobertura de autenticación real**: la suplantación de propietario es imposible de mitigar en el modelo puro; está documentada como riesgo ALTO en `06-AMENAZAS.md`.
4. **Ninguna cobertura de persistencia real**: no se crean tablas `users`, `nurseries`, `stays` ni `permissions` en `data/pokegotchi.db`.
5. **Ninguna cobertura de interfaz**: no se ha tocado `apps/web/`; la navegación y la Guardería visibles siguen siendo las de PG-07.
6. **Ninguna cobertura de concurrencia entre procesos**: la prueba 11 es una simulación lógica, no una prueba de estrés ni de transacciones concurrentes.

---

## 4. Criterios de aceptación de la misión — resultado

| Criterio | Estado | Base |
|---|---|---|
| Contratos definidos y validados | VERIFICADO | 8 validadores, 284/284 comprobaciones |
| Propiedad original protegida por el modelo | VERIFICADO | `02-MODELO-PROPIEDAD.md`, tests 2, 8, 9, 19 |
| Tres permisos independientes y revocables | VERIFICADO | tests 5, 6, 7 |
| Capacidad máxima dos | VERIFICADO | tests 3, 4, 11 |
| Recuperación offline técnicamente viable | VERIFICADO **en el modelo**; servidor real PENDIENTE | `05-RECUPERACION-OFFLINE.md`, tests 8, 9, 14 |
| Amenazas principales documentadas | VERIFICADO | `06-AMENAZAS.md`, 13 amenazas |
| Decisiones pendientes identificadas | VERIFICADO | `11-DECISIONES-PENDIENTES.md`, 9 decisiones |
| Pruebas satisfactorias | VERIFICADO | 284/284, `bun run check` EXIT 0 |
| Sin cambios en producción | VERIFICADO | 17/17 hashes, 0 commits |
| Informe final entregado | VERIFICADO | `../PG-08A-INFORME.md` |

---

## 5. Conclusión

PG-08A demuestra **en un aislado de pruebas** que el modelo de propiedad, permisos, capacidad y recuperación es internamente coherente y que no degrada la aplicación existente. La cobertura real es la del análisis, los contratos y las pruebas; la cobertura simulada es la del comportamiento multijugador. Antes de cualquier despliegue se requieren decisiones humanas y componentes que esta misión prohíbe implementar (autenticación, servicio autoritativo, cifrado y persistencia compartida).
