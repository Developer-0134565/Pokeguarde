# Informes de Pokeguarde

Índice centralizado de informes técnicos, auditorías, decisiones, resultados de
pruebas y evidencias generados durante el desarrollo de Pokeguarde (Gen 1-5).
Reunidos por la misión **PG-DOCSYNC-01** el 19-nov-2026.

Este directorio existe para que los informes puedan revisarse directamente en
GitHub, sin depender de archivos guardados solo en el equipo local.

- [MANIFEST.json](MANIFEST.json) — inventario verificable con SHA-256 de cada
  archivo publicado, origen, fase, categoría, fecha y saneamiento.
- [Decisiones pendientes](decisiones/README.md) — estado de D1-D9 (D1-D3 aprobadas; D4-D9 pendientes).
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

- [PG-08B — informe final](fases/PG-08/PG-08B-INFORME.md)
- Documentos técnicos (01-07) en [fases/PG-08/PG-08B/](fases/PG-08/PG-08B/):
  [01 arquitectura](fases/PG-08/PG-08B/01-ARQUITECTURA.md),
  [02 esquema SQLite](fases/PG-08/PG-08B/02-ESQUEMA-SQLITE.md),
  [03 transacciones e idempotencia](fases/PG-08/PG-08B/03-TRANSACCIONES-Y-IDEMPOTENCIA.md),
  [04 migraciones, snapshots y corrupción](fases/PG-08/PG-08B/04-MIGRACIONES-SNAPSHOTS-CORRUPCION.md),
  [05 autoridad y límites](fases/PG-08/PG-08B/05-AUTORIDAD-Y-LIMITES.md),
  [06 pruebas](fases/PG-08/PG-08B/06-PRUEBAS.md),
  [07 decisiones pendientes](fases/PG-08/PG-08B/07-DECISIONES-PENDIENTES.md).

- [PG-08C — informe final](fases/PG-08/PG-08C-INFORME.md)
- Documentos técnicos (01-09) en [fases/PG-08/PG-08C/](fases/PG-08/PG-08C/):
  [01 arquitectura de autoridad](fases/PG-08/PG-08C/01-ARQUITECTURA-AUTORIDAD.md),
  [02 contrato de sincronización](fases/PG-08/PG-08C/02-CONTRATO-SINCRONIZACION.md),
  [03 cola duradera](fases/PG-08/PG-08C/03-COLA-DURADERA.md),
  [04 matriz de conflictos](fases/PG-08/PG-08C/04-MATRIZ-CONFLICTOS.md),
  [05 resultados de pruebas](fases/PG-08/PG-08C/05-RESULTADOS-PRUEBAS.md),
  [06 riesgos](fases/PG-08/PG-08C/06-RIESGOS.md),
  [07 estudio D6](fases/PG-08/PG-08C/07-ESTUDIO-D6.md),
  [08 recomendación no vinculante](fases/PG-08/PG-08C/08-RECOMENDACION-NO-VINCULANTE.md),
  [09 propuesta PG-08D](fases/PG-08/PG-08C/09-PROPUESTA-PG08D.md).

- [PG-08D — informe final](fases/PG-08/PG-08D-INFORME.md)
- Documentos técnicos (01-09) en [fases/PG-08/PG-08D/](fases/PG-08/PG-08D/):
  [01 arquitectura](fases/PG-08/PG-08D/01-ARQUITECTURA.md),
  [02 máquina de estados](fases/PG-08/PG-08D/02-MAQUINA-ESTADOS.md),
  [03 política de intervalos](fases/PG-08/PG-08D/03-POLITICA-INTERVALOS.md),
  [04 compatibilidad](fases/PG-08/PG-08D/04-COMPATIBILIDAD.md),
  [05 contratos de retirada y expulsión](fases/PG-08/PG-08D/05-CONTRATOS-RETIRADA-EXPULSION.md),
  [06 matriz de carreras](fases/PG-08/PG-08D/06-MATRIZ-CARRERAS.md),
  [07 pruebas](fases/PG-08/PG-08D/07-PRUEBAS.md),
  [08 riesgos y pendientes](fases/PG-08/PG-08D/08-RIESGOS-Y-PENDIENTES.md),
  [09 propuesta PG-08E](fases/PG-08/PG-08D/09-PROPUESTA-PG08E.md)
  (documento histórico: su propuesta quedó superada por la autorización vigente de PG-08E).

