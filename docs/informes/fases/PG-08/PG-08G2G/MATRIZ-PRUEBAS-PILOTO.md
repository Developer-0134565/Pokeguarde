# PG-08G.2G — MATRIZ DE PRUEBAS DEL PILOTO (DISEÑADAS, NO EJECUTADAS)

**Estado:** PROPUESTAS. Ninguna prueba se ejecutó en esta misión; no se modificó repositorio, BD ni fixtures. Todas deben correr contra SQLite aislada con reloj y RNG inyectados.

## 1. Matriz de 20 pruebas

| # | ID | Prueba | Setup / entrada | Resultado esperado | Bloqueo |
|---|---|---|---|---|---|
| 1 | `GEN2-01` | Compatibilidad Gen II | Egg Group compartido, sexos opuestos, `gen2-gs`; segundo caso Ditto×Ditto | `eligible`/`PAIR_INVALID` según regla; Ditto×Ditto inválido | ninguno |
| 2 | `HUN-01` | Hungry por debajo del umbral | `hunger = 69` en A, 90 en B | `HUNGRY_BELOW_THRESHOLD`; cero huevos | ninguno |
| 3 | `HUN-02` | Hungry exactamente 70 % | `hunger = 70` en ambos | **Cumple** (`>=`); producción 1+1 | ninguno |
| 4 | `PROD-01` | Producción garantizada | Todas las condiciones válidas, 100 ejecuciones con semillas distintas | 1+1 en las 100; cero aleatoriedad de puesta | ninguno |
| 5 | `ATOM-01` | Entrega atómica 1+1 | Capacidad libre en ambos | Dos huevos en un `COMMIT`; `UNIQUE(cycle_id,recipient_role)`; rollback si falla el segundo | ninguno |
| 6 | `PENDING-01` | Dos pendientes por propietario | Dos ciclos exitosos | `pending(A)=2`, `pending(B)=2`; límite respetado | ninguno |
| 7 | `PENDING-02` | Capacidad pendiente agotada | Tercer ciclo con A en 2/2 | `PENDING_FULL`, cero huevos, idempotencia NO consumida; reevaluar siguiente chequeo | decisión ratificación (propuesta) |
| 8 | `INV-01` | Inventario con 19 y 20 huevos | 19 → recoger: OK (20); 20 → recoger: `INVENTORY_FULL` | Límite 20 `claimed`; clave no consumida; huevo sigue pendiente | ninguno |
| 9 | `CLAIM-01` | Recogida manual | Huevo `available`, rol guest | Pasa a `claimed`; `claimedAt` = `at` real; inicia incubación (bloqueada) | ninguno |
| 10 | `CLAIM-02` | Doble recogida | Misma `claimKey` dos veces + tras reinicio | `CLAIM_DUPLICATE`; un solo huevo; `created:false` en reintento | ninguno |
| 11 | `COOL-01` | Inicio desde `claimedAt` | `producedAt=T0`, `claimedAt=T0+3 h` | `incubationStartedAt = T0+3 h`; `cooldownMs=null`; `readyAt=null` | **G3-E BLOCKED** (solo campos, sin duración) |
| 12 | `OFF-01` | Reconexión tras 24 h | cursor en T0, now=T0+24 h | 1 ventana, 24 chequeos, sin pérdida | ninguno |
| 13 | `OFF-02` | Reconexión tras 72 h | cursor en T0, now=T0+72 h | 3 ventanas de 24 h; 72 chequeos; sin descarte | ninguno |
| 14 | `OFF-03` | Reconexión >7 días | now=T0+8 días | `HUNGRY_HISTORY_UNAVAILABLE`; sin inferencia; sin extender `MAX_CATCHUP_MS` | decisión pendiente |
| 15 | `OFF-04` | Fallos que no consumen eventos exitosos | 10 chequeos fallidos + 1 válido | `checksFailed=10`, `checksSucceeded=1`, `productionEvents=1`; `maxEvents=5` no aplica | ninguno |
| 16 | `REC-01` | Reintento después de interrupción | Simular fallo a mitad de transacción | `ROLLBACK` total; `replay`/`retry` reproduce; sin huevo huérfano | ninguno |
| 17 | `REC-02` | Recuperación sin duplicados | Reinicio + `drainBacklog` + `integrityCheck` | Mismo `eggId`; `created:false`; cero duplicados | ninguno |
| 18 | `ISO-01` | Persistencia aislada | Apuntar store a `data/pokegotchi.db` | `STORE_ISOLATION_VIOLATION`; BD real intacta (hash inalterado) | ninguno |
| 19 | `SAFE-01` | Protección de saves reales | Ejecutar flujo completo con fixtures protegidos | Hash de todos los `.srm` y de `data/pokegotchi.db` idéntico; 17/17 | ninguno |
| 20 | `REG-01` | Regresión PG-08A–F | `bun run check` completo | EXIT 0; 473/473; 101/101; sidecar 0 avisos; 17/17 | requiere entorno aislado |

## 2. Casos límite embebidos

- `HUN-02` cubre 70 % exacto; añadir aserción auxiliar para `ratio = 0.6999` → fallo (micro 699000 < 700000).
- `HUN-01` añade caso `hunger = 100` → cumple y un progenitor solo → no produce.
- `OFF-01/02` usan instantáneas por hora: Hungry cae por debajo en una hora → ese chequeo se salta; no se reutiliza el valor de desconexión.
- `INV-01` verifica que los pendientes no consumen las 20 posiciones.

## 3. Reglas de ejecución

1. Nunca contra BD, saves, fixtures ni exportaciones reales. Usar `/tmp/opencode/pg08g3-*/pokegotchi.db`.
2. Reloj inyectado; `fixedClock`; sin `Date.now`. RNG HMAC-SHA256 con semilla de prueba; sin `Math.random`.
3. SQLite en memoria o archivo temporal con `BEGIN IMMEDIATE`; una transacción por evento.
4. `bun run check` incluye `dotnet build` (escribe artefactos): solo ejecutar en entorno donde esté confirmado el aislamiento. En esta misión: `NOT_RUN`.
5. Registrar para cada prueba: ID, semilla, marca, hash de BD de prueba y resultado. Un test que pasa no prueba cobertura: revisar el informe.

## 4. Integración futura

Añadir al final de `scripts/check.sh` en la etapa G3-I, detrás de PG-08F, con un bloque comentado `PG-08G pilot`. No modificar `check.sh` sin autorización de implementación.
