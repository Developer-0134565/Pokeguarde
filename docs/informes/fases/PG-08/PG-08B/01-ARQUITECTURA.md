# PG-08B — Arquitectura implementada

**Estado:** VERIFICADO. Capa local de desarrollo, sin exposición de red.
**Fecha:** 19-nov-2026.

---

## 1. Objetivo

Conservar los estados y eventos de los contratos de Guarderías Compartidas
(PG-08A) entre reinicios del proceso, con idempotencia y reconstrucción
determinista, sin convertir el prototipo en un servicio compartido.

## 2. Capas

```
Dominio puro (PG-08A)        packages/core/src/shared-nurseries.ts
        │  produce SyncEvent[] y snapshot()
        ▼
EventStore local (PG-08B)    apps/server/src/shared-store.ts
        │  SQLite WAL, append-only, transacciones
        ▼
Archivo aislado              data/shared-pg08b.db   (NUNCA pokegotchi.db)
```

La persistencia **no contiene reglas de dominio**. Guarda exactamente los
`SyncEvent` que emite `createNurserySystem` y, al abrir, reconstruye el sistema
con `createNurserySystem(events)`. Cualquier decisión sobre propiedad,
capacidad, permisos, revisiones o vales sigue siendo competencia exclusiva del
módulo de PG-08A.

## 3. Decisiones D1, D2 y D3 aplicadas

### D1 — Identidad

Se define la interfaz `OwnerAuthenticator` y los tipos asociados:

```ts
export type OwnerProof = { keyId: string; signature: string; signedAt: string };
export type AuthenticatedOwner = { ownerId: string; verifiedAt: string };
export interface OwnerAuthenticator {
  authenticate(proof: OwnerProof, at?: string): AuthenticatedOwner | Promise<AuthenticatedOwner>;
}
```

Es **solo una interfaz**. No hay implementación, cuentas, inicio de sesión,
claves privadas reales ni credenciales en disco. El store exige un
`AuthenticatedOwner` válido (UUID v4 + marca temporal ISO) en cada comando
mutante y comprueba que coincide con el propietario, anfitrión o actor que
corresponde según la operación. Un `ownerId` suelto no se acepta como prueba.

### D2 — Autoridad

El diseño futuro prevé un registro central autoritativo con cachés locales de
solo lectura y vales firmados. En esta fase **ese registro no existe**: el
EventStore local es una simulación de desarrollo y no debe presentarse como un
servidor autoritativo desplegado. No hay endpoints, descubrimiento ni
operaciones compartidas reales.

### D3 — Persistencia

Se usa un archivo SQLite independiente. El constructor rechaza
explícitamente cualquier ruta cuyo nombre sea `pokegotchi.db`. No se importa
`db.ts` ni se abre la base principal. Las pruebas usan bases temporales en
`/tmp/opencode/pg08b-*` y las eliminan al terminar.

## 4. Superficie pública

- `openSharedStore(options?)` / `new SharedNurseryStore(options?)`.
- `execute(command)` — único camino de mutación.
- `getSystem()`, `snapshot()`, `exportEvents()`, `eventCount()`.
- `importEvents(events)` — carga controlada de eventos ya validados.
- `saveSnapshot(label?)`, `listSnapshots()`, `verifyDeterminism()`.
- `integrityCheck()`, `close()`.

No se añade ninguna ruta HTTP ni interfaz de usuario.

## 5. Propiedades conservadas de PG-08A

Propiedad permanente, capacidad máxima de dos Pokémon, tres permisos
independientes y revocables (desactivados por defecto), estados explícitos,
idempotencia, concurrencia optimista, protección anti-replay y recuperación
mediante vale de siete días renovable. Crianza sigue sin implementarse.