- [PG-08E — informe final](fases/PG-08/PG-08E-INFORME.md)
- Documentos técnicos (01-11) en [fases/PG-08/PG-08E/](fases/PG-08/PG-08E/):
  [01 contrato del huevo](fases/PG-08/PG-08E/01-CONTRATO-DEL-HUEVO.md),
  [02 máquina de estados](fases/PG-08/PG-08E/02-MAQUINA-ESTADOS.md),
  [03 propiedad](fases/PG-08/PG-08E/03-PROPIEDAD.md),
  [04 procedencia](fases/PG-08/PG-08E/04-PROCEDENCIA.md),
  [05 almacenamiento](fases/PG-08/PG-08E/05-ALMACENAMIENTO.md),
  [06 capacidad](fases/PG-08/PG-08E/06-CAPACIDAD.md),
  [07 acumulación offline](fases/PG-08/PG-08E/07-ACUMULACION-OFFLINE.md),
  [08 integración transaccional](fases/PG-08/PG-08E/08-INTEGRACION-TRANSACCIONAL.md),
  [09 conflictos](fases/PG-08/PG-08E/09-CONFLICTOS.md),
  [10 resultados de pruebas](fases/PG-08/PG-08E/10-RESULTADOS-PRUEBAS.md),
  [11 decisiones pendientes y propuesta PG-08F](fases/PG-08/PG-08E/11-DECISIONES-PENDIENTES.md).

- [PG-08F — informe final](fases/PG-08/PG-08F-INFORME.md)
- Documentos técnicos (11) en [fases/PG-08/PG-08F/](fases/PG-08/PG-08F/):
  [SYNCGATE](fases/PG-08/PG-08F/SYNCGATE.md),
  [ARQUITECTURA](fases/PG-08/PG-08F/ARQUITECTURA.md),
  [DISTRIBUCION-1-1](fases/PG-08/PG-08F/DISTRIBUCION-1-1.md),
  [ATOMICIDAD-Y-CONCURRENCIA](fases/PG-08/PG-08F/ATOMICIDAD-Y-CONCURRENCIA.md),
  [POKEMON-DEMO](fases/PG-08/PG-08F/POKEMON-DEMO.md),
  [EGG-DELIVERY-PORT](fases/PG-08/PG-08F/EGG-DELIVERY-PORT.md),
  [GENETICA-CONTRATO-FUTURO](fases/PG-08/PG-08F/GENETICA-CONTRATO-FUTURO.md),
  [AUTORIDAD-ONLINE-SPIKE](fases/PG-08/PG-08F/AUTORIDAD-ONLINE-SPIKE.md),
  [PRUEBAS](fases/PG-08/PG-08F/PRUEBAS.md),
  [RIESGOS-Y-DECISIONES](fases/PG-08/PG-08F/RIESGOS-Y-DECISIONES.md) y
  [PROPUESTA-PG08G](fases/PG-08/PG-08F/PROPUESTA-PG08G.md).

