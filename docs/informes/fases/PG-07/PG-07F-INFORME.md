# PG-07F — Contrato completo de Cajas de PC

**Fecha:** 19-nov-2026  
**Repositorio:** `/home/<usuario>/Proyectos/Pokeguarde`  
**Rama:** `main` · **HEAD:** `819b73b49a8aca76486173917d7abdb4518290ab`  
**Estado:** TERMINADA Y VERIFICADA  
**Sin commits ni pushes.**

---

## 1. Resumen ejecutivo

Se amplió el contrato de lectura del inventario para representar la estructura real de almacenamiento Pokémon interpretada por PKHeX.Core, sin escribir partidas, sin cambiar legalidad, sin exportar y sin modificar SQLite.

El contrato anterior solo exponía cajas con al menos un Pokémon y únicamente sus ranuras ocupadas. El nuevo contrato añade de forma aditiva:

- Estado de disponibilidad del almacenamiento.
- Número real de cajas y de ranuras por caja.
- Todas las cajas, incluidas las vacías.
- Todas las posiciones reales, incluidas las vacías.
- Nombres reales de caja cuando la API los expone.
-Índices originales y orden real del save.
- Valores desconocidos como `null` o estados explícitos, nunca como `0`.

La interfaz de Cajas de PC consume el nuevo contrato y conserva el comportamiento anterior cuando recibe un inventario antiguo.

---

## 2. Estado inicial y final del repositorio

### Inicial

- Rama `main`, HEAD `819b73b49a8aca76486173917d7abdb4518290ab`.
- Modificaciones heredadas de PG-07B/C/D/E en `apps/web/index.html`, `i18n.ts`, `main.ts`, `nursery.ts`, `style.css` y `scripts/check.sh`.
- Archivos sin seguimiento heredados: suites PG-07B/C/D/E, ZIP de Stitch, `STITCH_UPLOAD/` y `docs/stitch/reference/`.
- `bun run check` inicial: EXIT 0.

### Final

- Mismo HEAD; sin commits ni pushes.
- Hash de `git status --porcelain=v1 --untracked-files=all`:
  `b8428291fad2c16d179b3a92ec007b0c71fa8b02a8242d3d3c97a370e10e4b28`.
- Modificados rastreados:
  - `apps/server/src/index.ts` — PG-07F.
  - `apps/web/src/i18n.ts` — PG-07F.
  - `apps/web/src/main.ts` — PG-07F.
  - `apps/web/src/style.css` — PG-07F.
  - `scripts/check.sh` — PG-07F.
  - `services/pkhex/Program.cs` — PG-07F.
  - `apps/web/index.html`, `apps/web/src/nursery.ts` — heredados, no modificados por PG-07F.
- Nuevo sin seguimiento: `scripts/pg07f-check.ts`.
- Se conservaron todos los archivos sin seguimiento preexistentes.

---

## 3. Contrato anterior

El sidecar construía `inventory.boxes` desde:

```text
isav.BoxData.ToArray()
per = isav.BoxSlotCount  // fallback 30
```

Para cada bloque de `per` ranuras:

- Omitía las ranuras con `Species == 0`.
- Omitía cajas sin ocupantes.
- Emitía `{ index, name, slots }`.
- `slots[]` contenía solo Pokémon ocupados.

Consecuencias:

- No se podía saber el número total de cajas cuando una caja estaba vacía.
- No se podía distinguir “capacidad desconocida” de “capacidad 30”.
- La UI derivaba una capacidad observada a partir del mayor `slot` presente.

El backend guardaba el JSON completo en `saves.inventory_json` y aplanaba solo `boxes[].slots` para la tabla `pokemon`. La legalidad y los conteos seguían esa misma lista.

---

## 4. Contrato nuevo

### Compatibilidad

La ampliación es aditiva:

- `boxes[].slots` sigue siendo la lista de Pokémon ocupados.
- El backend sigue indexando solo `boxes[].slots`.
- Los conteos de legalidad siguen calculándose con `party + boxes[].slots`.
- La UI mantiene los helpers y claves PG-07E.
- Un inventario sin `storage` cae al comportamiento anterior.

### Campo `inventory.storage`

```json
{
  "available": true,
  "availability": "available",
  "boxCount": 18,
  "boxCountSource": "SaveFile.BoxCount",
  "slotCount": 30,
  "slotCountSource": "SaveFile.BoxSlotCount",
  "boxDataSlots": 540,
  "namesAvailable": true,
  "emptySlotsKnown": true,
  "error": null
}
```

Estados posibles de `availability`:

- `available`: storage real utilizable.
- `partial`: hay datos parciales.
- `unavailable`: no hay almacenamiento expuesto.
- `error`: falló la lectura; se conserva también `boxError`.

### Campos por caja

