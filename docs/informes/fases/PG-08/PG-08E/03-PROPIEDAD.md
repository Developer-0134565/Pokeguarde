# PG-08E · 03 — Propiedad y destinatario

La propiedad del huevo es **independiente** de la propiedad de los progenitores.
Ninguna operación de esta fase transfiere la titularidad de un Pokémon.

`ownerId` es `null` hasta que la autoridad confirma una asignación. Una vez
fijado, `withTransition` y el almacén rechazan cualquier cambio con
`OWNER_IMMUTABLE`; ninguna réplica puede modificarlo unilateralmente.

## Políticas configurables (NINGUNA adoptada)

`ASSIGNMENT_POLICIES`:

- `guest_owner` — propietario del Pokémon invitado.
- `host` — anfitrión de la guardería.
- `prearranged` — acuerdo previo explícito.
- `pending` — destinatario pendiente de decisión (valor por defecto en pruebas).

`proposedOwnerOf(policy, ctx)` calcula la propuesta, pero no la ejecuta: la
asignación real requiere `canAssign` de la autoridad inyectada. No hay sorteos,
repartos automáticos ni cambios de propietario entre usuarios reales.

Las pruebas usan siempre destinatarios explícitos y verificables (`GUEST`).
La decisión de producto queda pendiente de autorización humana.
