# PG-08B — Autoridad, seguridad y límites

**Estado:** IMPLEMENTADO/DISEÑADO SEGÚN D1 Y D2. **No desplegado.**

## 1. D1 — Identidad: solo una interfaz

`shared-store.ts` define, y solo define:

```ts
export type OwnerProof = {
  readonly keyId: string;
  readonly signature: string;
  readonly signedAt: string;
};

export type AuthenticatedOwner = {
  readonly ownerId: string;   // UUID v4
  readonly verifiedAt: string; // ISO UTC
};

export interface OwnerAuthenticator {
  authenticate(proof: OwnerProof, at?: string):
    AuthenticatedOwner | Promise<AuthenticatedOwner>;
}
```

**No hay implementación.** No se crean cuentas, no hay login, no se guardan
claves privadas reales y no se acepta un `ownerId` arbitrario como prueba: todo
comando mutante exige un `AuthenticatedOwner` y el store comprueba que coincide
con el propietario/actor/host derivado del comando.

Las pruebas usan un objeto autenticado construido explícitamente como
**simulación local**; no demuestra identidad entre usuarios reales.

## 2. D2 — Autoridad real frente a simulación local

| | Registro central autoritativo (futuro, NO implementado) | EventStore local PG-08B |
|---|---|---|
| Ubicación | servicio con contrato y despliegue definidos (D2) | `data/shared-pg08b.db`, único proceso local |
| Rollback / resolución de conflictos | autoridad + `STALE_REVISION` (D5, pendiente) | secuencias y revisiones del dominio, sin red |
| Vales | emitidos y verificados por la autoridad | emitidos por el dominio en memoria y persistidos aquí |
| Clients | caché local de solo lectura | no hay caché remota; `snapshots` es derivable y local |
| Confianza | firma y registro verificables | confía en el proceso local |

**Este EventStore NO es un servidor autoritativo desplegado.** Es un banco de
pruebas transaccional que permite investigar D5-D9 y preparar una futura capa
de sincronización. No activa operaciones compartidas reales.

## 3. D3 — Aislamiento

- Archivo propio, `data/shared-pg08b.db`, con guarda explícita contra
  `pokegotchi.db`.
- Sin endpoints HTTP, sin servidor público, sin UI, sin cuentas.
- No toca saves, fixtures, PKHeX.Core, legalidad, motor Tamagotchi, sprites,
  fondos, inventarios ni exportaciones.
- Sin dependencias nuevas: solo `bun:sqlite` y módulos estándar de Node/Bun.
- Sin commits ni pushes: todo el trabajo queda como cambios locales.

## 4. Límites de seguridad

Lo que **sí** garantiza este módulo:

- validación estricta del contrato PG-08A en cada comando y en cada lectura;
- autenticación como tipo exigido por el store (D1), no como `ownerId` suelto;
- propiedad original preservada: no existen operaciones de exportar, eliminar,
  transferir ni cambiar dueño;
- tres permisos independientes y revocables, `null` por defecto;
- límite de dos Pokémon por guardería;
- concurrencia optimista mediante revisión (`STALE_REVISION`, nunca LWW);
- protección anti-replay de vales;
- trazabilidad: evento inmutable con payload versionado y hash.

Lo que **no** garantiza todavía:

- cifrado en almacenamiento y tránsito (PG-08 / D3 completa, D8);
- autenticación real entre usuarios (D1 implementación);
- autorización y auditoría centralizadas (D2);
- descubrimiento e invitaciones (D4);
- sincronización entre dispositivos (D7);
- retención y anonimización (D8);
- rate limiting y cuotas anti-abusos (D9);
- crianza, huevos, Guardipuntos ni monetización (fuera de alcance).

Un vale de siete días **puede caducar**; el derecho de propiedad y recuperación
no. El dominio permite pedir un vale nuevo conforme al estado autoritativo.
Las pruebas de recuperación con anfitrión desconectado son una simulación
local, **no** una demostración de recuperación offline real entre usuarios.
