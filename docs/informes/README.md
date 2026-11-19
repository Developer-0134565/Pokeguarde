# Informes de Pokeguarde

Índice centralizado de informes técnicos, auditorías, decisiones, resultados de
pruebas y evidencias generados durante el desarrollo de Pokeguarde (Gen 1-5).
Reunidos por la misión **PG-DOCSYNC-01** el 19-nov-2026.

Este directorio existe para que los informes puedan revisarse directamente en
GitHub, sin depender de archivos guardados solo en el equipo local.

- [MANIFEST.json](MANIFEST.json) — inventario verificable con SHA-256 de cada
  archivo publicado, origen, fase, categoría, fecha y saneamiento.
- [Decisiones pendientes](decisiones/README.md) — qué debe decidirse antes de PG-08B.
- [Resultados de pruebas](pruebas/README.md) — JSON de verificación y medición.

## Cómo verificar el contenido

Cada entrada del manifiesto incluye `ruta_relativa` y `sha256_publicado`. Desde
la raíz del repositorio:

```sh
python3 - <<'PY'
import hashlib, json, pathlib
m = json.load(open('docs/informes/MANIFEST.json'))
bad = [d['ruta_relativa'] for d in m['documentos']
       if hashlib.sha256(pathlib.Path('docs/informes', d['ruta_relativa']).read_bytes()).hexdigest()
       != d['sha256_publicado']]
print('OK' if not bad else 'DESAJUSTE: ' + ', '.join(bad))
PY
```

Los archivos marcados como `saneado: true` conservan su contenido original salvo
una sustitución de texto: el nombre de usuario local en las rutas `/home/…/`
pasa a ser el marcador `/home/<usuario>/`. `sha256_original` permite contrastar
con la fuente local sin publicarla.
**Ningún original local fue modificado.**

## Informes por fase

### PG-07 — Interfaz, contratos y reanálisis

| Informe | Contenido |
|---|---|
| [PG-07B](fases/PG-07/PG-07B-INFORME.md) | Implementación y verificación de la navegación/Guardería. |
| [PG-07C](fases/PG-07/PG-07C-INFORME.md) | Cierre de PG-07B e implementación de FICHA / DATOS. |
| [PG-07D](fases/PG-07/PG-07D-INFORME.md) | EQUIPO ACTIVO en la Biblioteca. |
| [PG-07E](fases/PG-07/PG-07E-INFORME.md) | CAJAS DE PC. |
| [PG-07F](fases/PG-07/PG-07F-INFORME.md) | Contrato completo de Cajas de PC. |
| [PG-07G](fases/PG-07/PG-07G-INFORME.md) | Reanálisis seguro de inventarios; BD real no modificada. |
| [PG-07H](fases/PG-07/PG-07H-INFORME.md) | Actualización supervisada de inventarios derivados. |

Anexos de PG-07G: [bloqueos](fases/PG-07/PG-07G/bloqueos.md),
[inventarios candidatos](fases/PG-07/PG-07G/inventarios-candidatos.md) y
[procedimiento](fases/PG-07/PG-07G/procedimiento.md).

### PG-08 — Guarderías compartidas

- [PG-08A — informe final](fases/PG-08/PG-08A-INFORME.md)
- Documentos técnicos (01-12) en [fases/PG-08/PG-08A/](fases/PG-08/PG-08A/):
  [01 auditoría](fases/PG-08/PG-08A/01-AUDITORIA.md),
  [02 propiedad](fases/PG-08/PG-08A/02-MODELO-PROPIEDAD.md),
  [03 permisos](fases/PG-08/PG-08A/03-MODELO-PERMISOS.md),
  [04 guardería](fases/PG-08/PG-08A/04-MODELO-GUARDERIA.md),
  [05 recuperación offline](fases/PG-08/PG-08A/05-RECUPERACION-OFFLINE.md),
  [06 amenazas](fases/PG-08/PG-08A/06-AMENAZAS.md),
  [07 contratos](fases/PG-08/PG-08A/07-CONTRATOS.md),
  [08 pruebas](fases/PG-08/PG-08A/08-PRUEBAS.md),
  [09 cobertura](fases/PG-08/PG-08A/09-COBERTURA.md),
  [10 integridad](fases/PG-08/PG-08A/10-INTEGRIDAD.md),
  [11 decisiones pendientes](fases/PG-08/PG-08A/11-DECISIONES-PENDIENTES.md),
  [12 propuesta PG-08B](fases/PG-08/PG-08A/12-PROPUESTA-PG08B.md).

**Estado:** PG-08A cerrada con 284/284 comprobaciones correctas. No se hicieron
commits de código ni cambios en producción.

### Fases anteriores (documentación ya publicada en el repositorio)

Estos documentos ya estaban en GitHub antes de PG-DOCSYNC-01 y no se duplican
aquí: [FASE-0](../FASE-0.md), [GUARDERIA](../GUARDERIA.md),
[LEGALIDAD](../LEGALIDAD.md), [ROADMAP](../ROADMAP.md),
[PG-06 sprite audit task](../PG-06_SPRITE_AUDIT_TASK.md),
[PG06 viewer results](../PG06_VIEWER_RESULTS.md),
[PG07A integration report](../PG07A_INTEGRATION_REPORT.md),
[SPRITE_AUDIT](../SPRITE_AUDIT.md),
[SPRITE_RENDERING_RFC](../SPRITE_RENDERING_RFC.md),
[STITCH_DESIGN_BRIEF](../STITCH_DESIGN_BRIEF.md),
[STITCH_IMPLEMENTATION_PLAN](../STITCH_IMPLEMENTATION_PLAN.md),
[BREEDING_DESIGN_RFC](../BREEDING_DESIGN_RFC.md),
[MONETIZATION_DESIGN_RFC](../MONETIZATION_DESIGN_RFC.md),
[POKEMON_SECURITY_RFC](../POKEMON_SECURITY_RFC.md) y
[SHARED_NURSERIES_SPEC](../SHARED_NURSERIES_SPEC.md).

