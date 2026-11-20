# OC-SYNC-09 — Fase 6: integridad de datos protegidos

**Fecha:** 20-nov-2026 · **Resultado:** **23/23 archivos sin cambios (ANTES == DESPUÉS)**.

VERIFICADO con `sha256sum` sobre la ruta absoluta del repositorio. Solo lectura:
no se extrajeron, copiaron ni modificaron ROMs; no se tocaron BD, fixtures, saves,
motores ni código fuente. El volcado crudo es `/tmp/opencode/oc-sync-09-hashes-before.txt`
y `/tmp/opencode/oc-sync-09-hashes-after.txt`; `diff -u` entre ambos dio **salida vacía**.

## 1. Líneas base exigidas

| Archivo | Baseline | ANTES | DESPUÉS | Resultado |
|---|---|---|---|---|
| `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` | VERIFICADO — idéntico |
| `apps/server/src/index.ts` | `6db1a5aa58178dda531a9f172a24a8526702d7ca53099da5110fe5c7139c14f7` | `6db1a5aa58178dda531a9f172a24a8526702d7ca53099da5110fe5c7139c14f7` | `6db1a5aa58178dda531a9f172a24a8526702d7ca53099da5110fe5c7139c14f7` | VERIFICADO — idéntico |

## 2. Los 7 fixtures (`fixtures/*.srm`) — 7/7 sin cambios

| Archivo | SHA-256 ANTES | SHA-256 DESPUÉS | Resultado |
|---|---|---|---|
| `fixtures/gen1-blue-spain.srm` | `d0b54f7d76b50f6e37f62112305c18925e550eeaa07ade81790ca833a78b9f7f` | `d0b54f7d76b50f6e37f62112305c18925e550eeaa07ade81790ca833a78b9f7f` | IDÉNTICO |
| `fixtures/gen1-blue-usa.srm` | `e361b6ea5b16ae1f8d200cc26ea5a40b613ec1a0413d10147147cdd3f2b6cce2` | `e361b6ea5b16ae1f8d200cc26ea5a40b613ec1a0413d10147147cdd3f2b6cce2` | IDÉNTICO |
| `fixtures/gen2-crystalclear-hack.srm` | `734cc272a1cdd724d30500f16fbc469f7e8bd34524cb48a66ad10a59ce672f48` | `734cc272a1cdd724d30500f16fbc469f7e8bd34524cb48a66ad10a59ce672f48` | IDÉNTICO |
| `fixtures/gen2-polished-hack.srm` | `0bc6d242080b5ccb14d5537a04b78fe5a4a4cd5efbd0f18b0ff0eb4f08a62ea0` | `0bc6d242080b5ccb14d5537a04b78fe5a4a4cd5efbd0f18b0ff0eb4f08a62ea0` | IDÉNTICO |
| `fixtures/gen3-allin-hack.srm` | `928c392597ef8f5e36ceade876d5c835a77811c252dff042740126d910cdea88` | `928c392597ef8f5e36ceade876d5c835a77811c252dff042740126d910cdea88` | IDÉNTICO |
| `fixtures/gen4-heartgold-spain.srm` | `1c5e78d94ade25d4f91f8f09a683a8def724a7bb74b4d701331b9ad2275e0212` | `1c5e78d94ade25d4f91f8f09a683a8def724a7bb74b4d701331b9ad2275e0212` | IDÉNTICO |
| `fixtures/gen5-black-usa.srm` | `0ddb7b1701b22fc935f4c0cb0ffce98a7078b8bdd5b824f03ea7bb44978f16be` | `0ddb7b1701b22fc935f4c0cb0ffce98a7078b8bdd5b824f03ea7bb44978f16be` | IDÉNTICO |

## 3. ROMs en `docs/ROMS/` — 14/14 sin cambios (solo hash)

