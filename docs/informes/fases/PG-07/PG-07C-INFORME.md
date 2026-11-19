# PG-07C — Informe final

**Misión:** Cierre de PG-07B e implementación de FICHA / DATOS  
**Agente ejecutor:** OpenCode (Beam)  
**Repositorio:** `/home/<usuario>/Proyectos/Pokeguarde`  
**Fecha:** 19-nov-2026  
**Modo:** implementación controlada, sin commits ni pushes

---

## 1. Estado real inicial de PG-07B

**VERIFICADO.** Antes de tocar código se comprobó que PG-07B ya estaba implementada y operativa:

- Carcasa Tamagotchi roja ovalada, LCD integrada y botones físicos A/B/C.
- Canvas lógico `160×144`, fondo canónico `guarderia.png` y pixelación `image-rendering: pixelated`.
- Sprites overworld PG-07A activos con fallback procedural.
- HUD conectado a datos reales de la Guardería.
- Atajos de teclado: flechas para navegar, `Enter`/Espacio para aceptar y `Escape` para cancelar.
- Sin listeners duplicados; navegación Biblioteca ↔ Guardería repetida sin pérdida de eventos.
- Informe previo: `/home/<usuario>/Descargas/PG-07B-INFORME.md`.

**Correcciones efectuadas en PG-07B durante esta misión:** ninguna. Sus cambios previos se conservaron intactos; solo se verificó su integración con la nueva vista.

---

## 2. Archivos modificados y creados

### Modificados

| Archivo | SHA-256 |
|---|---|
| `apps/web/index.html` | `2a900b76ea477df591a1e9a55b9aae2fb3da6d0ce1bebf796854c5a3497f1d17` |
| `apps/web/src/i18n.ts` | `b88bdf3369e1003d1f9bb17e360c05285baa3370a6495c01aba056378bc15dd4` |
| `apps/web/src/main.ts` | `97481a41bc2e25f387fe78d1c9494bad55e8734b7929cadc4837a5771db64b4e` |
| `apps/web/src/nursery.ts` | `3ed02e751968dd6e009d81a46b6091155536a51ac05cb147ff11eaf44a07319b` |
| `apps/web/src/style.css` | `c15d1994e8a5439fb5422867ed9d177e7cbeef0168e1f957316beafc613559b1` |
| `scripts/check.sh` | `b016509ec94e9b498c14b612ba6244cb0985cc995fa2a54480c125712082032b` |

### Creado

| Archivo | SHA-256 |
|---|---|
| `scripts/pg07c-check.ts` | `70ec6378d789cb152af2681309f1a79a79e03aba0521b1aafb96e9220d13db8c` |

### Archivos protegidos — sin cambios

| Archivo | SHA-256 |
|---|---|
| `apps/server/src/index.ts` | `8a910b0a05615c3e22457cc9d414dc89ddf733deb10bf61196c7d63269baf695` |
| `apps/server/src/db.ts` | `fcd95b0c63c059c57228bd7c06b1121247c23f6f18178388d43148f9193fed7b` |
| `apps/web/src/pet-engine.ts` | `26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb` |
| `apps/web/src/sprite-runtime.ts` | `9e25e9ecb8f9383294265706bedaefc3dda8dcc9c40fd4f2a08248fd9e8e9ac8` |
| `apps/web/src/sprite-render.ts` | `92f43df3284153b4be0a75755f9e7984a78e1aad40064ff6fd8d94a675185f30` |
| `services/pkhex/Program.cs` | `5b777f4ab83c32636e112903ed712ca4100793b22785492ac2234bade1967278` |
| `apps/web/assets/room/guarderia.png` | `bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095` |
| `data/pokegotchi.db` | `2fb9e76bc8b8bb820a77e21342abe7b079f687749503315e13c0cf95106675e0` |

No se modificaron saves, fixtures ni exportaciones. No se instalaron dependencias.

---

## 3. Componentes reutilizados

- Carcasa `.device-shell`, anillo, marca y botonera A/B/C de PG-07B.
- Canvas lógico `160×144` y renderer PG-07A (`initOverworldSprites`, `paintOverworld`).
- Contrato real `/api/saves/:sha256` para el inventario completo.
- Contrato real `/api/pets` para el perfil de la Guardería.
- Motor determinista `pet-engine.ts` sin cambios.
- Catálogo y paleta GBC existentes.
- Funciones `refsOf`, `bindMons`, `adoptPet`, `setDossierNav`, `mon.allowed`/`mon.blocked` y veredicto PKHeX.
- i18n ES/EN con claves nuevas `nav.sheet` y `dossier.*`.
- Estilos propios `.dossier*`; **no** se copiaron `code.html`, Tailwind CDN, Google Fonts ni imágenes de Google.

