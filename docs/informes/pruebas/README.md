# Resultados de pruebas

Datos de verificación y medición generados por PG-07G, PG-07H y PG-08A. Los
volcados completos de inventario (~337 KB) con rutas locales y hashes de saves
**no se publican**; los informes ya resumen su resultado.

## PG-07G — reanálisis seguro

- Informe: [PG-07G-INFORME.md](../fases/PG-07/PG-07G-INFORME.md)
- Procedimiento: [procedimiento.md](../fases/PG-07/PG-07G/procedimiento.md)
- [apply-isolated-idempotent.json](PG-07G/apply-isolated-idempotent.json)
- [comparison-isolated.json](PG-07G/comparison-isolated.json)
- [hashes.json](PG-07G/hashes.json)

La base de datos real no fue modificada.

## PG-07H — actualización supervisada

- Informe: [PG-07H-INFORME.md](../fases/PG-07/PG-07H-INFORME.md)
- [apply-idempotent.json](PG-07H/apply-idempotent.json)
- [apply-real.json](PG-07H/apply-real.json)
- [comparison-before-after.json](PG-07H/comparison-before-after.json)
- [hashes.json](PG-07H/hashes.json)
- [verify-only.json](PG-07H/verify-only.json)

Solo se actualizaron los inventarios derivados de los IDs 1 y 2 sobre una copia
aislada; los hashes originales quedaron registrados.

## PG-08A — guarderías compartidas

- [08-PRUEBAS.md](../fases/PG-08/PG-08A/08-PRUEBAS.md) — 20 pruebas, 284/284 comprobaciones.
- [09-COBERTURA.md](../fases/PG-08/PG-08A/09-COBERTURA.md) — cobertura REAL frente a SIMULADA.
- [10-INTEGRIDAD.md](../fases/PG-08/PG-08A/10-INTEGRIDAD.md) — hashes protegidos.

## PG-06 — sprites overworld

- [pokeguarde-overworld-resoluciones.csv](pokeguarde-overworld-resoluciones.csv)
  — ancho, alto, número de fotogramas y modo de cada imagen del pack de
  terceros. Solo metadatos: **no se publican sprites**.