- [PG-08G.1 — informe final](fases/PG-08/PG-08G1-INFORME.md)
- Documentos técnicos (13) en [fases/PG-08/PG-08G1/](fases/PG-08/PG-08G1/):
  [SYNCGATE](fases/PG-08/PG-08G1/SYNCGATE.md),
  [MATRIZ-GENERACIONES](fases/PG-08/PG-08G1/MATRIZ-GENERACIONES.md),
  [GEN-II](fases/PG-08/PG-08G1/GEN-II.md),
  [GEN-III](fases/PG-08/PG-08G1/GEN-III.md),
  [GEN-IV](fases/PG-08/PG-08G1/GEN-IV.md),
  [GEN-V](fases/PG-08/PG-08G1/GEN-V.md),
  [PKHEX-AUDIT](fases/PG-08/PG-08G1/PKHEX-AUDIT.md),
  [ARQUITECTURA-GENETICA](fases/PG-08/PG-08G1/ARQUITECTURA-GENETICA.md),
  [RNG-Y-DETERMINISMO](fases/PG-08/PG-08G1/RNG-Y-DETERMINISMO.md),
  [LEGALIDAD-Y-PROCEDENCIA](fases/PG-08/PG-08G1/LEGALIDAD-Y-PROCEDENCIA.md),
  [DECISIONES-PENDIENTES](fases/PG-08/PG-08G1/DECISIONES-PENDIENTES.md),
  [PRUEBAS-EXPLORATORIAS](fases/PG-08/PG-08G1/PRUEBAS-EXPLORATORIAS.md) y
  [PROPUESTA-PG08G2](fases/PG-08/PG-08G1/PROPUESTA-PG08G2.md).
  Incluye el spike aislado `experimentos/rng-spike.ts` (5/5, fuera de `check.sh`).

**Estado:** PG-08A cerrada con 284/284 comprobaciones correctas; PG-08B cerrada
con 22/22; PG-08C cerrada con 33/33; PG-08D cerrada con 36/36; PG-08E cerrada
con 48/48; PG-08F cerrada con 50/50 y `bun run check` EXIT 0. **PG-08G.1**
(investigación y especificación genética) cerrada con SyncGate PASS WITH
WARNINGS: matriz Gen I–V, auditoría de PKHeX.Core 26.10.18 y contratos
propuestos, **sin motor genético implementado** y con PG-08G.2 **no
autorizada**. No se hicieron commits de código ni cambios en producción (BD real y
saves intactos). D1-D3, D5, D6 y D7 aprobadas; **D4, D8 y D9 pendientes**. D6
fue aprobada e implementada en PG-08D: retirada del propietario y expulsión del
anfitrión en cualquier momento, sin cambio de propiedad, sobre la autoridad
simulada local (no una garantía online real).

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

## Decisiones D1-D9

Las nueve cuestiones **D1-D9** están recogidas en
[11-DECISIONES-PENDIENTES.md](fases/PG-08/PG-08A/11-DECISIONES-PENDIENTES.md):
identidad/autenticación, servicio autoritativo, persistencia, invitaciones,
conflictos, garantías offline, sincronización, retención y anti-abusos.

**D1, D2 y D3 fueron aprobadas y aplicadas en PG-08B:** interfaz
`OwnerAuthenticator` sin cuentas ni login, diseño del límite autoridad/caché y
EventStore aislado en `data/shared-pg08b.db` (nunca `pokegotchi.db`). El store
local **no** equivale a un servidor autoritativo desplegado.

**D5 y D7 fueron aprobadas e implementadas en PG-08C** como autoridad simulada,
concurrencia optimista, cola duradera y sincronización al abrir; siguen siendo
mecanismos locales de desarrollo, no un servicio desplegado. **D6 fue aprobada
e implementada en PG-08D** (retirada/expulsión inmediatas, custodia delegada en
PG-08A, derecho de recuperación que nunca caduca); ver
[05 contratos de retirada y expulsión](fases/PG-08/PG-08D/05-CONTRATOS-RETIRADA-EXPULSION.md).
El estudio previo de PG-08C sigue disponible en
[07 estudio D6](fases/PG-08/PG-08C/07-ESTUDIO-D6.md). **D4, D8 y D9 siguen
pendientes y no se han adoptado silenciosamente.** Estado y riesgos en
[07 decisiones pendientes (PG-08B)](fases/PG-08/PG-08B/07-DECISIONES-PENDIENTES.md)
y [05 autoridad y límites](fases/PG-08/PG-08B/05-AUTORIDAD-Y-LIMITES.md).

También inciden en las decisiones pendientes:
[04 contradicciones y decisiones (Stitch)](auditorias/PG-STITCH-01/04_CONTRADICCIONES_Y_DECISIONES.md),
[06 amenazas](fases/PG-08/PG-08A/06-AMENAZAS.md) y
[03 permisos](fases/PG-08/PG-08A/03-MODELO-PERMISOS.md).