```json
{
  "index": 4,
  "name": "CAJA 4",
  "nameAvailable": true,
  "capacity": 30,
  "occupied": 0,
  "empty": 30,
  "positions": [ ... ],
  "slots": []
}
```

Cada posición:

```json
{
  "slot": 30,
  "occupied": false,
  "ref": { "location": "box", "box": 4, "slot": 30 }
}
```

Cuando está ocupada, `positions[].pokemon` contiene el mismo objeto que se añade a `slots[]`, con `slot`, `box` y `ref` derivados de los índices reales.

Los `ref` son identificadores estables **dentro del contexto de la partida**; no son IDs persistentes inventados. No se publican capacidades, nombres ni posiciones falsas.

---

## 5. APIs reales de PKHeX.Core utilizadas

Versión instalada: **PKHeX.Core 26.10.18**, `net10.0`. No se modificó la dependencia ni su versión.

Se usaron mecanismos públicos de `SaveFile`:

- `SaveUtil.GetSaveFile(...)` para detectar la partida.
- `SaveFile.HasBox`.
- `SaveFile.BoxCount`.
- `SaveFile.BoxSlotCount`.
- `SaveFile.BoxData` como lista plana de ranuras.
- `LegalityAnalysis.Valid` y `.Report()` sin cambios.

`GetBoxName(int)` **no existe en la clase base `SaveFile`**. Existe en tipos concretos como `SAV1`, `SAV2`, `SAV3`, `SAV4HGSS`, `SAV4Sinnoh` y `SAV5`. El sidecar ya disponía de un helper de reflexión `TryCallString`, que se reutilizó para leer el nombre real sin inventarlo y sin tocar PKHeX.Core.

No se usaron offsets supuestos. No se llamó a `Write()` en la ruta de lectura de cajas. No se recalcularon checksums. No se serializó ninguna partida modificada.

---

## 6. Archivos modificados

| Archivo | Cambio |
|---|---|
| `services/pkhex/Program.cs` | Bloque `/* PG-07F:storage-contract:start/end */` que construye `inventory.storage`, todas las cajas y todas las posiciones. |
| `apps/server/src/index.ts` | Tipos `BoxPosition`, `BoxContract`, `StorageContract`; `Inventory` ampliado. Sin cambios de persistencia. |
| `apps/web/src/main.ts` | Tipos ampliados, helpers puros PG-07F dentro del bloque PG-07E, panel con metadatos reales, fallback legacy. |
| `apps/web/src/i18n.ts` | Claves ES/EN para estado de almacenamiento, total de cajas, ranuras, capacidad, ocupación y nombre desconocido. |
| `apps/web/src/style.css` | Ajustes de margen para `.pc-storage`, `.pc-contract` y `.pc-error`. |
| `scripts/pg07c-check.ts` | Hashes autorizados actualizados para `index.ts` y `Program.cs`. |
| `scripts/pg07d-check.ts` | Hashes autorizados actualizados. |
| `scripts/pg07e-check.ts` | Hashes autorizados actualizados. |
| `scripts/check.sh` | Ejecuta `scripts/pg07f-check.ts` tras compilar el sidecar. |
| `scripts/pg07f-check.ts` | Suite nueva de 132 comprobaciones. |

---

## 7. Cobertura por generación

Medido ejecutando el comando `inventory` del sidecar sobre los fixtures reales. Todas las partidas detectadas informan:

- `availability: "available"`.
- `boxCountSource: "SaveFile.BoxCount"`.
- `slotCountSource: "SaveFile.BoxSlotCount"`.
- `namesAvailable: true`.
- `emptySlotsKnown: true`.

| Generación | Fixture | Cajas | Ranuras/caja | Posiciones | Ocupación observada |
|---|---|---:|---:|---:|---|
| I | `gen1-blue-usa.srm` | 12 | 20 | 240 | Todas vacías; 5 Pokémon en equipo |
| I | `gen1-blue-spain.srm` | 12 | 20 | 240 | Todas vacías; 1 Pokémon en equipo |
| II | `gen2-crystalclear-hack.srm` | 14 | 20 | 280 | Caja 1: 16 ocupadas; resto vacías; total 22 |
| III | `gen3-allin-hack.srm` | 14 | 30 | 420 | Caja 1: 1 ocupada; total 4 |
| IV | `gen4-heartgold-spain.srm` | 18 | 30 | 540 | `[29,15,5,0,11,0,0,0,0,0,0,0,0,0,0,0,18,21]`; total 105 |
| V | `gen5-black-usa.srm` | 24 | 30 | 720 | Caja 1: 3 ocupadas; total 8 |

Nombres reales observados:

- Gen 1: `Box 1` … `Box 12`.
- Gen 2: `BOX1` … `BOX14`.
- Gen 3: `BOX1` … `BOX14`.
- Gen 4 HeartGold: `CAJA 1` … `CAJA 16`, `Eventos`, `BELLEZA`.
- Gen 5: `CAJA 1` … `CAJA 24`.

