# Legalidad: reglas y veredictos

Implementado en el sidecar `services/pkhex` (PKHeX.Core 26.10.18) y expuesto en
`inventory.party[]`, `inventory.boxes[].slots[]` y `GET /api/saves/:sha`.

## Tres estados, no dos

PKHeX devuelve `Valid` o un informe con líneas `Invalid…`. Ese binomio no sirve
para partidas reales: hay avisos que dependen del idioma o de filtros modernos y
no indican datos imposibles. Por eso la app calcula un veredicto propio:

| Veredicto | Significado | Color |
|---|---|---|
| `legal` | PKHeX lo acepta tal cual | verde |
| `unverified` | Todos los avisos son cosméticos (idioma o filtro de nombres) | ámbar |
| `illegal` | Al menos un aviso estructural | rojo |

Regla exacta (`VerdictOf`):

1. Si `LegalityAnalysis(pkm).Valid` → `legal`.
2. Si hay líneas y **todas** son cosméticas → `unverified`.
3. En cualquier otro caso → `illegal`.

## Qué se considera cosmético

Solo estas tres, por texto del informe:

- `Nickname does not match species name`
- `In-game Trade Nickname has been altered`
- `Word Filter` (filtro de palabras moderno aplicado a generaciones antiguas)

Ejemplo real: un save español de HeartGold con Ho-Oh moteado «ORUS» se marcaba
ilegal porque se comparaba con el nombre inglés. Ahora es `unverified` y el
motivo queda escrito, sin ocultarlo.

Todo lo demás sigue siendo `illegal`: encuentros (`Unable to match an encounter`,
`Encounter Type does not match encounter`), correlación `PID+`, movimientos
inválidos, ball fuera de rango, habilidad/forma imposibles, objeto no liberado,
`Contest Stat Sheen`, etc.

## Destinos de exportación

Cada Pokémon publica `exportTargets: [{ system, allowed, reason }]` según
`pkm.Format`:

| Origen | GB | GBC | GBA | NDS |
|---|---|---|---|---|
| Gen 1 | sí (misma gen) | sí (compatible) | no | **no** |
| Gen 2 | sí (compatible) | sí (misma gen) | no | **no** |
| Gen 3 | no | no | sí | sí (Pal Park) |
| Gen 4 | no | no | no | sí (Poké Transfer) |
| Gen 5 | no | no | no | sí |

El motivo de bloqueo de Gen 1/2 → NDS se explica en la UI: Time Capsule solo
conecta Gen 1 y Gen 2; no existe cadena oficial hacia Gen 3/4/5.

## Resultado medido (18-nov-2026)

| Save | Total | Legal | No verificable | Ilegal |
|---|---:|---:|---:|---:|
| HeartGold España (SAV4HGSS) | 105 | 68 | 17 | 20 |
| Blue USA (SAV1) | 5 | 0 | 0 | 5 |
| Crystal Clear (SAV2, hack) | 22 | 5 | 0 | 17 |
| Black USA (SAV5BW) | 8 | 7 | 0 | 1 |

Los 5 de Blue USA son ilegales por movimientos: la partida viene de una ROM
parcheada, así que los avisos son esperables y no se "arreglan".

## Límites conocidos

- PKHeX no expone Pokédex en Gen 1-3: la UI lo indica como no disponible.
- En hacks la legalidad no es concluyente; el estado `unverified` evita
  bloquear, pero no certifica nada.
- Los nombres de bolsillo de la mochila llegan en inglés.
- La corrección de idioma es por texto del informe, no por tabla de especies;
  si PKHeX cambia la redacción habrá que actualizar `IsCosmetic`.
