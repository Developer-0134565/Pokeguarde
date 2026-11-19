# PG-08F — Pokémon DEMO (PLAY NOW)

## Catálogo tipado

`DEMO_STARTERS` contiene exactamente 15 entradas verificables
(`generation`, `nationalDex`, `name`, `slug`), sin PKM ni datos derivados:
Gen I 1/4/7 (Bulbasaur, Charmander, Squirtle), Gen II 152/155/158
(Chikorita, Cyndaquil, Totodile), Gen III 252/255/258 (Treecko, Torchic,
Mudkip), Gen IV 387/390/393 (Turtwig, Chimchar, Piplup) y Gen V 494/498/501
(Snivy, Tepig, Oshawott). `demoStartersChecksum()` permite detectar cambios
del catálogo. Consultas: `starterBySlug()` y `starterByDex()`.

## Procedencia permanente

`createDemoStarter(instanceId, slug, at)` devuelve una entidad de dominio con
`provenance.class = DEMO_INTERNAL_NON_EXPORTABLE`, fijada por
`demoProvenance()` de PG-08E. La clasificación:

- No depende de un badge, texto ni metadato del frontend.
- Se conserva tras serialización, reconstrucción de eventos, copias, cambios
  de nombre o cambios de propietario lógico.
- No se puede revertir modificando metadatos: los casos 25 y 28 lo verifican.
- No se aplica automáticamente a Pokémon importados: `importedProvenance()`
  usa `classifyProvenance()` con el SHA-256 del save y `immutable: true`
  (casos 29 y 49).

La procedencia insuficiente sigue siendo `UNKNOWN_UNVERIFIED` con fallo
cerrado (caso 30), sin equipararla a `illegal` ni alterar PKHeX.

## Restricciones

`demoRestrictions()` devuelve seis restricciones: `breed`, `export`, `trade`,
`transfer`, `import_convert` y `legal_bypass`. `assertDemoAllowed()` devuelve
siempre error `DEMO_BLOCKED` para una entidad DEMO válida, y
`DEMO_CLASS_INVALID` si la procedencia no es la permanente. Por tanto:

- **Crianza**: bloqueada en el dominio (caso 26). `assertBreedablePair()` usa
  `isBreedableProvenance()` y bloquea el ciclo completo si alguno de los dos
  progenitores es DEMO (caso 31) o tiene procedencia incompleta (caso 32).
- **Exportación e intercambio**: bloqueados **por contrato de dominio**. No
  existen rutas HTTP ni integración con el exportador real en PG-08F. El
  bloqueo está preparado para que exportación e intercambio lo consulten; no
  se afirma que un flujo HTTP ya lo aplique.
- **Transferencia a partidas originales, conversión a importado y evasión de
  legalidad**: bloqueados por el mismo contrato.

## Integración futura (preparada, no conectada)

- Selección de inicial: `starterBySlug()` / `starterByDex()`.
- Creación de entidad DEMO: `createDemoStarter()`.
- Consulta de catálogo y checksum: `DEMO_STARTERS`, `demoStartersChecksum()`.
- Lectura de restricciones: `demoRestrictions()` / `assertDemoAllowed()`.
- Presentación de badge: queda como responsabilidad futura del frontend; el
  badge **no** es la fuente de verdad de la procedencia.

No se implementan rutas HTTP públicas ni se conecta el frontend de Stitch. No
se introducen Pokémon DEMO en saves, no se generan PKM y no se alteran datos
históricos.