`fixtures/gen2-polished-hack.srm` sigue sin detectarse por PKHeX.Core; no se declara cobertura sobre él. Los fixtures marcados como hack se usan solo para estructura, no como evidencia de legalidad oficial.

No se aplica una cantidad global fija de cajas: los valores salen del save leído.

---

## 8. Pruebas ejecutadas

### Headless

```bash
export PATH="$HOME/.dotnet:$PATH"
bun run check
```

Resultado: **EXIT 0**, `Todo correcto.`

Incluye:

- Motor de Guardería.
- Ciclo día/noche.
- Traducciones.
- PG-07A: 54 comprobaciones correctas.
- PG-07B, PG-07C, PG-07D, PG-07E: todas correctas.
- Sidecar .NET: **0 avisos / 0 errores**.
- **PG-07F: 132 comprobaciones correctas.**

La suite PG-07F verifica:

1. Compatibilidad con el contrato anterior.
2. Metadatos reales de cajas.
3. Capacidad por formato.
4. Índices de caja y ranura.
5. Posiciones ocupadas y vacías.
6. Orden original.
7. Nombres reales.
8. Cajas vacías, parciales y completas.
9. Cambio de partida.
10. Datos incompletos, error del sidecar y sin partida.
11. Generaciones I–V con fixtures disponibles.
12. Ausencia de escritura en fixtures.
13. SQLite y archivos protegidos sin cambios.
14. Sin regresiones PG-07A–E.

### Navegador

La base de datos protegida `data/pokegotchi.db` no se modificó. Para comprobar el contrato nuevo se creó una copia aislada en `/tmp/opencode/pg07f-browser` con `apps/`, `services/`, `fixtures/` y un `data/` vacío, servida en `http://127.0.0.1:8791/`. Se importaron cuatro fixtures solo en esa copia.

#### Escritorio 1280×900

- HeartGold, caja 1:
  - `Almacenamiento real disponible · 18 cajas en la partida · 30 ranuras por caja`.
  - `Capacidad real: 30 ranuras · Ocupadas: 29 · Vacías: 1`.
  - 30 posiciones, ranuras originales 1–30, ranura 30 vacía explícita.
- Navegación a caja 4:
  - `CAJA 4`, `Caja 4`, `Ocupadas: 0 · Vacías: 30`, 30 ranuras vacías.
- Selección de ranura 1, apertura de FICHA/DATOS y `← Volver`:
  - Se restauró `CAJA 1`, ranura 1 seleccionada.
- Filtro `Ilegales`:
  - 30 posiciones conservadas y ordenadas; 2 coincidencias; las no coincidentes se atenuaron sin compactar.
- Búsqueda `MAGNEMITE`:
  - 30 posiciones conservadas; 1 coincidencia; mensaje `1 ranuras coinciden con la vista actual.`
- Gen 1:
  - `Box 1`, `Caja 1`, `12 cajas en la partida`, `20 ranuras por caja`, `Ocupadas: 0 · Vacías: 20`.
- Sin desplazamiento horizontal.

#### Móvil 390×844

- HeartGold, caja 1:
  - Cuadrícula de 2 columnas (`162px 162px`).
  - 30 posiciones, `18 cajas`, `30 ranuras por caja`.
  - `scrollWidth = innerWidth = 390`; sin desplazamiento horizontal.
- Navegación a caja 2 y vuelta a caja 1: correcta.
- Selección de ranura 1: correcta y visible en el resumen contextual.

---

## 9. Capturas

- `/home/<usuario>/Descargas/PG-07F-Desktop.png`  
  PNG 1280×1555 · SHA-256 `2b42bfc6fb7be400930ffb80a45f15590bcec642c0047e064cb81742a7e767c3`
- `/home/<usuario>/Descargas/PG-07F-Mobile.png`  
  PNG 390×3520 · SHA-256 `64aaaec9b42abe467cef0c5d03ad63c5b09593e381911fbeeaf1d28ce0202593`

---

## 10. Integridad de datos protegidos

Hashes finales coincidentes con el estado inicial:

