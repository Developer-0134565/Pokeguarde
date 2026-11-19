# PG-08G.1 — Informe final: investigación genética y especificación de crianza Gen I–V

**Fecha:** 19-nov-2026
**Modalidad:** READ-ONLY sobre código de producción. Documentación y pruebas
exploratorias aisladas.
**Resultado:** SyncGate **PASS WITH WARNINGS**; investigación, matriz, auditoría
de PKHeX.Core y contratos propuestos completados. **No se implementó ningún
motor genético.** PG-08G.2 no está autorizada.

---

## 1. Resumen ejecutivo

Esta fase responde a una pregunta: *¿qué hace falta saber y decidir antes de
escribir el motor genético que convierta un ciclo de crianza compartida en dos
huevos con rasgos independientes?*

Conclusiones principales:

1. **No existe una «regla de crianza» única.** Gen I no tiene crianza; Gen II usa
   DVs y shiny derivado de ellos; Gen III cambia a IVs, naturalezas y
   habilidades; Gen IV añade Power Items solo en HGSS; Gen V añade habilidades
   ocultas y cambia Everstone en B2/W2. Dentro de una misma generación, versiones
   distintas tienen reglas distintas (Emerald ≠ R/S/FRLG; DP/Pt ≠ HGSS; B/W ≠
   B2/W2).
2. **PKHeX.Core 26.10.18 no genera huevos desde dos progenitores.** Ofrece
   validadores de crianza, plantillas `EncounterEgg*` que construyen un PKM a
   partir de criterios y entrenador, forense de semillas y validación de
   eclosión. La lógica de herencia debe ser de Pokeguarde y, si algún día se
   materializa en PKM, validarse después con `LegalityAnalysis`.
3. **El par 1+1 es viable con separación de dominios en la derivación
   aleatoria.** Un spike aislado demuestra que dos huevos del mismo ciclo
   obtienen flujos distintos y reproducibles sin `Math.random()`. Ese spike no
   es producción ni está integrado en `check.sh`.
4. **La frontera DEMO / simulado / real se mantiene intacta.** Nada de esta fase
   es PKM, exportable ni apto para `LegalityAnalysis`.
5. **D4, D8 y D9 siguen pendientes**; la distribución 1+1, DEMO y propiedad son
   decisiones cerradas de PG-08F y no se reabren.

---

## 2. SyncGate (SG-01 a SG-05)

Detalle completo en `PG-08G1/SYNCGATE.md`. Resumen:

| Comprobación | Resultado |
|---|---|
| Rama | `main` |
| HEAD local | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| `origin/main` | `7c9c326be0eb4dced4969c5b0f966413d3299dae` |
| Divergencia | `0 0` |
| Conflictos / índice | Ninguno (`git ls-files -u` y `git diff --cached` vacíos) |
| Árbol de trabajo | 44 entradas locales preexistentes (PG-08B…F, Stitch, sidecar); **conservadas** |
| `bun run check` | EXIT 0 |
| Hashes protegidos | 17/17 coincidentes |
| `data/pokegotchi.db` | `3c6fb19447b7f58441822006c7e422cb2744274a7817b3a8b9d9609d3001fb4a` |

**Clasificación: PASS WITH WARNINGS.** Advertencias: trabajo local sin commitear
de fases anteriores y WAL/SHM preexistentes junto a la BD. Ninguna afecta a la
misión.

Baseline de pruebas registrado antes de tocar nada:

| Suite | Resultado |
|---|---:|
| PG-07H | 101/101 |
| PG-08A | 284/284 |
| PG-08B | 22/22 |
| PG-08C | 33/33 |
| PG-08D | 36/36 |
| PG-08E | 48/48 |
| PG-08F | 50/50 |
| **Total PG-08 A–F** | **473/473** |

---

## 3. Metodología y fuentes

- Lectura directa de los contratos reales: `packages/core/src/breeding-engine.ts`,
  `egg-domain.ts`, `egg-pair-domain.ts`, `apps/server/src/shared-egg-store.ts`,
  `shared-egg-pair-store.ts`, informes PG-08D/E/F y `AGENTS.md`.
