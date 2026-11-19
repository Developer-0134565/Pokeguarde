# PG-08E · 10 — Resultados de pruebas

Suite: `scripts/pg08e-check.ts`, integrada en `scripts/check.sh` bajo el bloque
«Huevos simulados: propiedad y ciclo de vida (PG-08E)».

Aislamiento: cada caso usa una BD SQLite en `/tmp/opencode/pg08e-*` con hashes
de archivos protegidos tomados antes y comprobados después. La suite elimina su
directorio temporal al terminar. No arranca servidor, no abre puertos, no usa
cuentas reales y no escribe en `data/pokegotchi.db`.

## Resultado verificado

```
PG-08E — 48 casos correctos, 0 fallidos.
```

`bun run check` termina con EXIT 0 e incluye: PG-07H 101/101, PG-08A 284/284,
PG-08B 22/22, PG-08C 33/33, PG-08D 36/36 y PG-08E 48/48.

## Cobertura

Identidad única e independiente de atributos, procedencia (importada/DEMO/
desconocida), persistencia y consultas tras reinicio, replay e idempotencia,
asignación explícita, propiedad inmutable, transiciones válidas e inválidas,
cancelación con motivo y denegada, capacidad disponible/agotada, dos
producciones simultáneas, reintento, liberación por `claimed`, reducción
por debajo del uso, `single`, `bounded`, drenaje con permiso revocado, reinicio
entre producción y almacenamiento, outbox durable, corrupción detectada,
guarda contra `pokegotchi.db`, ausencia de archivos PKM/save, integración
atómica con PG-08D, retirada/expulsión sin destruir huevos y hashes protegidos.

## Evidencia adicional

Los 17 hashes del manifiesto PG-08A (`/tmp/opencode/pg08a-protected-before.sha256`)
se comprobaron al inicio y al final de la misión: 17/17 coincidentes.
`HEAD == origin/main == 7c9c326be0eb4dced4969c5b0f966413d3299dae`; sin commits
ni pushes.
