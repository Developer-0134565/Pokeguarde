# PG-08G.2F — PLAN PG-08G.3 DEFINITIVO (NO EJECUTADO)

**Estado:** plan documental. **PG-08G.3 NO está autorizado.** Este archivo no
crea módulos de producción, no toca BD/saves/fixtures/frontend/sidecar y no
integra pruebas en `scripts/check.sh`.

## 1. Puertas de entrada

Antes de cualquier implementación futura deben verificarse, por escrito:

1. **G3-0.1:** alcance limitado a `gen2-gs` y `gen2-crystal`.
2. **G3-0.2:** vigencia del contrato V4 de esta fase; BR-01…BR-08 son las
   decisiones de producto. Ningún informe histórico se reescribe.
3. **G3-0.3:** inventario = 20 huevos `claimed`; pendientes = 2 por usuario;
   `backlogMode = "single"` sin cola de huevos.
4. **G3-0.4:** rareza PG-08D no es compuerta en este piloto; el chequeo
   elegible produce 1+1.
5. **G3-0.5:** semilla maestra de producción fuera de alcance; RNG HMAC-SHA256
   con `DerivationContext`; sin equivalencia con cartucho.
6. **E-0.1…E-0.5:** herencia/legalidad Gen II verificada, `unverified`
   conservado, `realPkm:false`, `exportable:false`, sin PKM ni exportación.
7. **F-0.1:** duración del cooldown de incubación resuelta por el propietario.
   Hoy: `UNKNOWN_HATCH_COOLDOWN` / `BLOCKED`.
8. **F-0.2:** conducta de inventario lleno al recoger y competencia por los dos
   pendientes. Hoy: `PROPOSED`, no decidida.
9. **F-0.3:** hambre más allá de los 7 días de `MAX_CATCHUP_MS`. Hoy:
   `HUNGRY_HISTORY_UNAVAILABLE`, no decidido.
10. **F-0.4:** precios, niveles y máximo de mejoras de tienda para ampliar
    pendientes. Hoy: diferidos por BR-02.

Sin F-0.1, el incremento I8 solo puede construir el timer en estado `blocked`;
sin F-0.2, I6/I7 no se declaran listos para uso.

## 2. Incrementos

### I1 — Contratos y tipos documentales

- **Archivos previstos:** `experimentos/I1-contratos/{constants.ts,types.ts,adapters.ts,drift.md}`.
- **Dependencias:** `CONTRATOS-TYPESCRIPT.md`; PG-08E/F tipos reales.
- **Pruebas:** AIS-01 y comprobación estática de los 11 tipos; sin SQLite.
- **Riesgos:** confundir `pending` con inventario; redefinir C2; usar `ALL`
  como modo de cola.
- **Aceptación:** los 11 tipos compilan como documentación de tipos; `claimed`
  es el único estado de inventario; cero imports desde producción hacia el
  experimento.
- **Reversibilidad:** borrar el directorio.

### I2 — Claves e idempotencia

- **Archivos previstos:** `experimentos/I2-idempotencia/{keys.ts,keys-check.ts}`.
- **Dependencias:** I1; patrón PG-08A y claves PG-08F.
- **Pruebas:** CHECK-02, CHECK-03, CLAIM-01, CLAIM-02.
- **Riesgos:** reutilizar una clave con distinto contenido; claves que incluyan
  caracteres crudos de `pairRevision`.
- **Aceptación:** prefijos `check:`, `prod:`, `claim:`, `offline:`; reintento
  devuelve el resultado original; `CAPACITY_EXHAUSTED` no consume clave.
- **Reversibilidad:** borrar el directorio.

### I3 — Hungry y chequeos horarios

- **Archivos previstos:** `experimentos/I3-hungry/{snapshot.ts,check.ts,hungry-check.ts}`.
- **Dependencias:** I1; `pet-engine.ts` como fuente de semántica; reloj inyectado.
- **Pruebas:** HUN-01…HUN-06; CHECK-01 y CHECK-04.
- **Riesgos:** usar el valor de desconexión para todas las horas; aplicar
  rareza como compuerta; inventar `HungryActual`/`HungryMax`.
- **Aceptación:** `ratioMicro >= 700_000` en ambos; 69,99 % falla; 70 % y 100 %
  pasan; chequeo elegible produce 1+1; fallidos no consumen éxitos.
- **Reversibilidad:** borrar el directorio.

### I4 — Producción 1+1 y pending

- **Archivos previstos:** `experimentos/I4-produccion/{produce-tx.ts,pending.ts,production-check.ts}`.
- **Dependencias:** I2, I3; `pairEggIdFor`, `OWNER_POLICY_BY_ROLE`, PG-08F.
- **Pruebas:** ATOM-01, ATOM-02, CAP-01, CAP-02.
- **Riesgos:** parcialidad del par; capacidad de uno de los destinatarios;
  cola invisible.