- Investigación documental con Bulbapedia y Serebii. El acceso directo a
  Bulbapedia devuelve 403; se usó `r.jina.ai` como proxy de lectura. `websearch`
  devuelve HTTP 402 en este entorno.
- Auditoría de PKHeX.Core mediante el comando `members` del sidecar (reflexión de
  solo lectura), metadatos del ensamblado y lectura de `Program.cs`. No se
  compiló, no se abrió ningún save y no se ejecutó `inspect`/`inventory`/`export`.
- Pruebas exploratorias: un spike puro en
  `PG-08G1/experimentos/rng-spike.ts`, fuera de `scripts/check.sh`.

### Niveles de confianza usados

**VERIFIED** (afirmación explícita y coherente en fuente primaria),
**PARTIALLY VERIFIED** (fuente incompleta o única), **CONFLICTING** (fuentes
discrepantes), **UNKNOWN**, **NOT APPLICABLE**.

---

## 4. Hallazgos por generación

Detalle en `MATRIZ-GENERACIONES.md`, `GEN-II.md`, `GEN-III.md`, `GEN-IV.md` y
`GEN-V.md`. Síntesis:

### Gen I — Red/Blue/Yellow

- **No existe crianza.** No hay Day Care, huevos, sexo, naturaleza ni shiny.
  Cualquier huevo con met Gen I es imposible.
- **DVs**, no IVs: cuatro valores 0–15 (Ataque, Defensa, Velocidad, Especial); HP
  se deriva de los bits bajos de los otros cuatro.
- **Time Capsule** (solo G/S/C) permite intercambiar con Gen I con restricciones:
  sin Pokémon de Gen II ni huevos, sin Correo, sin movimientos de Gen II; cambio
  de tipo cancela el intercambio salvo Magnemite/Magneton; el objeto equipado al
  llegar se deriva de la tasa de captura.
- **Gen I → Gen III+ no existe.** Los DVs no se «traducen» a IVs.
- Consecuencia: **no se inventa crianza retroactiva**; el bloqueo de exportación
  a NDS ya vigente es correcto.

### Gen II — Gold/Silver/Crystal

- Compatibilidad: mismo **Egg Group** + sexos opuestos; Ditto con casi todo;
  genderless solo con Ditto; **No Eggs Discovered** nunca cría.
- **Incompatibilidad exclusiva**: si los Defense DVs son iguales y los Special
  DVs son iguales o difieren en 8, no hay huevo.
- **Sexo** = Attack DV frente al ratio de la especie (♀ si DV ≤ ratio).
- **Shiny** por DVs (Def=Vel=Esp=10, Atk en un conjunto concreto); 1/8192; un
  progenitor shiny de sexo opuesto sube hasta 1/64; dos shinies no pueden criar.
- **Herencia de DVs**: Defense se copia del progenitor de sexo opuesto (o Ditto),
  Special se copia o ±8, Attack y Speed aleatorios, HP derivado.
- **Especie**: primer estado de la cadena de la madre (o del no-Ditto);
  Nidoran♀/♂ 50/50. **Eclosión a nivel 5.**
- **Movimientos**: egg moves y TM/HM del padre (tutor en Crystal), movimientos de
  nivel compartidos, por defecto nivel ≤5. Prioridad exacta: PARTIALLY VERIFIED.
- **Everstone no hereda nada** en Gen II (no hay naturalezas).

### Gen III — Ruby/Sapphire/Emerald/FireRed/LeafGreen

- **IVs 0–31** (seis independientes), **naturalezas** y **habilidades**.
- **R/S/FRLG**: exactamente **3 IVs** heredados.
  **Emerald**: mecanismo con overrides; quedan 3–5 stats aleatorios.
- **Naturaleza**: aleatoria en R/S/FRLG; en **Emerald**, madre (o Ditto) con
  Everstone → 50 %.
