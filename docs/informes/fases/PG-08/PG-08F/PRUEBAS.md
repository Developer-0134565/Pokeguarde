# PG-08F — Pruebas

## Suite nueva

`scripts/pg08f-check.ts`: **50 casos**, ejecutados con
`bun run scripts/pg08f-check.ts`. Usa BD SQLite aisladas en
`/tmp/opencode/pg08f-*`, un reloj inyectado (`T0`) y una autoridad simulada.
No toca `data/pokegotchi.db` ni los fixtures. Al terminar limpia su directorio
temporal.

## Cobertura por bloque

| Bloque | Casos | Contenido |
|---|---:|---|
| Contrato y documentación | 01–02 | SyncGate y 11 documentos presentes; versiones y esquemas. |
| Producción 1+1 | 03–12 | Dos huevos por ciclo, mismo ciclo, IDs distintos, determinismo, propietarios, propiedad de progenitores, transacción, doble vencimiento, reintento, replay, temporizador único. |
| Atomicidad y concurrencia | 13–22 | Rollback por fallo de persistencia, capacidad en ambos destinos, sin reasignación, dos workers, retirada/revocación, orden obsoleto, reinicio entre preparación y confirmación. |
| Pokémon DEMO | 23–32 | Catálogo de 15 iniciales, Pokédex por generación, procedencia permanente, bloqueo de crianza/exportación/intercambio/transferencia, metadatos, importados, fallo cerrado, progenitor DEMO, procedencia incompleta. |
| Genética futura | 33 | Contrato sin valores inventados. |
| Entrega simulada | 34–40, 22 | Destinatario correcto/incorrecto, doble confirmación, reintento, reconstrucción, actor no autorizado, etapas PG-08E, clave modificada. |
| Integridad | 41–44, 48–50, 46–47 | SQLite sin pares incompletos, BD protegida rechazada, 17 hashes, sin PKM/saves nuevos, outbox, sin acumulación ilimitada, identidad incompleta, documentación y copia del informe. |

## Resultado registrado

Ejecución final de la suite PG-08F: **50 casos correctos, 0 fallidos**.

Durante el desarrollo se corrigieron tres defectos reales detectados por la
propia suite:

1. **FK de `pair_cycles`**: los huevos se insertaban antes que el ciclo; ahora
   `produceTx()` inserta el ciclo en `queued` y lo confirma al final.
2. **`ORDER BY created_at` en `pair_eggs`**: columna inexistente; se ordena por
   `cycle_id, recipient_role`.
3. **Llamadas a `demoProvenance()` sin `at`** en los casos 30–31 y recuento
   fijo de saves en el caso 44, que había cambiado por saves preexistentes en
   `data/saves/`. El caso 44 compara ahora contra una línea base capturada al
   inicio de la suite.

## Regresiones

`bun run check` incluye la nueva línea
`echo "== ... PG-08F ==" && bun run scripts/pg08f-check.ts`. Resultado final:
**EXIT 0**, con PG-07H 101/101, PG-08A 284/284, PG-08B 22/22, PG-08C 33/33,
PG-08D 36/36, PG-08E 48/48 y PG-08F 50/50 (total PG-08 A–F: **473**).

## Integridad comprobada por la suite

- 17/17 hashes protegidos intactos, incluido `data/pokegotchi.db`
  (`3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a`).
- El almacén de pares rechaza explícitamente la ruta de la BD protegida.
- `saveFiles()` no cambia respecto al inicio de la suite: no se generan PKM ni
  saves nuevos, y no se modifica ningún archivo de partida.
- `integrityCheck()` devuelve `ok:true`: eventos, huevos, outbox, entregas y
  pragma coherentes, sin pares incompletos confirmados.
