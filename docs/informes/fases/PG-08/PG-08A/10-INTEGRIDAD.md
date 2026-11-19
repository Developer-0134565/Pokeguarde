# PG-08A — Estado de integridad

**Estado:** VERIFICADO. Fecha de comprobación: 19-nov-2026.

---

## 1. Archivos protegidos

Se registraron los hashes SHA-256 **antes** de cualquier modificación en `/tmp/opencode/pg08a-protected-before.sha256` (17 entradas). Al final de la misión se ejecutó:

```
sha256sum -c /tmp/opencode/pg08a-protected-before.sha256
```

Resultado: **17 de 17 «La suma coincide»**. Ningún archivo protegido cambió.

| Archivo | SHA-256 |
|---|---|
| `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |
| `apps/server/src/db.ts` | `fcd95b0c63c059c57228bd7c06b1121247c23f6f18178388d43148f9193fed7b` |
| `apps/server/src/index.ts` | `f63e915cdb1d3869fafd0a6b7d33774b4c5b25e61a35fb1fbcd91a4e6826315e` |
| `apps/web/src/pet-engine.ts` | `26955014098ea15f36b21a8a0e714fcccf4183a8e0988cbea801abf9cfd096bb` |
| `apps/web/src/sprite-runtime.ts` | `9e25e9ecb8f9383294265706bedaefc3dda8dcc9c40fd4f2a08248fd9e8e9ac8` |
| `apps/web/src/sprite-render.ts` | `92f43df3284153b4be0a75755f9e7984a78e1aad40064ff6fd8d94a675185f30` |
| `apps/web/assets/room/guarderia.png` | `bcedbd6656113e43aca4f66cc932cd61b07fa02af4e7bb9a9ab26edaf56eb095` |
| `services/pkhex/pkhex.csproj` | `b9abdb854c71bcddde1e72dad6342709aa1370e27f62a8c1d4a605ccd693a03d` |
| `services/pkhex/Program.cs` | `014a489b81b8225424e41332f27ab1d2f9bd2147195177e5a585b47a70f983fa` |
| `fixtures/FIXTURES.md` | `15d63ad32c018f1060f24aa4a99b537cb73a75d4b39375f1731b0cba842433a1` |
| 8 fixtures `.srm` | coinciden (detalle en `/tmp/opencode/pg08a-protected-before.sha256`) |

Además, la suite `pg08a-check.ts` recalcula el hash de la BD al inicio y al final de las 20 pruebas y exige igualdad._RESULTADO: coincidentes.

---

## 2. Estado Git

| Magnitud | Valor inicial | Valor final | Interpretación |
|---|---|---|---|
| HEAD | `819b73b49a8aca76486173917d7abdb4518290ab` | `819b73b49a8aca76486173917d7abdb4518290ab` | Sin commits |
| `git rev-list --count 819b73b4...HEAD` | 0 | 0 | 0 commits nuevos |
| `git status --porcelain=v1 --untracked-files=all` (SHA-256) | `6b76e9e7cc883070d20c8f978928aae663793168e0057d844e0e94ba8dc1ebc9` | `b44ed4bf4978580314063a3153877c4e739918ab4e127b7eb7c7c71042833df5` | Cambio esperado: 2 archivos nuevos y 1 editado |
| Pushes | 0 | 0 | Sin publicación |

**Nota sobre el hash porcelain:** un hash de `git status` no es una medida de «limpieza», sino de identidad del estado del árbol de trabajo. El cambio es consecuencia directa de los entregables autorizados:

- NUEVO (sin seguimiento): `packages/core/src/shared-nurseries.ts`
- NUEVO (sin seguimiento): `scripts/pg08a-check.ts`
- MODIFICADO: `scripts/check.sh` (una sección de 3 líneas antes de «Todo correcto.»)

Los demás elementos del estado (`apps/server/src/index.ts`, `apps/web/index.html`, `i18n.ts`, `main.ts`, `nursery.ts`, `style.css`, `services/pkhex/Program.cs`, ZIP de Stitch, `STITCH_UPLOAD/`, scripts PG-07B–H) **ya existían antes de PG-08A** y no se tocaron.

---

## 3. Hashes de los entregables nuevos

| Archivo | Líneas | SHA-256 |
|---|---|---|
| `packages/core/src/shared-nurseries.ts` | 1165 | `bcc3309aecd816fda6648475bdd587a92a438884f4c6771973dce8e34055e513` |
| `scripts/pg08a-check.ts` | 390 | `5268c930697593a2c631eb40fd5bfdba91e587ab8da638933c39b5752b093cfc` |
| `scripts/check.sh` | — | `de0575d62530d6ff3161f0ff3aef30dde3ab73b31a7aac123716f42f703cc455` |

---

## 4. Verificación funcional sin regresiones

```
$ export PATH="$HOME/.dotnet:$PATH" && bun run check
...
== Guarderías compartidas (PG-08A) ==
PG-08A: 284/284 comprobaciones correctas.

Todo correcto.
```

EXIT 0. Secciones previas intactas: Motor, Día/noche, Traducciones, PG-07A (54), PG-07B, PG-07C, PG-07D, PG-07E, sidecar .NET (0 avisos/0 errores), PG-07F (132), PG-07G (69/69), PG-07H (101/101).

---

## 5. Superficie de escritura de PG-08A

| Operación de escritura | ¿Ocurrió? | Detalle |
|---|---|---|
| Escritura en `data/pokegotchi.db` | NO | Hash idéntico; el módulo no importa SQLite |
| Escritura en saves o fixtures | NO | 17/17 hashes coincidentes |
| Modificación de legalidad o exportaciones | NO | Program.cs y exportaciones intactos |
| Modificación de `pet-engine.ts` | NO | Hash idéntico |
| Modificación de sprites o fondo canónico | NO | Hashes idénticos |
| Instalación de dependencias | NO | `package.json` sin cambios |
| Arranque de servidor o servicios online | NO | Ningún proceso iniciado por PG-08A |
| Commit / push | NO | HEAD y recuento intactos |

Únicos archivos del repositorio tocados por PG-08A: los tres listados en §2.

---

## 6. Conclusión

La integridad de producción se conserva de forma demostrable. Los cambios se limitan a un módulo aislado, una suite de pruebas y una línea de integración en `check.sh`, todos dentro de la autorización expresa de la misión.