Las referencias `ficha-desktop` y `ficha-mobile` se usaron solo como inspiración visual («Pocket Tech 1999»). Ninguna tiene correspondencia verificada con `SCREEN_23`, por lo que no se le asignó ese identificador.

---

## 4. Funcionalidad FICHA implementada

La vista `#sheet` se abre desde:

- Botón de navegación «Ficha / Datos».
- Pokémon de la Biblioteca (Equipo o Cajas).
- Botón «Ficha / Datos →» en la ficha de la Guardería.

Contenido mostrado solo con datos verificados:

- Sprite overworld local, con reintento limitado mientras cargan las hojas.
- Especie, nombre, nivel y género.
- Generación y juego de origen.
- Entrenador e ID cuando el backend los expone.
- Naturaleza y habilidad solo en generaciones donde existen; en Gen I/II aparece «no existe en esta generación».
- Objeto equipado; en Gen I aparece «no existe en esta generación».
- Estado de legalidad con los tres estados reales: `legal`, `unverified` e `illegal`.
- Origen de los datos: Biblioteca o Guardería.
- Botón de adopción solo desde Biblioteca y solo cuando el Pokémon no es `illegal`.

La adopción reutiliza `adoptPet()` una sola vez; se eliminó el modal duplicado anterior y `showMon()` quedó como alias compatible.

---

## 5. Funcionalidad DATOS implementada

- Estadísticas calculadas por PKHeX.Core cuando están presentes.
- DVs en Gen I/II con rango `0–15` y nota sobre el Stat Exp de Especial compartido.
- IVs en Gen III–V con rango `0–31`.
- Stat Exp en Gen I/II con tope `0–65535` por stat; **sin** límites modernos de 510/252.
- EVs en Gen III–V con topes `0–255` por stat y `510` total.
- EV guardados en el save frente a EV pendientes de la Guardería, sin mezclarlos.
- Movimientos con PP y PP Ups reales.
- EXP, amistad, ball, idioma, origen, nivel de encuentro y fechas cuando el contrato los expone.
- En Gen I: amistad, ball e idioma figuren como «no existe en esta generación».
- Motivos de legalidad e informe de PKHeX.Core.
- Cadenas de exportación legibles por sistema, con `permitido`/`bloqueado` y motivo; se corrigió el `[object Object]` inicial.
- Campos ausentes se muestran explícitamente como «no disponible».

---

## 6. Compatibilidad por generación

| Generación | Resultado verificado |
|---|---|
| Gen I (RB/Y) | DVs 0–15, Stat Exp 0–65535, sin naturaleza/habilidad/objeto/amistad/ball/idioma; legalidad real; exportación GB/GBC y bloqueo NDS con explicación. |
| Gen II (G/S/C) | Mismo modelo de DVs/Stat Exp; amistad disponible; ball e idioma excluidos. |
| Gen III–V | IV 0–31, EV 0–255/510, naturaleza y habilidad cuando el backend las expone, cadenas Pal Park / Poké Transfer según corresponda. |
| Mascotas | El perfil se resuelve al save solo si coinciden generación y especie; si no, se muestran únicamente datos de Guardería con nota `dossier.pet.mismatch`. |

No se reinterpretaron valores técnicos sin evidencia del backend. La habilidad se muestra como ID cuando no hay nombre en el contrato actual; no se inventó un nombre.

---

## 7. Pruebas ejecutadas y resultados

**VERIFICADO:** `bun run check` final con `EXIT=0` y salida `Todo correcto.`

- Motor de la Guardería: 11 grupos, todas `ok`.
- Día/noche: 26 comprobaciones, todas `ok`.
- Traducciones: 21 comprobaciones, todas `ok`.
- PG-07A: **54/54**.
- PG-07B: **43/43**, incluidos hashes protegidos.
- PG-07C: todas `ok`; cubre navegación, pestañas de Biblioteca intactas, callback de Guardería, limpieza y restauración de mascota, orígenes reales, EV guardados vs pendientes, resolución por API, dato no disponible, `dossierResolvedInventory`, validación de generación/especie, rechazo de resolución divergente, objeto inexistente en Gen I, adopción única, sin modal duplicado, reglas Gen I/II y Gen III–V, atajos, listener único, i18n ES/EN, sin URLs externas, CSS responsive y 8 hashes protegidos.
- Sidecar PKHeX: `dotnet build` con **0 advertencias / 0 errores**.

