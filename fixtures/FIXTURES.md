# Fixtures

Copias **de trabajo** de saves reales, con hash fijado. Nunca son los originales:
el original vive en `SHARE/saves/…` y solo se leyó para copiarlo. Si un fixture se
modifica, hay que restaurarlo desde SHARE y volver a comprobar el SHA-256.

| Archivo | Generación | Origen | Bytes | SHA-256 |
|---|---|---:|---:|---|
| `gen1-blue-usa.srm` | 1 | `Pokemon - Blue Version (USA, Europe) (SGB Enhanced).srm` | 32.768 | `e361b6ea5b16ae1f8d200cc26ea5a40b613ec1a0413d10147147cdd3f2b6cce2` |
| `gen1-blue-spain.srm` | 1 | `Pokemon - Blue Version (Spain).srm` | 32.768 | `d0b54f7d76b50f6e37f62112305c18925e550eeaa07ade81790ca833a78b9f7f` |
| `gen2-crystalclear-hack.srm` | 2 | `Pokemon - Crystal Clear (Color Filter) (v2.5.11) (ShockSlayer) (Hack).srm` | 32.768 | `734cc272a1cdd724d30500f16fbc469f7e8bd34524cb48a66ad10a59ce672f48` |
| `gen2-polished-hack.srm` | 2 | `Pokemon - Polished Crystal (Faithful 3.2.3) (Hack).srm` | 32.768 | `0bc6d242080b5ccb14d5537a04b78fe5a4a4cd5efbd0f18b0ff0eb4f08a62ea0` |
| `gen3-allin-hack.srm` | 3 | `Pokemon - All In (Hack).srm` | 131.072 | `928c392597ef8f5e36ceade876d5c835a77811c252dff042740126d910cdea88` |
| `gen4-heartgold-spain.srm` | 4 | `Pokemon - Edicion Oro HeartGold (Spain).srm` | 524.288 | `1c5e78d94ade25d4f91f8f09a683a8def724a7bb74b4d701331b9ad2275e0212` |
| `gen5-black-usa.srm` | 5 | `Pokemon - Black Version (USA, Europe) (NDSi Enhanced).srm` | 524.288 | `0ddb7b1701b22fc935f4c0cb0ffce98a7078b8bdd5b824f03ea7bb44978f16be` |

## Resultado del spike (18-nov-2026)

Legalidad en tres estados (fase 2): `legal` / `unverified` / `illegal`.

| Fixture | Detectado como | OT | Pokémon | Legal / no verif. / ilegal | ¿Reescribe idéntico? | Bytes normalizados |
|---|---|---|---:|---|---|---:|
| `gen1-blue-usa` | SAV1 | Alex | 5 | 0 / 0 / 5 | **no** | 31 |
| `gen1-blue-spain` | SAV1 | BLUE | 1 (desalineado) | 0 / 0 / 1 | **no** | 6 |
| `gen2-crystalclear-hack` | SAV2 (Crystal) | SANYA | 22 | 5 / 0 / 17 | **no** | 692 |
| `gen2-polished-hack` | **no detectado** | — | — | — | — | — |
| `gen3-allin-hack` | SAV3E (Emerald) | Missing | 4 | 0 / 0 / 4 | sí | 0 |
| `gen4-heartgold-spain` | SAV4HGSS | Antik | 105 | 68 / 17 / 20 | **no** | 5 |
| `gen5-black-usa` | SAV5BW | Antik | 8 | 7 / 0 / 1 | sí | 0 |

**Corrección del 18-nov-2026 (medición real).** La columna «Ida y vuelta» de la
primera versión de este documento decía «idéntica» en los seis detectados, pero
esa medición era **vacua**: `SaveUtil.GetSaveFile(data)` no copia el búfer y
`Write()` lo modifica en sitio, así que el sidecar comparaba el búfer consigo
mismo. Al clonar el original antes de parsear (`pristine`) y comparar contra él,
solo Gen 3 y Gen 5 reescriben byte a byte. La diferencia de los otros cuatro es
la **normalización canónica** de PKHeX (relleno de ranuras vacías y checksums),
verificada como idempotente y sin pérdida: el inventario parseado es idéntico y
los checksums siguen siendo válidos. Detalle y decisión de escritura en
`docs/FASE-0.md`.

Notas:
- `gen2-polished-hack` no se detecta porque su estructura de hack no coincide con
  la de un save oficial. Es un límite esperado, no un fallo.
- Los porcentajes de legalidad de Gen 1-3 no son concluyentes: esos saves vienen de
  hacks y PKHeX aplica tablas oficiales.
- `gen1-blue-spain` se desalinea al parsear (lee un Nidoking con mote SQUIRTLE):
  la traducción española no conserva el diseño de bloques de la versión USA.

## No hay fixture oficial de Gen 2 ni de Gen 3

El escaneo de Retro y Toshiba no encontró ningún save oficial de Gold/Silver/
Crystal ni de Ruby/Sapphire/Emerald/FireRed/LeafGreen: todos los SAV2 detectados
son Crystal Clear y los SAV3 son hacks. Para una línea base limpia hay que generar
un save sintético (pendiente) o conseguir uno real.