- **Habilidades no heredables.**
- **Sexo y shiny por PID** (1/8192).
- **Emerald**: Light Ball en cualquier progenitor → Pichu con Volt Tackle.
- **Inciensos** para bebés (lista completa PARTIALLY VERIFIED).
- **Poké Ball estándar** siempre.

### Gen IV — Diamond/Pearl/Platinum/HeartGold/SoulSilver

- **DP/Pt**: herencia de IVs como Emerald (overrides). **HGSS**: **3 IVs de
  stats distintas** + **Power Items** (fuerzan el IV de su stat; si ambos los
  llevan, se elige uno al azar).
- **Destiny Knot no afecta a la crianza** en Gen IV.
- **Everstone**: DP/Pt como Emerald y **falla si los padres tienen distinto
  idioma**; HGSS cualquier portador, 50 %, sin restricción.
- **Habilidades no heredables.**
- **Masuda**: 5 rolls; cifra **CONFLICTING** (≈1/1639 en Bulbapedia, 1/2048 en
  Serebii). No fijar probabilidad.
- **Eclosión a nivel 1** (cambio respecto a Gen II/III).

### Gen V — Black/White / Black 2/White 2

- **IVs**: como HGSS (3 stats distintas + Power Items). Destiny Knot sin efecto.
- **Everstone**: B/W 50 % y ya funciona entre idiomas; **B2/W2 100 %** (si ambos
  lo llevan, se elige al azar).
- **Habilidades**:
  - B/W: normal **no** se hereda; oculta **60 %** si la hembra la tiene y cría
    con macho (no con Ditto).
  - B2/W2: normal **80 %** (hembra con macho, no con Ditto); oculta **80 %**.
  - Machos y genderless no transmiten.
- **Shiny**: Masuda 6 rolls ≈1/1366; Shiny Charm solo B2/W2 (3 rolls ≈1/2731);
  Masuda + Charm ≈1/1024.

### Reglas que NO existen (evitar anacronismos)

| Creencia | Realidad | Confianza |
|---|---|---|
| Crianza en Gen I | No existe | VERIFIED |
| Time Capsule en HGSS | Solo G/S/C | VERIFIED |
| Crianza Gen I/II → Gen III+ | No existe mecanismo oficial | VERIFIED |
| Destiny Knot = 5 IVs en Gen IV/V | Efecto de crianza empieza en Gen VI | VERIFIED |
| Power Items en Gen III | Debutan en Gen IV; crianza desde HGSS | VERIFIED |
| Herencia de habilidades en Gen III/IV | No existe | VERIFIED |
| Habilidad normal heredable en B/W | Solo la oculta al 60 % | VERIFIED |
| Ball especial heredada en Gen III–V | Siempre Poké Ball | VERIFIED |

---

## 5. Auditoría de PKHeX.Core 26.10.18

Detalle en `PKHEX-AUDIT.md`.

- **Versión fijada**: `26.10.18`, `net10.0`, .NET SDK `10.0.404`, commit
  `bfe89c74a3f5265805e364b79bc04ad38ebbc5ea`.
- **No hay generador de huevos desde dos progenitores.** No existe
  `EggGenerator`/`BreedGenerator` ni método equivalente.
- **Sí existen**:
  - validadores: `Breeding`, `MoveBreed*`, `ChainBreedLegality`,
    `AbilityBreedLegality`, `EggVerifier`, `EggStateLegality`;
  - plantillas: `EncounterEgg2..9.ConvertToPKM(ITrainerInfo, EncounterCriteria)`;
  - forense de semillas: `Daycare3.TryGetOriginSeed`, `Daycare5/6/7/8b.Seed`;
  - eclosión: `EggHatchLegality`, `EggHatchLocation3..9`;
  - legalidad: `LegalityAnalysis.Valid/Results/Info/HasResult`,
    `LegalityFormatting`, `LegalityCheckResultCode`.
