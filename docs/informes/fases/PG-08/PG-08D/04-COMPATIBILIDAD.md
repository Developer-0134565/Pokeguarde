# PG-08D · Compatibilidad Pokémon

## Contrato

```ts
interface BreedingCompatibilityProvider {
  compatibility(a: PairMember, b: PairMember): "compatible" | "incompatible" | "unknown";
  rarityOf(member: PairMember): Rarity;
}
```

El motor **no decide** compatibilidad por su cuenta. Si el proveedor devuelve
`unknown`, o la rareza es `unknown`, el estado es `invalid` y **no se produce**
ningún huevo.

## Proveedor de pruebas

`TestCompatibility` en `scripts/pg08d-check.ts`:

- Bloquea por defecto los legendarios 150, 151, 249, 250 y 494 (no se asume que
  todos los legendarios pueden criar).
- Permite activar `allowAll` para simular un legendario compatible con datos
  verificables (prueba 33).
- Permite marcar especies como `unknown` y asignar rarezas desde un mapa.
- Ditto (132) se usa como pareja universal en las pruebas.

## Pendiente de investigación

No se han implementado aún, por falta de datos verificables en el repositorio:

- grupos huevo completos y excepciones por especie;
- especies que no crían y Pokémon singulares;
- bebés, formas especiales y diferencias entre generaciones;
- restricciones de género y eventos oficiales.

La política de rareza de Pokeguarde permanece **separada** de las reglas
oficiales de compatibilidad. Los mockups Stitch no son autoridad de datos.