## Resultados de pruebas

- [08 pruebas (PG-08A)](fases/PG-08/PG-08A/08-PRUEBAS.md) — 20 pruebas, 284/284 comprobaciones.
- [06 pruebas (PG-08B)](fases/PG-08/PG-08B/06-PRUEBAS.md) — 22 casos, 22/22 comprobaciones.
- [05 resultados de pruebas (PG-08C)](fases/PG-08/PG-08C/05-RESULTADOS-PRUEBAS.md) — 33 casos, 33/33 comprobaciones.
- [07 pruebas (PG-08D)](fases/PG-08/PG-08D/07-PRUEBAS.md) — 36 casos, 36/36 comprobaciones.
- [09 cobertura REAL vs SIMULADA](fases/PG-08/PG-08A/09-COBERTURA.md).
- [Pruebas PG-08F](fases/PG-08/PG-08F/PRUEBAS.md) — 50 casos, 50/50 correctos.
- [10 integridad y hashes protegidos](fases/PG-08/PG-08A/10-INTEGRIDAD.md).
- Datos de verificación [PG-07G](pruebas/PG-07G/) y [PG-07H](pruebas/PG-07H/).
- [Mediciones de sprites overworld](pruebas/pokeguarde-overworld-resoluciones.csv) (solo metadatos).

## Arquitectura y diseño

- [Sistema de diseño Pokéguarde Tactile Daycare](diseno/DESIGN.md).
- [Auditoría de arquitectura real](auditorias/PG-STITCH-01/02_AUDITORIA_ARQUITECTURA.md).
- [Estrategia de migración visual](auditorias/PG-STITCH-01/06_ESTRATEGIA_MIGRACION_VISUAL.md).
- [Contratos de PG-08A](fases/PG-08/PG-08A/07-CONTRATOS.md).
- [Arquitectura de persistencia PG-08B](fases/PG-08/PG-08B/01-ARQUITECTURA.md).
- [Arquitectura de autoridad simulada PG-08C](fases/PG-08/PG-08C/01-ARQUITECTURA-AUTORIDAD.md).
- [Contrato de sincronización PG-08C](fases/PG-08/PG-08C/02-CONTRATO-SINCRONIZACION.md).
- [Arquitectura del motor de crianza PG-08D](fases/PG-08/PG-08D/01-ARQUITECTURA.md).
- [Máquina de estados PG-08D](fases/PG-08/PG-08D/02-MAQUINA-ESTADOS.md).

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

**PG-08E está completada y verificada** (48/48, sin commits ni pushes):
identidad persistente de huevos, procedencia con exclusión DEMO, propiedad
inmutable, almacenamiento aislado y recuperable, capacidad configurable,
acumulación `single`/`bounded` e integración transaccional con el motor de
PG-08D. Los huevos siguen siendo solo registros simulados: no crean PKM, no
modifican saves y no activan servicios públicos. La propuesta anterior de
PG-08E (catálogo oficial Gen 1-5) quedó superada por la autorización vigente;
se conserva como documento histórico en
[09 propuesta PG-08E](fases/PG-08/PG-08D/09-PROPUESTA-PG08E.md).

**PG-08F está completada y verificada** (50/50, sin commits ni pushes):
distribución 1+1 por ciclo, paridad atómica en SQLite, catálogo DEMO de 15
iniciales con procedencia permanente, `EggDeliveryPort` simulado, contrato
genético sin calcular y spike READ-ONLY de autoridad online. Todo sigue siendo
simulación local: no hay servidor público, PKM, eclosión ni entrega real.
La propuesta anterior de PG-08F quedó superada por la autorización vigente.

**PG-08G es solo una propuesta NO autorizada**: sustituir la capacidad de
prueba por una política aprobada, conectar el puerto de entrega a un transporte
local inmutable, enlazar PLAY NOW y repetir la auditoría online con un revisor
independiente. Requiere autorización explícita antes de implementarse.
El cierre de PG-08C está documentado en
[su informe](fases/PG-08/PG-08C-INFORME.md).