- **Hallazgo**: el veredicto de tres estados de Pokeguarde (`legal` /
  `unverified` / `illegal`) **no es una API de PKHeX**; `Program.cs` compara
  subcadenas del informe en inglés. Es lógica propia y frágil ante idioma o
  versión.
- **Limitación metodológica**: el comando `members` no filtra `Type.IsPublic`, así
  que «miembro listado» ≠ «tipo accesible desde otro ensamblado». Solo se
  consideran VERIFICADOS los tipos que `Program.cs` usa y compila.
- **Riesgo accionable**: `VitaminClamp` codifica a mano la regla de vitaminas y
  detecta el problema por texto; existe `EffortExpLegality.GetRequiredEffortEXP`,
  pero no se verificó equivalencia exacta.

### Reparto recomendado

| Responsabilidad | Dónde |
|---|---|
| Parseo de saves, lectura/escritura de campos, veredicto y motivos | PKHeX.Core |
| Tablas por edición, movimientos, grupos huevo, especies | PKHeX.Core |
| Eclosión, ball, habilidad, shiny, PID (validación) | PKHeX.Core |
| Guardería, minijuegos, propiedad, idempotencia, trazabilidad | Pokeguarde |
| Reglas históricas de herencia y RNG con dominios | Pokeguarde |
| Frontera DEMO/simulado/real y cadenas de transferencia | Pokeguarde |

---

## 6. Arquitectura genética propuesta (NO implementada)

Detalle en `ARQUITECTURA-GENETICA.md`.

Se proponen doce contratos (A–L): `BreedingCompatibility`,
`OffspringSpeciesResolver`, `InheritanceEngine`, `NatureResolver`,
`IVDVResolver`, `AbilityResolver`, `GenderResolver`, `ShinyResolver`,
`EggMoveResolver`, `LegalityValidationPort`, `RandomnessPort` y
`GenerationRulesProvider`.

Principios:

1. **Sin duplicación**: PG-08D decide *cuándo* hay ciclo completado; PG-08E
   decide *qué es un huevo*; PG-08F decide *a quién pertenece*; PG-08G.2
   decidiría *qué rasgos simulados* lleva.
2. **Sin PKM**: el resultado conserva `legitimacy: SIMULATED_LOG_ONLY`,
   `realPkm:false`, `exportable:false`.
3. **Reglas por juego**, no por generación: `GenerationRulesProvider` recibe un
   `GameKey` explícito.
4. **Todo inyectable**: reloj, procedencia, compatibilidad, azar y validación son
   puertos.
5. **Fallo cerrado**: sin reglas VERIFIED, devuelve `UNKNOWN_RULES` y no produce
   genética.

Ninguno de esos nombres existe hoy en el repositorio: son propuestas. Los únicos
tipos reales reutilizados son `DomainResult<T>`, `PokemonProvenance`,
`EggParentRef`, `PairMember`, `EggRecord`, `BreedingCompatibilityProvider`,
`EggDeliveryPort` y `GeneticsAlgorithmRef`.

---

## 7. Independencia genética del par 1+1

Detalle en `RNG-Y-DETERMINISMO.md`.

- El error a evitar: derivar ambos huevos solo de `cycleId` → misma secuencia.
- Solución propuesta: contexto de derivación con **separación de dominios**:
  `cycleId`, `eggId` (vía `pairEggIdFor`), `recipientRole`,
  `authoritySequence`, `rulesetVersion`, `algorithmId` y `purpose`
  (`species` / `gender` / `ivdv` / `nature` / …).
- Semilla efectiva: HMAC-SHA256 de la semilla maestra sobre ese contexto;
  flujo SHA256-CTR; cada canal (`purpose`) tiene su propio flujo.
- **Reproducibilidad vs seguridad**: semilla fija inyectada en pruebas;
  secuencia de autoridad simulada en local; en producción futura, secreto de la
  autoridad + entropía del sistema, nunca expuesto al jugador.
- No se registra la semilla maestra; solo `algorithmId`, `rulesetVersion` y un
  hash de la semilla derivada.