- **Aceptación:** ciclo, evento y dos huevos en una transacción; sin hueco →
  `CAPACITY_EXHAUSTED` sin idempotencia consumida; `backlog=0`.
- **Reversibilidad:** borrar directorio y SQLite temporal.

### I5 — Recogida manual e inventario

- **Archivos previstos:** `experimentos/I5-recogida/{claim.ts,inventory.ts,claim-check.ts}`.
- **Dependencias:** I4; `EggDeliveryPort` de PG-08F.
- **Pruebas:** INV-01, INV-02, CLAIM-01, CLAIM-02, ATOM-03.
- **Riesgos:** recogida automática; inventario lleno; timer iniciado en
  `producedAt`.
- **Aceptación:** recogida explícita; `claimedAt` del reloj inyectado; 19→20
  permitido, 20→21 bloqueado; doble recogida sin duplicar.
- **Reversibilidad:** borrar directorio y SQLite temporal.

### I6 — Incubación bloqueada

- **Archivos previstos:** `experimentos/I6-incubacion/{timer.ts,cooldown-source.md,incubation-check.ts}`.
- **Dependencias:** I5; auditoría `INCUBACION-COOLDOWN-AUDIT.md`.
- **Pruebas:** COOL-01, COOL-02.
- **Riesgos:** usar 60 min, 1–12 h o 15 min como cooldown; crear C4; eclosión
  automática.
- **Aceptación:** sin duración aprobada → `cooldownMs:null`, `blocked`,
  `UNKNOWN_HATCH_COOLDOWN`; `startedAt === claimedAt`; sin archivos PKM.
- **Reversibilidad:** borrar el directorio.

### I7 — Reconciliación offline `ALL`

- **Archivos previstos:** `experimentos/I7-offline/{reconciliation.ts,windows.ts,offline-check.ts}`.
- **Dependencias:** I3, I4, I6; reloj inyectado.
- **Pruebas:** OFF-01…OFF-06, AIS-01.
- **Riesgos:** `WINDOW_EXCEEDED` como descarte; confundir `ALL` con cola;
  perder el cursor tras interrupción.
- **Aceptación:** 24/48/72 h en 1/2/3 ventanas; 24 chequeos por ventana;
  reanudación desde `cursor`; `CLOCK_ROLLBACK` sin mutación; fallidos no
  reducen éxitos.
- **Reversibilidad:** borrar directorio y `/tmp/opencode/pg08g2f-*`.

### I8 — Legalidad y procedencia

- **Archivos previstos:** `experimentos/I8-legalidad/{layers.ts,port-double.ts,legality-check.ts}`.
- **Dependencias:** I1; `LEGALIDAD-Y-PROCEDENCIA.md`, PG-08G1/G2.
- **Pruebas:** LEG-01.
- **Riesgos:** mezclar L2 con L3; pedir a PKHeX que valide un huevo simulado;
  fabricar met data.
- **Aceptación:** L1/L2/L3/L4 separadas; L3 `not_evaluable`; L4 `blocked`;
  `realPkm:false` y `exportable:false`.
- **Reversibilidad:** borrar el directorio.

### I9 — Regresión aislada

- **Archivos previstos:** `experimentos/I9-regresion/{run-all.ts,report.md}`.
- **Dependencias:** I1…I8.
- **Pruebas:** toda la matriz, 30 casos, con la misma semilla.
- **Riesgos:** integrar en `check.sh`; declarar producto listo con F-0.1
  abierta.
- **Aceptación:** EXIT 0 de la suite propia; sin regresiones 473/473 ni
  101/101; 17 hashes; BD intacta; sin commits.
- **Reversibilidad:** borrar el directorio.

### I10 — Cierre documental

- **Archivos previstos:** `experimentos/I10-cierre/{syncgate.md,INFORME.md,*.sha256}`.
- **Dependencias:** I9.
- **Pruebas:** repetir SyncGate y hash de informes.
- **Riesgos:** sobreescribir informes históricos; perder las entradas locales.
- **Aceptación:** HEAD/origin inalterados; recuento de `git status` incrementado
  solo por el directorio nuevo; sin commits ni pushes.
- **Reversibilidad:** borrar el directorio.

## 3. Orden y bloqueos

`I1 → I2 → I3 → I4 → I5 → I6 → I7 → I8 → I9 → I10`.

Los incrementos I1–I5 son ejecutables como experimentos aislados; I6 queda
bloqueado en la duración; I7 es ejecutable para la reconciliación, con
incubación bloqueada; I9 no puede declarar «producto listo» mientras F-0.1,
F-0.2 o F-0.3 sigan abiertos.

## 4. Condición de no ejecución

Esta misión no ejecuta ningún incremento. Se requiere autorización expresa e
independiente para iniciar PG-08G.3, además de las puertas F-0.1…F-0.4.