| Archivo | SHA-256 ANTES | SHA-256 DESPUÉS | Resultado |
|---|---|---|---|
| `docs/ROMS/Pocket Monsters - Crystal Version (Japan).gbc` | `136ada06cb68656b7de475fa4b278d37dbeff8f5257e7dfdf7f4a4aec19a90f3` | `136ada06cb68656b7de475fa4b278d37dbeff8f5257e7dfdf7f4a4aec19a90f3` | IDÉNTICO |
| `docs/ROMS/Pocket Monsters - Red Version (J) (V1.0) [S].gb` | `392ce450d708c8d127aaed7afc20001a48625bd83a5fa5325be82f5c0972ccfa` | `392ce450d708c8d127aaed7afc20001a48625bd83a5fa5325be82f5c0972ccfa` | IDÉNTICO |
| `docs/ROMS/Pocket Monsters Yellow (J) (V1.0) [S][BF].gb` | `8a4c6d2c94bc8a831a33b6f4fd4fc7f1b854696efa265855672a543aade38160` | `8a4c6d2c94bc8a831a33b6f4fd4fc7f1b854696efa265855672a543aade38160` | IDÉNTICO |
| `docs/ROMS/Pokemon - Blue Version (USA, Europe) (SGB Enhanced).gb` | `2a951313c2640e8c2cb21f25d1db019ae6245d9c7121f754fa61afd7bee6452d` | `2a951313c2640e8c2cb21f25d1db019ae6245d9c7121f754fa61afd7bee6452d` | IDÉNTICO |
| `docs/ROMS/Pokemon - Crystal Version (USA, Europe) (Rev 1).gbc` | `fdcc3c8c43813cf8731fc037d2a6d191bac75439c34b24ba1c27526e6acdc8a2` | `fdcc3c8c43813cf8731fc037d2a6d191bac75439c34b24ba1c27526e6acdc8a2` | IDÉNTICO |
| `docs/ROMS/Pokemon - Edicion Azul (Spain) (SGB Enhanced).gb` | `31317f74fed2935dfc5fbb6ada766cf8515949c85c6c6e8d32d0f752b85b8f9e` | `31317f74fed2935dfc5fbb6ada766cf8515949c85c6c6e8d32d0f752b85b8f9e` | IDÉNTICO |
| `docs/ROMS/Pokemon - Edicion Cristal (Spain).gbc` | `4aacb5b3ac7a741d99f507e7c31393c015dea26a3ce8876021c50e7c761c1141` | `4aacb5b3ac7a741d99f507e7c31393c015dea26a3ce8876021c50e7c761c1141` | IDÉNTICO |
| `docs/ROMS/Pokemon - Edicion Oro (Spain) (SGB Enhanced).gbc` | `7b78e33a348a0729e38ee0fd778cf49b3e07c35d2175ebc74d8f9be41f41455b` | `7b78e33a348a0729e38ee0fd778cf49b3e07c35d2175ebc74d8f9be41f41455b` | IDÉNTICO |
| `docs/ROMS/Pokemon - Gold Version (USA, Europe) (SGB Enhanced) (GB Compatible).gbc` | `fb0016d27b1e5374e1ec9fcad60e6628d8646103b5313ca683417f52b97e7e4e` | `fb0016d27b1e5374e1ec9fcad60e6628d8646103b5313ca683417f52b97e7e4e` | IDÉNTICO |
| `docs/ROMS/Pokemon - Goldene Edition (Germany) (SGB Enhanced).gbc` | `542f275f8632ef5265e5cde80a8ba1f0ec11ce714ef9d773088a92680bd17d73` | `542f275f8632ef5265e5cde80a8ba1f0ec11ce714ef9d773088a92680bd17d73` | IDÉNTICO |
| `docs/ROMS/Pokemon - Kristall-Edition (Germany).gbc` | `22c0dfec9ce004dceebe280d71fa2579fa376064f70284bbf46322e163aa1160` | `22c0dfec9ce004dceebe280d71fa2579fa376064f70284bbf46322e163aa1160` | IDÉNTICO |
| `docs/ROMS/Pokemon - Red Version (USA, Europe) (SGB Enhanced).gb` | `5ca7ba01642a3b27b0cc0b5349b52792795b62d3ed977e98a09390659af96b7b` | `5ca7ba01642a3b27b0cc0b5349b52792795b62d3ed977e98a09390659af96b7b` | IDÉNTICO |
| `docs/ROMS/Pokemon - Silver Version (USA, Europe) (SGB Enhanced) (GB Compatible).gbc` | `72b190859a59623cbef6c49d601f8de52c1d2331b4f08a8d2acc17274fc19a8c` | `72b190859a59623cbef6c49d601f8de52c1d2331b4f08a8d2acc17274fc19a8c` | IDÉNTICO |
| `docs/ROMS/Pokemon - Yellow Version - Special Pikachu Edition (USA, Europe) (GBC,SGB Enhanced).gb` | `8cbaa499397e4f1a679c992ea9382a2dd7942ab398b48c19829c2d9529de47bf` | `8cbaa499397e4f1a679c992ea9382a2dd7942ab398b48c19829c2d9529de47bf` | IDÉNTICO |

## 4. Alcance y límites

- VERIFICADO: los 23 ficheros listados conservan su SHA-256 byte a byte entre el inicio y el final de la misión.
- VERIFICADO: ni `bun run check` (incluye `dotnet build -c Release`) ni las 22 suites ni la sesión de navegador alteraron estos archivos.
- VERIFICADO: el servidor Bun preexistente sigue en `127.0.0.1:8787`; no se inició ni se detuvo.
- NO EJECUTADO: extracción, descompresión, copia o análisis de contenido de las ROMs; solo se calculó su SHA-256.
- NO EJECUTADO: escritura sobre `data/exports/`, `data/saves/`, `fixtures/`, `docs/ROMS/` ni sobre los saves originales.
- NO SE CREÓ ni modificó ningún archivo fuera de `docs/presentaciones/OC-SYNC-09/` en el repositorio; los logs y resultados temporales viven bajo `/tmp/opencode/oc-sync-09/`.

## 5. Cierre

**INTEGRIDAD: SIN CAMBIOS.** No hay discrepancias que reportar.