## Auditorías

- [PG-STITCH-01 — informe ejecutivo](auditorias/PG-STITCH-01/08_INFORME_EJECUTIVO.md)
- [01 inventario Stitch](auditorias/PG-STITCH-01/01_INVENTARIO_STITCH.md)
- [02 auditoría de arquitectura](auditorias/PG-STITCH-01/02_AUDITORIA_ARQUITECTURA.md)
- [03 matriz pantallas vs. código](auditorias/PG-STITCH-01/03_MATRIZ_PANTALLAS_VS_CODIGO.md)
- [04 contradicciones y decisiones](auditorias/PG-STITCH-01/04_CONTRADICCIONES_Y_DECISIONES.md)
- [05 plan de implementación](auditorias/PG-STITCH-01/05_PLAN_IMPLEMENTACION.md)
- [06 estrategia de migración visual](auditorias/PG-STITCH-01/06_ESTRATEGIA_MIGRACION_VISUAL.md)
- [07 pruebas y riesgos](auditorias/PG-STITCH-01/07_PRUEBAS_Y_RIESGOS.md)

Regla vigente recordada en esas auditorías: **Stitch no es autoridad de
mecánicas ni de datos**; los valores de ejemplo de los mockups no son reglas del
juego (por ejemplo, Gen II con 510 EV es incompatible con el stat exp real).

## Decisiones pendientes — imprescindible para PG-08B

Antes de iniciar PG-08B deben decidirse las nueve cuestiones **D1-D9** recogidas
en [11-DECISIONES-PENDIENTES.md](fases/PG-08/PG-08A/11-DECISIONES-PENDIENTES.md):
identidad/autenticación, servicio autoritativo, persistencia, invitaciones,
conflictos, garantías offline, sincronización, retención y anti-abusos.

La recomendación técnica, **aún no adoptada**, está en
[12-PROPUESTA-PG08B.md](fases/PG-08/PG-08A/12-PROPUESTA-PG08B.md): un EventStore
aislado en `data/shared-pg08b.db` (nunca `pokegotchi.db`), sin interfaz, sin
endpoints, sin cuentas, sin crianza y sin commits de código.

También inciden en la decisión:
[04 contradicciones y decisiones (Stitch)](auditorias/PG-STITCH-01/04_CONTRADICCIONES_Y_DECISIONES.md),
[06 amenazas](fases/PG-08/PG-08A/06-AMENAZAS.md) y
[03 permisos](fases/PG-08/PG-08A/03-MODELO-PERMISOS.md).

## Resultados de pruebas

- [08 pruebas (PG-08A)](fases/PG-08/PG-08A/08-PRUEBAS.md) — 20 pruebas, 284/284 comprobaciones.
- [09 cobertura REAL vs SIMULADA](fases/PG-08/PG-08A/09-COBERTURA.md).
- [10 integridad y hashes protegidos](fases/PG-08/PG-08A/10-INTEGRIDAD.md).
- Datos de verificación [PG-07G](pruebas/PG-07G/) y [PG-07H](pruebas/PG-07H/).
- [Mediciones de sprites overworld](pruebas/pokeguarde-overworld-resoluciones.csv) (solo metadatos).

## Arquitectura y diseño

- [Sistema de diseño Pokéguarde Tactile Daycare](diseno/DESIGN.md).
- [Auditoría de arquitectura real](auditorias/PG-STITCH-01/02_AUDITORIA_ARQUITECTURA.md).
- [Estrategia de migración visual](auditorias/PG-STITCH-01/06_ESTRATEGIA_MIGRACION_VISUAL.md).
- [Contratos de PG-08A](fases/PG-08/PG-08A/07-CONTRATOS.md).

## Evidencias visuales

Capturas de PG-07C a PG-07F (escritorio y móvil), capturas de navegador de
PG-07H y el fondo de referencia 160x144, en [evidencias/](evidencias/).
Todas son PNG sin metadatos de texto. Se excluyeron imágenes grandes de
concepto y el archivo con Perfil EXIF incrustado.

## Limitaciones conocidas

- No hay informes propios de PG-01 a PG-06 además de los documentos ya
  publicados en `docs/`; no se han inventado informes para esas fases.
- Los PKHeX/formatos de Gen 1, 2 y 4 no hacen ida y vuelta byte a byte; la
  salida es la forma canónica (ver [FASE-0](../FASE-0.md)).
- La legalidad «no verificable» no bloquea el uso en Guardería; los hacks no
  permiten conclusiones definitivas.
- La exportación hoy escribe siempre una copia nueva del save de origen; las
  cadenas oficiales a otro save compatible aún no están ofrecidas en la UI.
- Amistad y movimientos editables siguen sin implementarse (solo EV/stat exp).
- Los sprites de terceros no se publican aquí; su licencia y autorización
  están pendientes de revisión (PG-06).

## Próxima fase prevista

**PG-08B** queda condicionada a la decisión humana de D1-D9. No se ha iniciado
su implementación.
