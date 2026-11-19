# PG-08E · 11 — Decisiones pendientes y propuesta PG-08F

## Aclaración de alcance

El documento histórico
`PG-08D/09-PROPUESTA-PG08E.md` proponía un PG-08E distinto (catálogo oficial
Gen 1-5, proveedor real de compatibilidad y spike PKHeX) y estaba marcado como
«no autorizado». La autorización vigente del usuario **redefine PG-08E** como
propiedad, almacenamiento y ciclo de vida de huevos. La propuesta antigua queda
superasada por esa autorización, sin borrarla ni reescribirla.

## Decisiones NO adoptadas

- Política definitiva de asignación de propietario (las cuatro están preparadas).
- Límite definitivo de capacidad de producto.
- Política definitiva de acumulación (`single` sigue siendo el experimental).
- Propietario/destinatario final de los huevos.
- Integración de procedencia PLAY NOW con la importación real de saves.
- Destino de los huevos al finalizar la estancia.
- Rareza definitiva y tabla definitiva de intervalos (PG-08D).
- Autoridad online real: hoy solo autoridad simulada local.
- D4 (invitaciones/directorio), D8 (retención) y D9 (abuso) siguen pendientes.

## Propuesta PG-08F (NO autorizada)

1. Conectar el contrato de procedencia con el registro real de Pokémon de
   PLAY NOW y con la importación de saves, sin asignar procedencia inventada a
   registros antiguos.
2. Diseñar un `EggDeliveryPort` para entrega supervisada del huevo simulado al
   destinatario confirmado, sin eclosión ni PKM.
3. Definir una política de asignación y capacidad mediante decisión explícita
   del usuario, con registro de auditoría.
4. Spike aislado de autoridad online y cifrado en tránsito, sin despliegue
   público ni cuentas reales.

Criterio de cierre propuesto: decisiones escritas, contratos conectados y
`bun run check` en EXIT 0. **No autorizado todavía.**