## PG-08G.1 y PG-08G.2 — Diseño genético (investigación)

**PG-08G.1** quedó terminada y verificada: auditoría de PKHeX.Core 26.10.18,
matriz de reglas Gen I–V, arquitectura genética y RNG exploratorio. Informe
consolidado: [PG-08G1-INFORME.md](fases/PG-08/PG-08G1-INFORME.md)
(SHA-256 `3e7251c02e8bc41039afc7d972f2fa7c3ef7a497fc44857ae4198e8d4e5c536e`).

**PG-08G.2** completó la investigación, la resolución de alternativas y la
especificación contractual, **sin implementar crianza ni tocar producción**.
SyncGate PASS WITH WARNINGS: HEAD `7c9c326…` = `origin/main`, 473/473 en
PG-08A–F, 17/17 hashes protegidos y base de datos `3c6fb194…3001fb4a`
intactos. Incluye matriz por `GameKey` (12 juegos), contratos TypeScript,
arquitectura de diez capas, RNG determinista con spike aislado 12/12,
legalidad en cuatro capas, 15 entregables y matriz de pruebas. Doce decisiones
quedan reservadas al usuario y tres conflictos siguen abiertos.

- [Informe consolidado PG-08G.2](fases/PG-08/PG-08G2/PG-08G2-INFORME.md)
- [Índice de entregables](fases/PG-08/PG-08G2/)
- [Propuesta de alcance para PG-08G.3 (NO autorizada)](fases/PG-08/PG-08G2/PROPUESTA-PG08G3.md)

**PG-08G.3 NO está autorizado.** La recomendación es decidir primero los
bloqueos R-B1…R-B4 y después aprobar un piloto vertical de Gen II sin PKM y sin
escrituras en `data/`. Los informes históricos no se han reescrito.

## PG-08G.2D — Genetic Decision Gate

**PG-08G.2D** preparó el cierre de decisiones sin implementar genética ni
modificar producción: extrajo literalmente R-B1…R-B4, los vinculó con
D4-G2/D8-G2/D9-G2 y PG-08A–F, analizó todas las alternativas documentadas y
dejó cuatro fichas `UNRESOLVED` con recomendaciones `PROPOSED`. Ninguna se
convirtió en `DECIDED`. Se propone un piloto Gen II en diez incrementos, sin BD,
saves, PKM, frontend ni sidecar. SyncGate PASS WITH WARNINGS: HEAD y
`origin/main` sin cambios en `7c9c326…`, 473/473 en PG-08A–F, 101/101 en PG-07H,
17/17 hashes protegidos, BD `3c6fb194…3001fb4a` intacta y sin commits ni
pushes. Dos subagentes agotaron su cuota, por lo que no hubo auditoría
independiente.

- [Informe consolidado PG-08G.2D](fases/PG-08/PG-08G2D/PG-08G2D-INFORME.md)
  (SHA-256 `10319b3caf83fb88c250a1bec226bbf18fbf7b0fd0c4c053d513c88f520e3eaa`).
- [Índice de entregables](fases/PG-08/PG-08G2D/)
- Copia local: `/home/missingn0/Descargas/PG-08G2D-INFORME.md`.

**PG-08G.3 sigue SIN autorizar.** Requiere decisiones humanas sobre R-B1 (C2),
R-B2 (C3), R-B3 (C4) y R-B4 (`maxEvents`/`maxWindowMs`), además de confirmar
G3-0.1, G3-0.4 y G3-0.5. Este bloque no reescribe informes históricos.

## PG-08G.2E — Breeding Contract Finalization

