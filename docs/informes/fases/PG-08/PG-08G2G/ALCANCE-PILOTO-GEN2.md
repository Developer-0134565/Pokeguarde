# PG-08G.2G — ALCANCE DEL PILOTO GEN II

**Estado:** documental. Ninguna etapa autorizada.

## 1. Objetivo del piloto

Preparar, sin implementar, la crianza de **Gold / Silver / Crystal** (`gen2-gs`, `gen2-crystal`) como subsistema aislado: dos propietarios, un evento exitoso, un huevo por propietario, recogida manual e incubación diferida.

## 2. Incluido (según directiva §3)

| Área | Decisiones aplicables | Estado contractual |
|---|---|---|
| Compatibilidad reproductiva Gen II | `G2G-BR-03`, `G2G-BR-05` | APPROVED; reglas genéticas documentadas en G1 `GEN-II.md` |
| Chequeos horarios | `G2G-BR-03` | APPROVED (60 min, determinista) |
| Hungry | `G2G-BR-04` | APPROVED (≥70 % por progenitor, reconstrucción horaria) |
| Producción garantizada 1+1 | `G2G-BR-03` | APPROVED (sin probabilidad de puesta) |
| Huevos pendientes | `G2G-BR-02` | APPROVED (2 por usuario) |
| Inventario de huevos | `G2G-BR-01` | APPROVED (20 `claimed`) |
| Recogida manual | `G2G-BR-05` | APPROVED (idempotente, con capacidad) |
| Incubación y cooldown | `G2G-BR-06` | Inicio APPROVED (`claimedAt`); duración **BLOCKED** |
| Procesamiento offline | `G2G-BR-08` | APPROVED (`ALL`, 24 h/24 chequeos) |
| Idempotencia y atomicidad | contratos PG-08B/F | IMPLEMENTED en stores de prueba; pendiente de conexión |
| Persistencia aislada y pruebas futuras | directiva §3 | PROPOSED (diseño; sin ejecución) |

## 3. Excluido (según directiva §3)

Marketplace, subastas, Cable Link, GTS, Centro Pokémon, economía, monedas, deudas, antifraude comercial, recompensas comerciales, misiones, prestigio y crianza Gen III–V.

`MED-*`, `TRD-*` y sistemas externos **no son requisitos bloqueantes del piloto**: no existe dependencia técnica directa demostrable. Ver `DEPENDENCIAS-EXCLUIDAS.md`.

## 4. Juegos y frontera genética

- Juegos: `gen2-gs` y `gen2-crystal` únicamente (`G2F/CONTRATO-CRIANZA-V4.md` §3).
- Gen II usa **DVs 0–15**, no IVs 0–31 ni naturalezas/habilidades (`PG-08G1/GEN-II.md` §1).
- Compatibilidad: Egg Group compartido, sexos opuestos, Ditto salvo Ditto×Ditto, genderless solo con Ditto, `No Eggs Discovered` nunca, y la regla exclusiva Gen II de Defense/Special DVs iguales o ±8 (`GEN-II.md` §2).
- Especie resultante: primer estado de la cadena de la madre; Nidoran 50/50; eclosión nivel 5 (`GEN-II.md` §3).
- `InheritIVs` es un bug diferido de Gen III, **no** parte del piloto (`INCUBACION-COOLDOWN-AUDIT.md` §3).

## 5. Invariantes de alcance

1. Un evento exitoso entrega exactamente un huevo a cada propietario; prohibida entrega parcial.
2. Huevos simulados: `realPkm:false`, `exportable:false`, `hatched:false`, `SIMULATED_LOG_ONLY` (`egg-domain.ts:63-67`).
3. Sin writes a saves, PKM, fixtures ni `data/pokegotchi.db`; sin eclosión real ni exportación.
4. RNG HMAC-SHA256, reloj inyectado; sin `Math.random` ni `Date.now`.
5. Atomicidad real solo dentro de una SQLite; entre recursos, replay/reconciliación.
6. C4 (incubación simultánea) queda diferido; no se crea contador ni se infiere C4 = C2.

## 6. Superficie actual (VERIFICADO)

No existen endpoints de crianza en `apps/server/src/index.ts`, ni tablas de huevos en `apps/server/src/db.ts` (`saves`, `pokemon`, `pets`, `exports` únicamente). Existen dominio y stores de prueba: `breeding-engine.ts`, `egg-domain.ts`, `egg-pair-domain.ts`, `shared-egg-store.ts`, `shared-egg-pair-store.ts`. El piloto es por tanto **trabajo futuro**, no continuación de código implementado.
