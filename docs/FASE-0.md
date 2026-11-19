# Fase 0 — Investigación y spike

Estado: **spike técnico verificado**; investigación de cadenas y campos cerrada en lo
esencial. Fecha: 18-nov-2026.

Todo lo marcado como VERIFICADO se comprobó ejecutando el sidecar
`services/pkhex` sobre copias en `fixtures/`. Lo marcado como HIPÓTESIS requiere
prueba adicional.

## 1. Motor de lectura y legalidad

- Sidecar .NET 10 con **PKHeX.Core 26.10.18**. VERIFICADO: compila y parsea las
  siete muestras de `fixtures/`.
- API real (la documentación pública está desfasada):
  - `SaveUtil.GetSaveFile(Memory<byte> data, string path)`.
  - `sav.Write()` devuelve `Memory<byte>`.
  - `sav.PartyData` / `sav.BoxData` para el inventario.
  - `new LegalityAnalysis(pkm).Valid` y `.Report()`.
  - `GameInfo.GetStrings("en").Species[id]`, `GameInfo.GetVersionName(version)`.
  - No existen `SaveUtil.GetVariantSAV` ni `SaveUtil.GetBlankSAV`.
- Consecuencia: para una línea base oficial de Gen 2 y Gen 3 haría falta generar un
  save sintético con la API o conseguir uno real; no hay ninguno en la colección.

## 2. Cadenas oficiales de transferencia (deciden qué se puede exportar)

| Origen | Destino | Mecanismo | ¿Permitido en Pokeguarde? |
|---|---|---|---|
| Gen 1 | Gen 2 | Time Capsule | Sí (mismos campos) |
| Gen 2 | Gen 1 | Time Capsule | Sí |
| Gen 1/2 | Gen 3/4/5 | — | **No existe** |
| Gen 3 | Gen 4 | Pal Park | Sí |
| Gen 4 | Gen 5 | Poké Transfer | Sí |
| Gen 5 | Gen 6/7 | Poké Bank | Fuera de alcance |
| Gen 1/2 (Consola Virtual) | Gen 7 | Poké Transporter | Fuera de alcance (no usa `.srm`) |

Por eso un Pokémon de Gen 1/2 **no puede exportarse legalmente a un save de NDS**.
El usuario aceptó «solo cadenas legales». El perfil de exportación (destino) es lo
que decide si el Pokémon lleva Correo/carta, objetos y movimientos modernos.

## 3. Matriz de edición (decidida por el usuario)

| Campo | Gen 1 | Gen 2 | Gen 3 | Gen 4/5 |
|---|---|---|---|---|
| Stat Exp / EV | Sí (0-65.535 por stat) | Sí | EV ≤ 510, 255/stat | EV ≤ 510 |
| Amistad | No existe | Sí (0-255) | Sí | Sí |
| Movimientos | Nivel, MT/MO, evento | + huevo | + tutor | + relearn |
| Objeto equipado | No existe | Sí | Sí | Sí |
| Carta (Correo) | No existe | Sí (Mail) | No existe | Sí (Mail) |
| Naturaleza | No existe | No existe | Sí, solo lectura | Sí, solo lectura |
| IV/DV | **Bloqueado** | **Bloqueado** | **Bloqueado** | **Bloqueado** |
| Medallas, OT, dinero | Solo lectura | Solo lectura | Solo lectura | Solo lectura |

IV/DV bloqueados porque en Gen 1-5 no existe método oficial para cambiarlos sin
manipular el save (el usuario lo pidió así).

## 4. Qué es legal y qué no (para la verificación de la Guardería)

PKHeX comprueba, por Pokémon: encuentro de origen (juego, nivel, lugar, método),
coherencia PID/IV (Gen 3+ en adelante), movimientos posibles para especie, nivel,
versión e idioma, objeto equipado válido en esa generación, cadenas y metadatos de
evento, y checksums del save.

- **Legal**: existe al menos una ruta oficial que produce exactamente ese Pokémon.
- **Ilegal**: la combinación es imposible (movimiento que no aprende, nivel de
  captura imposible, objeto de otra generación, PID/IV incoherentes, etc.).
- **No verificable** (categoría propia de este proyecto): el save viene de un hack
  cuya tabla de especies/movimientos no coincide con la oficial, así que PKHeX
  marca ilegal algo que en esa ROM es correcto.

VERIFICADO que la tercera categoría es necesaria: Crystal Clear (Gen 2) da 17
ilegales de 22 por «Invalid Move» y «Invalid Met Level»; el save español de Blue
se desalinea al parsear y produce un Nidoking con mote SQUIRTLE; el hack Gen 3
All In da 0 legales de 4. En hacks, el semáforo debe mostrar «no verificable» con
motivo, nunca «ilegal» a secas, y **nunca** bloquear al usuario por ello.

En HGSS España, el triaje posterior (fase 2) resolvió los 37 «ilegales»: 20 son
estructurales y 17 solo cosméticos/de idioma, así que pasan a **no verificables**.

## 5. Cobertura de campos del inventario

VERIFICADO que se leen: especie, mote, nivel, EXP, naturaleza (Gen 3+), habilidad,
objeto equipado, amistad, IV, EV, movimientos, legalidad y motivo; del save:
entrenador, TID/SID, género, dinero, tiempo de juego, número de Pokémon, equipo y
cajas.

