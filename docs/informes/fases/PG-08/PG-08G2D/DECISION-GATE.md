# PG-08G.2D — Decision Gate

Estados permitidos: `DECIDED` (autorizado y verificable), `PROPOSED`
(recomendación pendiente), `UNRESOLVED` (sin decisión) y `BLOCKED` (falta
evidencia necesaria). Los cuatro bloqueos de esta puerta son `UNRESOLVED`:
dispone de alternativas y evidencia suficiente para decidir, pero la elección
es de producto y está reservada al usuario. Ninguno se marca `BLOCKED` porque
no falta evidencia para formular la recomendación; ninguno se marca `DECIDED`
porque no hay autorización previa.

---

## Ficha R-B1 — C2, capacidad de almacenamiento por propietario

- **Problema exacto:** fijar el número definitivo de huevos almacenados por
  propietario en estados `produced`/`pending_assignment`/`stored`. Hoy `4` es un
  valor de prueba.
- **Evidencia:** `RIESGOS-Y-BLOQUEOS.md:23`; `DECISIONES-D4-D8-D9.md` §4.2;
  `shared-egg-store.ts:49` (`DEFAULT_EGG_CAPACITY=4`),
  `shared-egg-pair-store.ts:56` (`DEFAULT_PAIR_CAPACITY=4`);
  `shared-egg-store.ts:379` (`CAPACITY_BELOW_USAGE` sin destruir); PG-08A D1-A y
  D9-A pendientes; PG-08F `RIESGOS-Y-DECISIONES.md:17`.
- **Alternativas:** A por propietario + cola opcional; B por guardería; C
  ilimitada; D cuota 24 h. Ver `ANALISIS-ALTERNATIVAS.md` §1.
- **Recomendación:** A, con parámetro numérico pendiente y contadores C2/C3/C4
  desacoplados. Estado: `PROPOSED`.
- **Consecuencias:** si se elige A, el visitante no depende del cupo del
  anfitrión; si se elige B, puede aparecer un huevo huérfano; C contradice D9-A;
  D exige ventana temporal y reloj autoritativo.
- **Riesgos:** error de identidad al derivar el propietario; confundir C2 con el
  límite de 2 Pokémon; reducir la capacidad por debajo del uso real.
- **Decisión solicitada:** ¿se adopta la política por propietario y qué valor
  definitivo debe tener C2? Si no se quiere fijar valor aún, confirmar que sigue
  siendo parámetro de prueba en memoria.

---

## Ficha R-B2 — C3, capacidad de la cola de espera

- **Problema exacto:** fijar `backlogCapacity` para eventos de huevo aún no
  materializados. Hoy es `0`.
- **Evidencia:** `RIESGOS-Y-BLOQUEOS.md:24`; D4-G2 §4.3;
  `shared-egg-store.ts:50` (`DEFAULT_BACKLOG_CAPACITY=0`), `:391`
  (`SINGLE_BACKLOG_FORBIDDEN`), `:506` (`CAPACITY_EXHAUSTED` sin consumir
  idempotencia), `:509-513` y `:613-654` (encolado y drenaje); D8-G2; D9-G2
  §9.4; PG-08F `RIESGOS-Y-DECISIONES.md:19`.
- **Alternativas:** `C3=0` con `single`; `C3>0` con `bounded`; cola ilimitada;
  reasignación al otro propietario. Ver `ANALISIS-ALTERNATIVAS.md` §2.
- **Recomendación:** `single` para el piloto; `bounded` en fase posterior con
  C3 acotado y drenaje previo. Estado: `PROPOSED`.
- **Consecuencias:** con C3=0 no se pierde el huevo pero se rechaza el ciclo con
  capacidad llena; con C3>0 se requiere persistir el evento completo y drenar
  antes de la puesta al día; la reasignación rompe la propiedad por rol.
- **Riesgos:** reencolar un evento ya aplicado; caducidad sin resolver (R-B5,
  depende de D8-A); pérdida aparente si el usuario no ve la cola.
- **Decisión solicitada:** ¿se mantiene `single` sin cola, o se autoriza
  `bounded` y con qué C3?

---

## Ficha R-B3 — C4, límite de incubación simultánea

- **Problema exacto:** decidir si existe un cupo de incubación simultánea y, en
  su caso, su valor. Hoy el contador no existe.
- **Evidencia:** `RIESGOS-Y-BLOQUEOS.md:25`; D4-G2 §4.4; R-A16
  (`RIESGOS-Y-BLOQUEOS.md:55`); `CAPACIDAD-Y-ATOMICIDAD.md` (C4 independiente de
  C2); `ARQUITECTURA-GENETICA-V2.md` capas 6–7 y `UNKNOWN_HATCH_CYCLES`.
- **Alternativas:** no crear el contador; crear uno independiente con límite;
  reutilizar C2 (descartada por R-A16).
- **Recomendación:** no crear C4 en el piloto; si se introduce, debe ser
  independiente y su valor decidido por el usuario. Estado: `PROPOSED`.
- **Consecuencias:** sin C4 la incubación se modela por tiempo; con C4 aparece
  una política ajena al cartucho que debe presentarse como simulación.
- **Riesgos:** estado de incubación perdido al cerrar; mezcla con C2; suponer
  que el límite existe en los juegos originales.
- **Decisión solicitada:** ¿existe o no el contador C4? Si existe, ¿qué límite
  tiene? Se puede diferir sin bloquear el piloto Gen II.

---

## Ficha R-B4 — `maxEvents` / `maxWindowMs` de acumulación `bounded`

- **Problema exacto:** fijar los topes que permitirían compensar ausencias con
  varios ciclos.
- **Evidencia:** `RIESGOS-Y-BLOQUEOS.md:26`; D8-G2 (alternativas A–D);
  `breeding-engine.ts:55` (`OfflinePolicy`), `:184` (`initialState` con
  `maxPendingEggs=1`); `PROGRESO-OFFLINE.md` (algoritmo `n`, `WINDOW_EXCEEDED`,
  `CLOCK_ROLLBACK`); MATRIZ-DE-PRUEBAS OFF-04 a OFF-06; PG-08D reloj inyectado.
- **Alternativas:** A `single`; B `bounded` con topes; C proporcional al tiempo
  (descartada); D replay total (descartado).
- **Recomendación:** A para v1, B diferida; sin topes, `UNRESOLVED_POLICY` y
  cero ciclos. Estado: `PROPOSED`.
- **Consecuencias:** `single` limita la acumulación a un ciclo por puesta al día;
  `bounded` mejora la experiencia idle pero llena C2 y exige C3 y más estado.
- **Riesgos:** duplicados por repetición de puesta al día; reloj retrógrado;
  confundir el precedente de 7 días de la guardería con una tasa oficial (no
  adoptado).
- **Decisión solicitada:** ¿se adopta `single`? Si se prefiere `bounded`,
  ¿qué `maxEvents` y qué `maxWindowMs` se autorizan?

---

## 4. Verificación de competencia

- Ninguna ficha puede resolverse solo con un contrato técnico ya aprobado: los
  contratos fijan comportamientos y límites de seguridad, pero no eligen entre
  las alternativas de producto ni sus valores.
- Los puntos que sí están cerrados por contrato (custodia 2, 1+1, propiedad por
  rol, `claimed`, `DECIDED` de alcance sin PKM) se enumeran en
  `MATRIZ-RB1-RB4.md` §4 y `RECOMENDACIONES.md` §3.
- Por tanto: **cuatro decisiones humanas pendientes, cero decisiones
  auto-convertidas**.
