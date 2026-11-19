# PG-08A — 1. Auditoría de arquitectura

**Modo:** READ-ONLY. No se arrancaron servicios, no se escribió en SQLite, no se
modificaron partidas, sprites, motor ni exportaciones.

## Estado examinado

- HEAD `819b73b49a8aca76486173917d7abdb4518290ab`, rama `main...origin/main`.
- `git status --porcelain=v1 --untracked-files=all` inicial
  `6b76e9e7cc883070d20c8f978928aae663793168e0057d844e0e94ba8dc1ebc9`.
- `data/pokegotchi.db` SHA-256 `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`.
- Línea base `bun run check` → EXIT 0; PG-07A 54, PG-07F 132, PG-07G 69/69,
  PG-07H 101/101; sidecar .NET 0 avisos / 0 errores.

## Clasificación de decisiones previas

| Documento | Estado real | Uso en PG-08A |
|---|---|---|
| `docs/SHARED_NURSERIES_SPEC.md` | **DECIDED** (modelo y flujo) | Base del modelo de guardería y depósito |
| `docs/ROADMAP.md` | PG-08A/B/G **PROPOSED**; C/D/E/F **DECIDED** | No implementar A/B/G como producto |
| `docs/BREEDING_DESIGN_RFC.md` | **DECIDED parcial** | Solo referencia; crianza queda fuera |
| `docs/POKEMON_SECURITY_RFC.md` | **PROPUESTA** | No adoptar cifrado real sin decisión |
| `docs/MONETIZATION_DESIGN_RFC.md` | **PROPUESTA** | Fuera de alcance |

## Hallazgos del código actual

1. **No existen entidades de propiedad.** Solo hay cuatro tablas: `saves`,
   `pokemon`, `pets`, `exports` (`apps/server/src/db.ts:15-122`). No hay `user`,
   `nursery`, `stay`, `permission`, sesiones ni invitaciones. La propiedad es
   indiferenciable de la tenencia local.

2. **La Guardería es una lista global.** `pets` tiene un único flag `active`
   (`apps/server/src/index.ts:560`, `:831-839`). No hay límite de dos, ni
   visitantes, ni relación anfitrión/propietario. `capacity` en la API
   pertenece a cajas del save, no a la Guardería.

3. **Identidad de Pokémon insuficiente.** La tabla `pokemon` no tiene columna
   `pid` ni UNIQUE compuesto (`db.ts:43-68`). En Gen 1 Blue USA, 5/5 Pokémon
   tienen `pid = 0`; la única clave estable es `location+box+slot`
   (`index.ts:321-356`). El dossier `resolvePet()` solo resuelve por PID
   (`apps/web/src/main.ts:1299-1312`) y deja sin ficha a esos Pokémon.

4. **IDs reutilizables.** `saves.id`, `pokemon.id`, `pets.id` y `exports.id` son
   `INTEGER PRIMARY KEY` sin `AUTOINCREMENT`. No se usa UUID en código (solo se
   propone en el RFC de seguridad).

5. **Sin autenticación ni autorización.** No hay token, sesión, cookie ni
   cabecera de autorización en `apps/`. Cualquier cliente que conozca un
   `sha256` puede adoptar o exportar. Toda la validación existente es de
   formato/legalidad, no de quién la ejecuta.

6. **Dedupe global por save.** `sha256 UNIQUE` (`db.ts:21`) y dedupe en
   `ingest()` (`index.ts:168-171`) impedirían que dos personas importen el
   mismo archivo. No existe cifrado en reposo ni tránsito.

7. **Operaciones no transaccionales.** Adopción (`:562-589`), reparseo
   (`:269-270`), exportación (`:734-799`) y borrado (`:607`) no están envueltos
   en `db.transaction()`. `POST /export` inserta una fila incluso en dry-run.
   `GET /api/pets` muta `updated_at` al poner al día (:402-405).

8. **Rutas frágiles.** `stored_path` en la BD real apunta a
   `/home/<usuario>/Proyectos/Pokegotchi/...` (directorio anterior). Una
   exportación futura fallaría con 502. `POST /api/saves/import` acepta
   cualquier ruta local del servidor (`:453`).

9. **Legalidad correcta pero con un filtro sesgado.** `VerdictOf`
   (`services/pkhex/Program.cs:965-970`) distingue `legal`, `unverified` e
   `illegal`; la adopción bloquea solo `illegal`. Sin embargo
   `GET /api/saves/:sha/pokemon?legal=true` (`index.ts:495-507`) usa la columna
   `legal`, que es `false` para `unverified`, y los oculta.

10. **Sin superficie compartida.** No hay menciones funcionales de
    `shared`, `guest`, `visitor`, `owner`, `permissions`, `stay`, `breeding` ni
    cifrado; todo ello vive solo en documentación.

## Conclusión de la auditoría

La aplicación actual es **local y de tenencia única**. No puede representar
propiedad, anfitrión, visita, consentimiento ni recuperación. PG-08A no
intenta parchearla: define un contrato aislado que hace explícitas esas
entidades y demuestra sus invariantes antes de cualquier integración.