Pendiente:
- **Medallas**: PKHeX las expone como máscara de bits (`Badges`, `Badges16`), no
  como contador. Hay que usar el número de bits activos y calibrar por generación.
  HGSS devuelve `Badges16 raw=62 → 5` y `Badges raw=255 → 8`; Gen 5 no expone
  ninguna propiedad de medallas.
- **Objetos de la mochila, bolsa y PC**: no implementado aún.
- **Dex, eventos, récords, cajas por nombre**: no implementado aún.
- **Idioma del save y de la ROM**: parcial.

## 6. Formatos y tamaños aceptados

| Generación | Sistema | Tamaño típico | Extensiones |
|---|---|---|---|
| 1 | GB | 32.768 B | `.srm`, `.sav` |
| 2 | GBC | 32.768 B | `.srm`, `.sav` |
| 3 | GBA | 131.072 B | `.srm`, `.sav`, `.fla` |
| 4/5 | NDS | 524.288 B (también 256 KiB) | `.srm`, `.sav`, `.dsv` |

Los estados guardados del emulador (`.state*`) y los `.rtc` no son saves y se
ignoran. Un save de tamaño correcto puede no ser detectado (Polished Crystal):
eso es un resultado válido, no un error del programa.

## 7. Protocolo de escritura (resumen operativo)

1. Leer bytes en memoria, calcular SHA-256, no tocar el original.
2. Ida y vuelta sin cambios: `Write()` sobre una **copia clonada** del original.
   Si no coincide, no se aborta: se registra la normalización (ver §9) y se sigue.
3. Editar solo los campos permitidos (v1: EV/stat exp).
4. Recalcular checksums como PKHeX y refrescar estadísticas de combate.
5. Revalidar; si empeora o cambia la identidad del Pokémon, abortar.
6. Escribir **archivo nuevo** por defecto; sobrescribir exige confirmación y copia.
7. Registrar hashes, offsets y motivo en SQLite.

## 9. Medición real de la ida y vuelta y decisión de escritura (18-nov-2026)

La primera medición del spike fue **vacua**. `SaveUtil.GetSaveFile(data)` no copia
el búfer y `sav.Write()` lo modifica en sitio, así que el sidecar comparaba el
búfer consigo mismo y siempre daba «idéntica». Ahora se clona el original
(`pristine`) antes de parsear y se compara contra esa copia.

Medido de nuevo, solo **Gen 3 y Gen 5** reescriben byte a byte:

| Fixture | Gen | ¿Idéntica? | Bytes distintos |
|---|---:|---|---:|
| `gen1-blue-usa` | 1 | no | 31 |
| `gen1-blue-spain` | 1 | no | 6 |
| `gen2-crystalclear-hack` | 2 | no | 692 |
| `gen3-allin-hack` | 3 | sí | 0 |
| `gen4-heartgold-spain` | 4 | no | 5 |
| `gen5-black-usa` | 5 | sí | 0 |

Qué es esa diferencia (VERIFICADO):

- **`Write()` es idempotente**: `Write(Write(x)) == Write(x)` en los cuatro saves
  no idénticos.
- **El inventario parseado es idéntico**: partida, equipo, cajas, objetos, Pokédex
  y entrenador salen igual antes y después.
- **Los checksums siguen siendo válidos**: el de Gen 1 (`~sum(0x2598..0x3522)`)
  cuadra en el original y en la salida.
- Es la **normalización canónica** de PKHeX: reescribe las listas de equipo y cajas
  desde su búfer interno y recalcula checksums, poniendo a cero relleno sobrante de
  ranuras vacías (p. ej. los `0x50` del equipo en Blue USA) y algún campo obsoleto
  (los 5 bytes de HeartGold, en estructuras que su parser no expone).

**Decisión del usuario**: la salida es la **forma canónica completa** de PKHeX.

- Es consistente por construcción: PKHeX calcula los checksums sobre exactamente
  los bytes que escribe.
- No requiere reimplementar checksums propios (Gen 1/2 suma, Gen 3 suma de 16 bits,
  Gen 4/5 CRC16 por bloques), que es lo que el proyecto prohíbe como fuente principal.
- Se midió la alternativa (parche mínimo sobre el original) y **rompe el checksum
  de Gen 1**: conservar el relleno original junto al checksum calculado sobre el
  contenido ya normalizado deja el fichero incoherente (guardado `0x0E`, calculado
  `0x02`). En Gen 4 apenas ahorra (133 bytes frente a 138) porque el cifrado va
  sembrado por el checksum y re-cifra el bloque entero.

El informe de `export` publica `roundTripIdentical`, `normalization` (resumen de los
bytes que PKHeX corrige al reescribir) y `diff` (original frente a la salida), de
modo que el coste colateral queda siempre a la vista.

## 8. Límites conocidos del spike

- No hay save oficial de Gen 2 ni de Gen 3 en la colección: ambos fixtures son
  hacks (uno no detectado).
- La legalidad en hacks no es concluyente.
- El parseo de saves traducidos (español Gen 1) puede desalinearse.
- Solo se han probado 7 saves; el `scan` masivo de la colección aún no se ha hecho
  con inventario persistente.