**PG-08G.2E** documentó BR-01…BR-07 sin implementar crianza ni tocar
producción: inventario de 20 huevos por usuario, chequeo determinista cada
60 minutos, umbral `HungryActual / HungryMax >= 0.70`, producción atómica 1+1,
recogida idempotente, cooldown desde la entrada al inventario y progreso
offline `ALL` con ventanas de 24 h. Se documentaron 16 conflictos y diez
incrementos revisados; `maxEvents = 5` queda bajo propuesta, sin modificación
unilateral. SyncGate PASS: HEAD y `origin/main` en `7c9c326…`, 473/473 en
PG-08A–F, 101/101 en PG-07H, 17/17 hashes, BD `3c6fb194…3001fb4a` intacta,
49 entradas locales conservadas, sin commits ni pushes.

- [Informe consolidado PG-08G.2E](fases/PG-08/PG-08G2E/PG-08G2E-INFORME.md)
  (SHA-256 `682c1f529ee85aa344fa10e0d2012a5590ba14d9afd93e83a4c72d8923936fd1`).
- [Índice de entregables](fases/PG-08/PG-08G2E/)
- Copia local: `/home/missingn0/Descargas/PG-08G2E-INFORME.md`.

**PG-08G.3 continúa SIN autorizar.** Requiere autorización expresa de ejecución
y resolver los conflictos abiertos de inventario, Hungry, evento offline y
duración del cooldown. Este bloque no reescribe informes históricos.

## PG-08G.2F — Final Breeding Contract & Evidence Recovery

**PG-08G.2F** cerró documentalmente BR-01…BR-08: inventario de 20 huevos
`claimed`, pendientes 2 por usuario, chequeo horario determinista con
producción 1+1 garantizada, umbral de Hungry verificado sobre `PetState.hunger`,
recogida manual idempotente, cooldown anclado en `claimedAt` y reconciliación
offline `ALL` en ventanas de 24 h con 24 chequeos. Se resolverán nueve de los
doce conflictos auditados; quedan abiertos cooldown, capacidad agotada, Hungry
más allá de 7 días, mejoras de tienda e implementación de `ALL`. La recuperación
del cooldown concluyó `UNKNOWN_HATCH_COOLDOWN` / `BLOCKED`: el rango 15 min–3 h
carece de fórmula y aprobación demostrable. Doce entregables, 30 pruebas
diseñadas y ningún cambio de producción.

- [Informe consolidado PG-08G.2F](fases/PG-08/PG-08G2F/PG-08G2F-INFORME.md)
  (SHA-256 `0b309b0b511c71144b8ecd9c6dac940f2dbeae5ca606cce0ccf772e671e96143`).
- [Índice de entregables](fases/PG-08/PG-08G2F/)
- Copia local: `/home/missingn0/Descargas/PG-08G2F-INFORME.md`.

**PG-08G.3 sigue SIN autorizar.** Se requiere autorización expresa e
independiente, además de resolver los bloqueos documentados. Este bloque no
reescribe informes históricos.

### PG-08G.2G — Gen II Breeding Pilot Unblock (19-nov-2026)

Preparación READ-ONLY del piloto de crianza Gen II. Trece entregables:
SYNCGATE, alcance, contrato V5 (con prefijo estable `G2G-BR-nn` por colisión
de numeración), recuperación de cooldown (`UNKNOWN_HATCH_COOLDOWN` / BLOCKED),
rareza reconciliada, capacidades y atomicidad 1+1, Hungry/offline, estados e
idempotencia, dependencias excluidas, matriz de 20 pruebas diseñadas, plan
G3-A…I, decisiones humanas pendientes e informe consolidado. Veredicto:
**PILOT READY WITH DEFERRED INCUBATION**; ninguna etapa autorizada y G3-E
bloqueada. `bun run check` NOT_RUN por riesgo de artefactos. Sin auditoría
independiente. No se reescriben informes históricos.

- [Informe consolidado PG-08G.2G](fases/PG-08/PG-08G2G/PG-08G2G-INFORME.md)
  (SHA-256 `d9f5eae4eac2a61066b8015d68dd35cf5759c0d7227364a68ec00fb8f1bab8e1`).
- [Índice de entregables](fases/PG-08/PG-08G2G/)
- Copia local: `/home/missingn0/Descargas/PG-08G2G-INFORME.md` (mismo SHA-256).