- La derivación es una **función pura** del contexto: reintentos y replay
  producen el mismo resultado; el store decide si ya fue confirmado.

---

## 8. Legalidad y procedencia

Detalle en `LEGALIDAD-Y-PROCEDENCIA.md`.

Seis categorías que no deben mezclarse:

| # | Categoría | Puede criar | Exportable |
|---|---|---|---|
| 1 | DEMO (`DEMO_INTERNAL_NON_EXPORTABLE`) | **No** | **No** |
| 2 | Importado (`SAVE_IMPORTED`) | Según permisos y versión | Según legalidad destino |
| 3 | Huevo simulado (`SIMULATED_LOG_ONLY`) | No aplica | **No** |
| 4 | Futuro generado (PG-08G.2) | No aplica | **No** |
| 5 | Validado (`LegalityValidationPort`) | Según contexto | Aún no implementado |
| 6 | Exportable (PKM real) | Fuera de alcance | Solo con protocolo de exportación |

Reglas: `isBreedableProvenance()` es la primera comprobación; la procedencia es
inmutable; los datos genéticos no son PKM; pasar un `ResolvedGenetics` simulado
a `LegalityAnalysis` sería un error de categoría; la validación de PKHeX no
equivale a legitimidad histórica.

Riesgos documentados: PID/shiny, IV/DV mezclados, OT/TID/SID, idioma y versión de
origen, objeto de herencia, habilidad oculta, met location y flujos HTTP que
olviden consultar el dominio DEMO.

---

## 9. Pruebas exploratorias

Detalle en `PRUEBAS-EXPLORATORIAS.md`.

**Experimento A** — `PG-08G1/experimentos/rng-spike.ts`, ejecutado con
`bun run …/rng-spike.ts`, EXIT 0:

```
OK   mismo contexto → misma secuencia
OK   host != guest
OK   ivdv != nature
OK   sin Math.random en el módulo
OK   salida acotada a uint32
PG-08G1-EXPLORE — 5/5 correctos, 0 fallidos
```

**Experimento B** — lectura de contratos: confirmado que
`unresolvedGenetics(generation)` devuelve todos los campos `null`, que
`pairEggIdFor(cycleId, productionEventId, role)` ya distingue anfitrión e
invitado, y que no existe ningún resolvedor genético real.

**Experimento C** — API de PKHeX.Core (ver sección 5).

No se crearon Pokémon, PKM ni saves; no se abrió SQLite de producción; no se
añadieron dependencias; el spike no está en `scripts/check.sh`.

---

## 10. Decisiones pendientes (D4, D8, D9)

Detalle en `DECISIONES-PENDIENTES.md`.

| Decisión | Estado |
|---|---|
| Distribución **1+1** | **Aprobada** (PG-08F); no se reabre |
| DEMO no cría / no exporta | **Aprobada** (PG-08E/F) |
| D4 — invitaciones y descubrimiento | **PENDIENTE**; solo «modo local sin cuentas» está aprobado en `AGENTS.md` |
| D8 — retención de datos | **PENDIENTE**; plazos sin aprobar |
| D9 — límites y abuso | **PENDIENTE**; `DEFAULT_PAIR_CAPACITY=4` es valor de prueba, no política |
| Capacidad definitiva de huevos | **PENDIENTE** |
| Acumulación offline | **PENDIENTE** (`single` es comportamiento experimental) |
| Genética por generación | **PENDIENTE** (esta fase propone reglas, no las fija) |
| Exportabilidad futura | **PENDIENTE** |
| Reglas de legitimidad/validación | **PENDIENTE** |

«Pendiente» significa **no decidido**, no «decidido en falso». Ningún valor de
prueba de PG-08D–F se convierte en política por estar en el código.

---

## 11. Riesgos identificados