| Archivo | SHA-256 |
|---|---|
| `apps/server/src/db.ts` | `fcd95b0c63c059c57228bd7c06b1121247c23f6f18178388d43148f9193fed7b` |
| `apps/web/src/pet-engine.ts` | `26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb` |
| `apps/web/src/sprite-runtime.ts` | `9e25e9ecb8f9383294265706bedaefc3dda8dcc9c40fd4f2a08248fd9e8e9ac8` |
| `apps/web/src/sprite-render.ts` | `92f43df3284153b4be0a75755f9e7984a78e1aad40064ff6fd8d94a675185f30` |
| `apps/web/assets/room/guarderia.png` | `bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095` |
| `data/pokegotchi.db` | `2fb9e76bc8b8bb820a77e21342abe7b079f687749503315e13c0cf95106675e0` |
| `services/pkhex/pkhex.csproj` | `b9abdb854c71bcddde1e72dad6342709aa1370e27f62a8c1d4a605ccd693a03d` |
| `fixtures/FIXTURES.md` | `15d63ad32c018f1060f24aa4a99b537cb73a75d4b39375f1731b0cba842433a1` |
| `fixtures/gen1-blue-spain.srm` | `d0b54f7d76b50f6e37f62112305c18925e550eeaa07ade81790ca833a78b9f7f` |
| `fixtures/gen1-blue-usa.srm` | `e361b6ea5b16ae1f8d200cc26ea5a40b613ec1a0413d10147147cdd3f2b6cce2` |
| `fixtures/gen2-crystalclear-hack.srm` | `734cc272a1cdd724d30500f16fbc469f7e8bd34524cb48a66ad10a59ce672f48` |
| `fixtures/gen2-polished-hack.srm` | `0bc6d242080b5ccb14d5537a04b78fe5a4a4cd5efbd0f18b0ff0eb4f08a62ea0` |
| `fixtures/gen3-allin-hack.srm` | `928c392597ef8f5e36ceade876d5c835a77811c252dff042740126d910cdea88` |
| `fixtures/gen4-heartgold-spain.srm` | `1c5e78d94ade25d4f91f8f09a683a8def724a7bb74b4d701331b9ad2275e0212` |
| `fixtures/gen5-black-usa.srm` | `0ddb7b1701b22fc935f4c0cb0ffce98a7078b8bdd5b824f03ea7bb44978f16be` |

Integridad de SQLite comprobada en modo solo lectura: `PRAGMA integrity_check` → `ok`.

Archivos autorizados a cambiar, hashes finales:

| Archivo | SHA-256 |
|---|---|
| `services/pkhex/Program.cs` | `014a489b81b8225424e41332f27ab1d2f9bd2147195177e5a585b47a70f983fa` |
| `apps/server/src/index.ts` | `f63e915cdb1d3869fafd0a6b7d33774b4c5b25e61a35fb1fbcd91a4e6826315e` |

---

## 11. Limitaciones

1. `GetBoxName(int)` no pertenece a `SaveFile` base; se accede por reflexión. Si una implementación futura no expone ese método, `nameAvailable` será `false` y la UI mostrará un nombre desconocido sin inventarlo.
2. PKHeX.Core expone el almacenamiento como `BoxData` plano más `BoxCount`/`BoxSlotCount`; no existe una propiedad base `Storage` con cajas nombradas que pueda usarse de forma genérica.
3. La base de datos real conserva inventarios antiguos hasta un reparseo. No se reparseó porque PG-07F prohíbe modificar SQLite. La validación en navegador se hizo sobre una copia aislada.
4. No se comprobó el tacto físico en un dispositivo móvil real; se validó el viewport y la interacción automatizada a 390×844.
5. `gen2-polished-hack.srm` no es detectable, por lo que no aporta cobertura Gen II adicional.
6. Los nombres de caja se muestran tal como vienen del save (`CAJA`, `BOX`, `Eventos`, etc.); PG-07F no los traduce porque son datos reales.
7. Los filtros y la búsqueda atenúan posiciones, nunca las compactan ni renumeran, para preservar los índices originales.

---

## 12. Riesgos

- Un cambio de versión de PKHeX.Core podría alterar la disponibilidad de `BoxCount`, `BoxSlotCount`, `BoxData` o `GetBoxName`; la suite de fixtures detectaría la regresión.
- Los inventarios ya persistidos con el contrato anterior no muestran metadatos nuevos hasta un reparseo autorizado.
- La reflexión para nombres depende de tipos concretos; el contrato ya prevé `nameAvailable:false`.
- No se amplió el alcance a cajas especiales fuera de `BoxData` ni a operaciones de escritura/exportación.

---

## 13. Recomendación del siguiente hito

**PG-07G — reparseo controlado y auditoría visual:** tras autorización explícita, reparsar los saves ya importados para que la base de datos real almacene el contrato ampliado; verificar entonces el panel de cajas en la instancia principal y comprobar táctil real en dispositivo móvil. No es necesario para cerrar PG-07F y no se ejecutó aquí.

---

## 14. Conclusión

PG-07F cumple los criterios de aceptación: el backend expone los metadatos reales disponibles, el frontend representa cajas y ranuras reales —incluidas las vacías—, se conservan índices y orden, la compatibilidad anterior sigue vigente, no se modificaron saves ni SQLite, no hay regresiones críticas, todas las pruebas pasan y este informe está generado.
