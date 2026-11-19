# PG-08G.2G — PLAN FUTURO PG-08G.3 POR ETAPAS

**Estado:** PROPUESTA. **Ninguna etapa queda autorizada por este plan.** La ejecución exige autorización expresa del propietario. Diseñado para implementar crianza sin Marketplace, Centro Pokémon ni economía.

## 1. Vista general

| Etapa | Bloqueada por | Depende de | Autorizada |
|---|---|---|---|
| G3-A contratos TS | nada | — | NO |
| G3-B motor de chequeos y Hungry | decisión de mapeo Hungry | G3-A | NO |
| G3-C producción y pendientes | ratificación conducta capacidad llena | G3-B | NO |
| G3-D inventario y recogida | nada | G3-C | NO |
| **G3-E incubación** | **`UNKNOWN_HATCH_COOLDOWN`** | G3-D | **NO — BLOQUEADA** |
| G3-F offline ALL | nada | G3-B, G3-C | NO |
| G3-G persistencia y API | nada | G3-A…D, G3-F | NO |
| G3-H UI | nada | G3-G | NO |
| G3-I integración y regresión | todas las anteriores | G3-A…H | NO |

Las etapas G3-A…D y G3-F…I son independientes de incubación y pueden planificarse por separado (veredicto `PILOT READY WITH DEFERRED INCUBATION`). G3-E no se implementa ni se simula.

## 2. Detalle por etapa

### G3-A — Contratos TS
- **Dependencias:** ninguna. **Archivos previstos:** `packages/core/src/breeding-contracts.ts` (nuevo), ampliación de `egg-domain.ts` y `egg-pair-domain.ts` sin romper exports.
- **Riesgos:** colisión de numeración BR; campos `HungryActual`/`HungryMax` inexistentes. Mitigado con prefijo `G2G-BR-nn` y `HungrySnapshot`.
- **Pruebas:** compilación; pruebas de tipo; `GEN2-01`.
- **Aceptación:** ocho decisiones representadas; `realPkm:false`, `exportable:false`; sin estados nuevos operativos.
- **Decisión humana pendiente:** confirmar prefijo de IDs (resuelto documentalmente en V5; solo ratificación).

### G3-B — Motor de chequeos y Hungry
- **Dependencias:** G3-A. **Archivos:** `packages/core/src/breeding-engine.ts` (extender con política `all` y `HungrySnapshot`), `apps/web/src/pet-engine.ts` solo como referencia de semántica (NO modificar).
- **Riesgos:** copy erróneo de tasas de hambre; reutilizar valor de desconexión para todas las horas. Mitigado con proyección horaria y reloj inyectado.
- **Pruebas:** `HUN-01`, `HUN-02`, `PROD-01` (parcial), `OFF-01`.
- **Aceptación:** 70 % exacto cumple; 69,99 % falla; fallo cerrado sin instantánea; >7 días sin inferencia.
- **Decisión humana pendiente:** proyección desde `PairMember`/perfil; conducta >7 días.

### G3-C — Producción y pendientes
- **Dependencias:** G3-B. **Archivos:** `packages/core/src/egg-pair-domain.ts`, `apps/server/src/shared-egg-pair-store.ts` (sin conectar a BD real).
- **Riesgos:** entrega parcial; doble consumo de idempotencia con capacidad llena; C2=4 filtrándose como límite.
- **Pruebas:** `ATOM-01`, `PENDING-01`, `PENDING-02`, `PROD-01`.
- **Aceptación:** 1+1 atómico; 2 pendientes por usuario; sin `DEFAULT_PAIR_CAPACITY=4` en producción.
- **Decisión humana pendiente:** ratificar «fallo atómico sin consumir idempotencia y reevaluar»; caducidad de pendientes (D8-A).

### G3-D — Inventario y recogida
- **Dependencias:** G3-C. **Archivos:** dominio de inventario nuevo (aislado); `egg-domain.ts` terminales `claimed`/`cancelled`.
- **Riesgos:** duplicados; mezclar pendientes con inventario; borrar huevos para liberar capacidad.
- **Pruebas:** `INV-01`, `CLAIM-01`, `CLAIM-02`.
- **Aceptación:** 20 `claimed`; solo `claimed` ocupa; recogida idempotente; clave canónica estable.
- **Decisión humana pendiente:** ratificar clave `claim:${cycleId}:${productionEventId}:${recipientRole}:${recipientId}`.

### G3-E — INCUBACIÓN (BLOQUEADA)
- **Dependencias:** G3-D **y decisión humana de cooldown**.
- **Archivos previstos (solo tras desbloqueo):** `IncubationTimer`, campo `cooldownMs`, eventos `hatchable`/`hatched`.
- **Riesgos:** simular duración desconocida; reutilizar 60 min/1–12 h/15 min; activar C4.
- **Pruebas:** `COOL-01` solo en su parte de campos; el resto no se diseña hasta tener duración.
- **Aceptación:** imposible sin duración aprobada. Opciones A/B/C en `COOLDOWN-RECUPERACION.md §5`; ninguna elegida.
- **Decisión humana pendiente:** **duración o fórmula con cita verificable**.

### G3-F — Offline ALL
- **Dependencias:** G3-B, G3-C. **Archivos:** `breeding-engine.ts` (`OfflinePolicy` += `all`), reconciliador de ventanas.
- **Riesgos:** descartar horas con `WINDOW_EXCEEDED`; confundir `backlogMode=single` con `policy=ALL`; reprocesar tras reinicio.
- **Pruebas:** `OFF-01`, `OFF-02`, `OFF-03`, `OFF-04`, `REC-01`, `REC-02`.
- **Aceptación:** 24 h/24 chequeos; 72 h sin pérdida; fallidos no consumen exitosos; sin duplicados.

### G3-G — Persistencia y API
- **Dependencias:** G3-A…D, G3-F. **Archivos:** store aislado nuevo; endpoints de crianza en `apps/server/src/index.ts`; nunca contra `data/pokegotchi.db`.
- **Riesgos:** exponer saves reales; transacción distribuida; escribir sin validación servidor.
- **Pruebas:** `ISO-01`, `SAFE-01`.
- **Aceptación:** rechazo explícito de BD real; toda modificación validada en servidor;BD inalterada.

### G3-H — UI
- **Dependencias:** G3-G. **Archivos:** `apps/web/src/` (nueva vista de crianza), sin tocar Canvas 160x144 ni fondo versionado.
- **Riesgos:** introducir React/Tailwind; mezclar con pestañas de Biblioteca.
- **Pruebas:** revisión visual con背景 versionado; sin cambios en sprites de terceros.
- **Aceptación:** interfaz local, sin dependencias de comercio, sin datos inventados.

### G3-I — Integración y regresión
- **Dependencias:** G3-A…H (excepto G3-E). **Archivos:** `scripts/check.sh` (añadir bloque `PG-08G pilot` al final).
- **Riesgos:** ejecutar `dotnet build` sobre estado protegido; falso positivo por BD real.
- **Pruebas:** las 20 de `MATRIZ-PRUEBAS-PILOTO.md`, `REG-01`.
- **Aceptación:** EXIT 0, 473/473, 101/101, 17/17 hashes, BD íntegra, cero modificaciones a producción.

## 3. Reglas del plan

1. Ninguna etapa autorizada. Cada una requiere autorización explícita previa.
2. Orden estricto de dependencias; no saltarse G3-A.
3. G3-E queda fuera del alcance ejecutable hasta nueva decisión.
4. Sin instalaciones, migraciones, commits ni pushes.
5. Si aparece una dependencia comercial, se documenta y se eleva; no se implementa por defecto.