| Riesgo | Impacto | Mitigación propuesta |
|---|---|---|
| Aplicar reglas de Gen VI+ a Gen IV/V (Destiny Knot, habilidades heredadas) | Datos históricamente imposibles | `GenerationRulesProvider` por `GameKey`; matriz con estado |
| Mezclar DVs e IVs | Datos imposibles en Gen I/II | Resolvedor separado por generación |
| Reutilizar la misma secuencia para ambos huevos | Gemelos idénticos | Separación de dominios con `eggId` + `recipientRole` + `purpose` |
| Fabricar PID/met data para «cuadrar» legalidad | Evidencia falsa | No generar PID; bloquear exportación; validar solo con PKM real |
| Confundir validación PKHeX con legitimidad histórica | Falsa garantía | Documentado como error de categoría |
| Veredicto por subcadenas en inglés | Frágil ante idioma/versión | Considerar `LegalityCheckResultCode` (spike futuro) |
| `VitaminClamp` casero | Divergencia con PKHeX | Spike comparativo antes de consolidar |
| Cifras CONFLICTING (Masuda Gen IV) | Probabilidad inventada | No fijar hasta resolver la fuente |
| Lista de inciensos incompleta | Bebé equivocado | No implementar sin cotejo objeto por objeto |

---

## 12. Qué NO se ha hecho

- No se implementó ningún motor genético, eclosión ni exportación.
- No se modificó `breeding-engine.ts`, `egg-domain.ts`, `egg-pair-domain.ts`, los
  stores ni el sidecar.
- No se tocaron frontend, `data/pokegotchi.db`, saves, PKM ni exportaciones.
- No se añadieron dependencias ni se inició ningún servidor.
- No se integró nada en `scripts/check.sh`.
- No se hicieron commits ni pushes.
- No se reabrieron las decisiones cerradas de PG-08F.
- No se generó ni exportó ningún PKM.

---

## 13. Propuesta para PG-08G.2 (NO autorizada)

Detalle en `PROPUESTA-PG08G2.md`.

Objetivo propuesto: implementar en un módulo nuevo y aislado
(`packages/core/src/egg-genetics.ts`) los resolvedores A–L, sin PKM y sin tocar
saves/BD/frontend/sidecar.

Prerrequisitos:

1. Aprobar la matriz y resolver `UNKNOWN`/`CONFLICTING`.
2. Confirmar alcance inicial (se recomienda empezar por **Gen II**).
3. Decidir la fuente de semilla (inyectada por prueba vs autoridad futura).
4. No reabrir 1+1, DEMO ni propiedad.

Criterios de aceptación propuestos: dos huevos reproducibles y distintos;
reintentos sin cambios; DEMO y procedencia desconocida rechazados antes de
calcular; reglas sin evidencia devuelven `UNKNOWN`; `bun run check` en EXIT 0;
hashes protegidos intactos; sin commits ni pushes.

---

## 14. Entregables

En `docs/informes/fases/PG-08/PG-08G1/`:

1. `SYNCGATE.md`
2. `MATRIZ-GENERACIONES.md`
3. `GEN-II.md`
4. `GEN-III.md`
5. `GEN-IV.md`
6. `GEN-V.md`
7. `PKHEX-AUDIT.md`
8. `ARQUITECTURA-GENETICA.md`
9. `RNG-Y-DETERMINISMO.md`
10. `LEGALIDAD-Y-PROCEDENCIA.md`
11. `DECISIONES-PENDIENTES.md`
12. `PRUEBAS-EXPLORATORIAS.md`
13. `PROPUESTA-PG08G2.md`

Además: `experimentos/rng-spike.ts` (spike aislado), este informe y su copia en
`/home/missingn0/Descargas/PG-08G1-INFORME.md`.

---

## 15. Veredicto

**PG-08G.1 completada como investigación y especificación.** El motor genético
**no está implementado** y no puede afirmarse lo contrario. La matriz por
generación, la auditoría de PKHeX.Core, los contratos propuestos y los riesgos
quedan documentados con evidencia y niveles de confianza explícitos. PG-08G.2
queda preparada para autorización, sin haberse iniciado.