### Verificación en navegador

Servidor aislado en `http://127.0.0.1:8788/` sobre copia en `/tmp/opencode/pg07c-live`; servidor real 8787 intacto. Sesión `agent-browser` `pg07c-957274a7fcad`.

**Escritorio 1280×900:**

- Biblioteca → FICHA → DATOS con Manaphy de HeartGold: legality `legal`, IV 0–31, EV 0–255/510, 4 movimientos con PP, EXP 59664, amistad 221, ball 4, idioma 7, Route 26 y fecha real.
- Cambio de save con la ficha abierta: la ficha se oculta y vuelve la Biblioteca; no quedan datos obsoletos.
- Gen I Ekans «SNEKO»: legality `ilegal`, DVs 13/5/11/9/9/14, Stat Exp con nota de Especial compartido, sin adopción y campos inexistentes marcados como tales.
- Guardería → FICHA/DATOS con ELECTRODE: datos reales de Gen 4 tras la validación de inventario resuelto; sin mezcla con Gen 1.
- Teclado: `ArrowLeft` vuelve a FICHA, `Enter` abre DATOS, `Escape` cierra y restaura la vista anterior.
- Ratón y controles táctiles: navegación y pestañas operativas.

**Móvil 390×844:**

- `bodyClientWidth=390`, `bodyScrollWidth=390`, `overflowX=false`.
- `.dossier-card` de 340 px de ancho; pestañas FICHA/DATOS visibles y utilizables.
- Sin `[object Object]`; «← Volver» devuelve a Biblioteca con `#nav-library` activo.

### Capturas

| Archivo | SHA-256 |
|---|---|
| `/home/<usuario>/Descargas/PG-07C-Desktop.png` | `1f2f4783a357c0aa4d166482649072d3d71b255890d64aaa033d281b773699b2` |
| `/home/<usuario>/Descargas/PG-07C-Mobile.png` | `3a02b85ba8269a8eefd0a60f21aaba3d3a12417fd9707be9afde64e6607839f6` |

---

## 8. Funciones pendientes por contratos inexistentes

- Nombres de habilidad y naturaleza: el backend expone IDs; se muestran IDs o «no disponible», sin inventar nombres.
- Forma y algunos campos avanzados: no están en el contrato actual; aparecen como no disponibles.
- Para mascotas Gen I/II con `pid = 0`, `petView` no expone `location`/`box_index`/`slot`, así que no se puede resolver la ranura exacta; se muestran solo datos del perfil.
- No se implementaron directorio multijugador, invitaciones, permisos delegados, crianza, huevos, incubación, Guardipuntos ni tienda.
- No se verificó la correspondencia con `SCREEN_23`: ninguna referencia local tiene ID confirmado.

---

## 9. Riesgos o regresiones

- **Ninguna regresión detectada** en PG-07A o PG-07B: sus suites siguen en 54/54 y 43/43.
- El sprite depende del catálogo local y de la carga asíncrona de hojas; se mitigó con reintento limitado y mensaje explícito si falla.
- La resolución de mascotas depende de que el save indicado siga disponible; si falta o no coincide generación/especie, se muestra solo el perfil y una nota, sin datos mezclados.
- No se introdujeron servicios externos, dependencias ni escrituras en archivos de save.

---

## 10. Estado final del repositorio

- HEAD: `819b73b49a8aca76486173917d7abdb4518290ab`
- Rama: `main`
- `git status --porcelain=v1 --untracked-files=all`: 45 líneas, SHA-256 `43dd1da9fc5d1792ebbe6b5a361e0cffd6d8ebf4313e9dbe077f71abb27e2d3b`.
- 6 archivos rastreados modificados; `scripts/pg07c-check.ts` nuevo y sin seguimiento, junto a `scripts/pg07b-check.ts` y las entradas preexistentes de Stitch.
- **Sin commits ni pushes.**

---

## 11. Recomendación sobre el siguiente hito

Avanzar a la siguiente fase de evolución visual solo con una misión explícita. La candidata natural es **EQUIPO ACTIVO**, porque ya existen el inventario real, las tarjetas de Pokémon y la navegación; debe reutilizar `refsOf`, `#tab` y el mismo patrón de vista que FICHA/DATOS sin tocar saves ni contratos de backend. No iniciar crianza, multijugador ni tienda sin decisiones de diseño y seguridad autorizadas.
