# OC-STITCH-08 — Informe de cobertura total del catálogo (Fase M)

Generado: 2026-11-20T20:26:06+00:00. Datos tomados de los entregables reales; ninguna cifra estimada.

## Respuestas del catálogo

| # | Pregunta | Respuesta |
|---:|---|---|
| 1 | ¿Cuántos elementos hay en Stitch? | 89 |
| 2 | ¿Cuántos son páginas web? | 60 |
| 3 | ¿Cuántos son variantes? | 7 |
| 4 | ¿Cuántos son componentes? | 2 |
| 5 | ¿Cuántos son documentos? | 12 |
| 6 | ¿Cuántos son imágenes? | 4 |
| 7 | ¿Cuántos son recursos de marketing? | 4 IMAGE_ASSET (3 de ellos material publicitario) + 1 DOCUMENT de kit de marketing |
| 8 | ¿Cuántos son duplicados? | 0 (el único grupo por hash es el hash vacío de los 4 IMAGE, no un duplicado real) |
| 9 | ¿Cuántos no se pudieron inspeccionar? | 4 |
| 10 | ¿Cuántas páginas lógicas resultan? | 58 |
| 11 | ¿Cuántas páginas están implementadas? | 58 de 58 (58/58 renderizan) |
| 12 | ¿Cuántas rutas están conectadas? | 58 |
| 13 | ¿Cuántas páginas son funcionales? | 5 OPERATIONAL (+1 PARTIAL) verificadas en regresión |
| 14 | ¿Cuántas son prototipos UI? | 52 |
| 15 | ¿Cuántas siguen bloqueadas? | 0 |
| 16 | ¿Cuántas tienen comparación visual? | 31 con resultado válido |
| 17 | ¿Cuántas requieren revisión humana? | 15 marcadas REVIEW_REQUIRED; además, la revisión visual independiente de todas las páginas sigue pendiente porque el modelo no acepta imágenes |

## Cinco métricas separadas

| Métrica | Fracción | Valor | Definición |
|---|---|---:|---|
| Cobertura de clasificación | 89/89 | 100.0% | Elementos clasificados / elementos inventariados |
| Cobertura de integración | 58/58 | 100.0% | Páginas web canónicas integradas / identificadas |
| Cobertura de navegación | 58/58 | 100.0% | Páginas integradas accesibles / páginas integradas |
| Cobertura visual | 31/58 | 53.4% | Páginas con comparación válida / páginas integradas |
| Cobertura funcional | 5/5 | 100.0% | Páginas operativas verificadas / páginas que debían estar operativas |

## Notas de interpretación

- Las cinco métricas **no se agregan** en una única cifra: miden dimensiones distintas.
- `UI_PROTOTYPE` significa interfaz navegable sin backend operativo; el badge es visible al usuario.
- La cobertura visual mide comparaciones reproducibles, **no** fidelidad certificada.
- La revisión visual independiente sigue pendiente: el modelo no acepta entrada de imágenes.
- Los 4 elementos `UNINSPECTABLE` son IMAGE_ASSET sin HTML; están documentados en `OC-STITCH-08-UNRESOLVED.json`.
