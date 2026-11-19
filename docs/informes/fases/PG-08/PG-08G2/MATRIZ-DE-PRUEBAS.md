# PG-08G.2 — Matriz de pruebas para la futura implementación

**Estado:** diseño de pruebas. No se ha creado ninguna suite de producción. El
único código ejecutado en PG-08G.2 es el spike `experimentos/rng-v2-spike.ts`
(12/12, EXIT 0), aislado y fuera de `scripts/check.sh`.

## 0. Reglas de la futura suite

1. **Aislamiento**: cada caso usa un directorio temporal propio
   (`/tmp/opencode/pg08g3-<suite>-<caso>`), nunca `data/`.
2. **Reloj inyectado**: `BreedingClock` con valor fijo; prohibido `Date.now()`.
3. **Azar inyectado**: `RandomnessPort` con semilla literal de prueba; prohibido
   `Math.random()`.
4. **Sin PKM**: ningún caso escribe `.pkm`, `.pk1`…`.pk5`, `.srm`, `.sav` ni
   `.dsv`. La capa L4 se prueba con dobles, no con archivos.
5. **Sin `data/pokegotchi.db`**: los stores ya rechazan esa ruta
   (`STORE_ISOLATION_VIOLATION`); la suite lo verifica explícitamente.
6. **Integración en `check.sh`**: solo con autorización expresa en PG-08G.3.
7. **Cada caso declara el `GameKey`** que ejercita; un caso sin `GameKey` es un
   caso inválido.

## 1. Familias de prueba

| Familia | Objeto | Contratos de referencia |
|---|---|---|
| T-COMP | Compatibilidad reproductiva | `CONTRATOS-GENERACIONALES.md` §compatibilidad |
| T-DV | Herencia de DVs (Gen II) | `GEN-II.md`, `StatResolver` |
| T-IV | Herencia de IVs (Gen III–V) | `GEN-III/IV/V.md`, `InheritanceRules.mode` |
| T-NAT | Naturaleza y Everstone | `NatureRules` |
| T-ABIL | Habilidades normales y ocultas | `AbilityRules` |
| T-SHINY | Shiny por DV y por PID | `ShinyRules` |
| T-MOVE | Movimientos huevo, TM/HM, Volt Tackle | `MoveRules` |
| T-ITEM | Objetos reproductivos | `ItemRules` |
| T-SPEC | Especie, sexo, formas, inciensos | `SpeciesRules` |
| T-CAP | Capacidad y cola | `CAPACIDAD-Y-ATOMICIDAD.md` |
| T-OFF | Progreso offline | `PROGRESO-OFFLINE.md` |
| T-ATOM | Atomicidad e idempotencia | `CAPACIDAD-Y-ATOMICIDAD.md` §atomicidad |
| T-DET | Determinismo y RNG | `RNG-DETERMINISTA.md` |
| T-LEG | Legalidad en cuatro capas | `LEGALIDAD-Y-PKHEX.md` |
| T-EXP | Exportabilidad (negativa) | `LEGALIDAD-Y-PKHEX.md` §L4 |

## 2. T-COMP — Compatibilidad reproductiva

| ID | Escenario | Esperado |
|---|---|---|
| COMP-01 | Mismo Egg Group, sexos opuestos, `gen2-gs` | `compatible`, `effectiveMother` = hembra |
| COMP-02 | Sin Egg Group común | `EGG_GROUP_MISMATCH` |
| COMP-03 | Dos machos o dos hembras | `SAME_GENDER` |
| COMP-04 | Genderless + no-Ditto | `GENDERLESS_WITHOUT_DITTO` |
| COMP-05 | Genderless + Ditto | `compatible`, `effectiveMother` = Ditto |
| COMP-06 | Ditto + Ditto | `DITTO_WITH_DITTO` |
| COMP-07 | No Eggs Discovered + cualquier pareja | `NO_EGGS_DISCOVERED` |
| COMP-08 | `gen1-rb` / `gen1-y` con cualquier pareja | `NO_BREEDING_IN_GENERATION` |
| COMP-09 | `GameKey` sin reglas verificadas | `UNKNOWN_RULES`, sin cálculo |
| COMP-10 | Gen II: Defense DV iguales y Special iguales | `KINSHIP_DV_MATCH` |
| COMP-11 | Gen II: Defense iguales y Special ±8 | `KINSHIP_DV_MATCH` |
| COMP-12 | Gen III: mismos DVs que COMP-10 | `compatible` (regla no existe) |
| COMP-13 | Padres DEMO | `DEMO_PROVENANCE_BLOCKED` antes de cualquier cálculo |
| COMP-14 | Procedencia desconocida | `UNKNOWN_PROVENANCE_BLOCKED` |
| COMP-15 | Padres modificados desde el inicio del ciclo | `PARENTS_CHANGED` |

## 3. T-DV — Herencia de DVs (solo Gen II)

| ID | Escenario | Esperado |
|---|---|---|
| DV-01 | Defense del progenitor de sexo opuesto | copiado exacto |
| DV-02 | Special igual al progenitor | 50 % de los casos con semilla fija |
| DV-03 | Special distinto en 8 | el otro 50 % |
| DV-04 | Attack y Speed | dentro de 0–15, no copiados |
| DV-05 | HP | derivado de los otros cuatro (bits bajos) |
| DV-06 | Ditto como pareja | herencia desde Ditto |
| DV-07 | Intento de fijar DV desde la interfaz | `DV_EDIT_FORBIDDEN` |
| DV-08 | Pokémon de Gen III con DVs | `DV_MODEL_MISMATCH` |
| DV-09 | 1000 iteraciones con semilla fija | distribución dentro de rango, sin excepciones |
| DV-10 | Dos huevos del mismo ciclo | DVs distintos, ambos válidos |

## 4. T-IV — Herencia de IVs (Gen III–V)

| ID | Escenario | Esperado |
|---|---|---|
| IV-01 | `gen3-rs` | exactamente 3 IVs heredados, 3 aleatorios |
| IV-02 | `gen3-frlg` | igual que IV-01 |
| IV-03 | `gen3-emerald` | modo overrides: 3–5 stats aleatorios |
| IV-04 | `gen4-dp` / `gen4-platinum` | overrides como Emerald |
| IV-05 | `gen4-hgss` | 3 IVs de stats distintas, cada uno de un padre |
| IV-06 | `gen5-bw` / `gen5-b2w2` | igual que HGSS |
| IV-07 | Power Item en `gen3-*` | `POWER_ITEM_NOT_IN_VERSION` |
| IV-08 | Power Item en `gen4-dp` | `POWER_ITEM_NOT_IN_VERSION` |
| IV-09 | Power Item en `gen4-hgss` | IV del stat forzado |
| IV-10 | Dos Power Items en HGSS | uno elegido al azar, el otro stat aleatorio |
| IV-11 | IVs fuera de 0–31 | `IV_OUT_OF_RANGE` |
| IV-12 | Gen II con IVs | `DV_MODEL_MISMATCH` |
| IV-13 | Repetición con la misma semilla | IVs idénticos |

## 5. T-NAT — Naturaleza

| ID | Escenario | Esperado |
|---|---|---|
| NAT-01 | Gen II | `NATURE_NOT_IN_GENERATION` |
| NAT-02 | `gen3-rs` sin Everstone | aleatoria |
| NAT-03 | `gen3-emerald`, madre con Everstone | 50 % de heredar (verificado con semilla) |
| NAT-04 | `gen3-emerald`, padre con Everstone | aleatoria (solo madre/Ditto) |
| NAT-05 | `gen4-dp`, padres de distinto idioma | `EVERSTONE_LANGUAGE_MISMATCH`, aleatoria |
| NAT-06 | `gen4-hgss`, cualquier portador | 50 % |
| NAT-07 | `gen5-bw` | 50 %, funciona entre idiomas |
| NAT-08 | `gen5-b2w2` | 100 % del portador |
| NAT-09 | `gen5-b2w2`, ambos con Everstone | uno elegido al azar |
| NAT-10 | Naturaleza fuera de las 25 | `NATURE_INVALID` |

## 6. T-ABIL — Habilidades

| ID | Escenario | Esperado |
|---|---|---|
| ABIL-01 | `gen3-*` | `ABILITY_INHERITANCE_NOT_IN_GENERATION`; habilidad al azar entre las posibles |
| ABIL-02 | `gen4-*` | igual que ABIL-01 |
| ABIL-03 | `gen5-bw`, hembra con oculta + macho | 60 % oculta (semilla fija) |
| ABIL-04 | `gen5-bw`, hembra con normal + macho | nunca hereda el slot |
| ABIL-05 | `gen5-bw`, hembra con oculta + Ditto | `HIDDEN_ABILITY_WITH_DITTO`, no hereda |
| ABIL-06 | `gen5-b2w2`, hembra normal + macho | 80 % |
| ABIL-07 | `gen5-b2w2`, hembra oculta + macho | 80 % |
| ABIL-08 | Macho con cualquier habilidad | `ABILITY_INHERITANCE_MALE` |
| ABIL-09 | Genderless con habilidad | no transmite |
| ABIL-10 | Habilidad inexistente para la especie | `ABILITY_NOT_IN_SPECIES` |

## 7. T-SHINY — Shiny

| ID | Escenario | Esperado |
|---|---|---|
| SHINY-01 | Gen II, DVs que cumplen patrón | shiny por DVs |
| SHINY-02 | Gen II, patrón incompleto | no shiny |
| SHINY-03 | Gen II, un progenitor shiny de sexo opuesto | tasa elevada según regla, no inventada |
| SHINY-04 | Gen II, dos progenitores shiny | incompatibles por `KINSHIP_DV_MATCH` |
| SHINY-05 | Gen III+, shiny por PID | `SHINY_NOT_PID_BASED` si se intenta por DVs |
| SHINY-06 | Gen IV, Masuda solicitado | `MASUDA_RATE_CONFLICTING` |
| SHINY-07 | Gen V, Masuda | 6 rolls, cifra documentada |
| SHINY-08 | `gen5-bw` con Shiny Charm | `SHINY_CHARM_NOT_IN_VERSION` |
| SHINY-09 | `gen5-b2w2` con Shiny Charm | 3 rolls; combinado 8 rolls |
| SHINY-10 | Cualquier caso sin regla verificada | `UNKNOWN_RULES`, nunca una probabilidad inventada |

## 8. T-MOVE — Movimientos huevo

| ID | Escenario | Esperado |
|---|---|---|
| MOVE-01 | Gen II, nivel por defecto ≤5 | movimientos de nivel ≤5 |
| MOVE-02 | Gen IV/V, nivel por defecto 1 | movimientos de nivel 1 |
| MOVE-03 | Padre con TM que el bebé aprende | heredado |
| MOVE-04 | Madre con TM | no heredado (solo padre) |
| MOVE-05 | Egg move del padre | heredado |
| MOVE-06 | Gen II Crystal, movimiento de tutor del padre | heredado |
| MOVE-07 | Gen III, movimiento de tutor | no heredado |
| MOVE-08 | Más de 4 movimientos candidatos | prioridad aplicada; en Gen II `priorityVerified:false` → `MOVE_PRIORITY_UNVERIFIED` |
| MOVE-09 | Volt Tackle en `gen3-rs`/`gen3-frlg` | `VOLT_TACKLE_NOT_AVAILABLE` |
| MOVE-10 | Volt Tackle en `gen3-emerald` con Light Ball | permitido |
| MOVE-11 | Volt Tackle en Gen IV/V con Light Ball | permitido |
| MOVE-12 | Movimiento no aprendible por ninguna vía | descartado, no error fatal |

## 9. T-ITEM — Objetos reproductivos

| ID | Escenario | Esperado |
|---|---|---|
| ITEM-01 | Destiny Knot en Gen IV o V | `DESTINY_KNOT_NOT_IN_GENERATION` (sin efecto de crianza) |
| ITEM-02 | Everstone en Gen II | sin efecto sobre naturaleza; no es error |
| ITEM-03 | Power Item en `gen5-*` | fuerza IV del stat |
| ITEM-04 | Objeto no equipable / clave | `ITEM_NOT_ALLOWED` |
| ITEM-05 | Dos objetos de herencia contradictorios | regla de desempate documentada o `UNKNOWN_RULES` |

## 10. T-SPEC — Especie, sexo, formas

| ID | Escenario | Esperado |
|---|---|---|
| SPEC-01 | Madre + padre de la misma cadena | primer estado de la cadena de la madre |
| SPEC-02 | Ditto + especie | especie del no-Ditto |
| SPEC-03 | Nidoran♀ | 50/50 Nidoran♀/♂ |
| SPEC-04 | Volbeat/Illumise en `gen3-*`+ | 50/50 |
| SPEC-05 | Volbeat/Illumise en Gen II | no aplica (especies no existen) |
| SPEC-06 | Manaphy + Ditto | Phione |
| SPEC-07 | Bebé por incienso sin el incienso | especie base |
| SPEC-08 | Bebé por incienso con incienso | bebé; si la lista no está verificada → `INCENSE_LIST_UNVERIFIED` |
| SPEC-09 | Nivel de eclosión Gen II/III | 5 |
| SPEC-10 | Nivel de eclosión Gen IV/V | 1 |
| SPEC-11 | Sexo Gen II | derivado del Attack DV |
| SPEC-12 | Sexo Gen III+ | derivado del PID, no heredado |

## 11. T-CAP — Capacidad y cola

| ID | Escenario | Esperado |
|---|---|---|
| CAP-01 | Ocupación por debajo de C2 | produce |
| CAP-02 | Ocupación = C2, política `single` | `CAPACITY_EXHAUSTED`, idempotencia **no** consumida |
| CAP-03 | Ocupación = C2, política `bounded` | entrada en cola, evento `egg.queued` |
| CAP-04 | `setCapacity` por debajo de la ocupación | `CAPACITY_BELOW_USAGE`, nada destruido |
| CAP-05 | `setCapacity(0)` o negativo | `CAPACITY_INVALID` |
| CAP-06 | `single` con cola > 0 | `SINGLE_BACKLOG_FORBIDDEN` |
| CAP-07 | Reclamar un huevo | libera capacidad, `drainBacklog` puede producir |
| CAP-08 | Cancelar un huevo | libera capacidad |
| CAP-09 | Capacidad por propietario (anfitrión lleno, invitado libre) | el huevo del invitado se produce o se encola según regla |
| CAP-10 | Reducir C3 por debajo de la cola | `BACKLOG_CAPACITY_BELOW_USAGE` |
| CAP-11 | `drainBacklog` con permisos revocados | no produce, `attempts++` |

## 12. T-OFF — Progreso offline

| ID | Escenario | Esperado |
|---|---|---|
| OFF-01 | `single`, intervalo no cumplido | 0 ciclos |
| OFF-02 | `single`, intervalo cumplido | 1 ciclo |
| OFF-03 | `single`, 10 intervalos de ausencia | 1 ciclo (sin acumulación) |
| OFF-04 | `bounded`, 5 intervalos, `maxEvents` sin fijar | `UNRESOLVED_POLICY`, sin generar |
| OFF-05 | `bounded`, 5 intervalos, `maxEvents=3` | 3 ciclos, en orden de `cycleNumber` |
| OFF-06 | `bounded`, ventana excedida | `WINDOW_EXCEEDED`, 0 ciclos |
| OFF-07 | Reloj retrocede | `CLOCK_ROLLBACK`, 0 ciclos, marca intacta |
| OFF-08 | Puesta al día repetida | mismos `cycleId`, `created:false`, sin duplicados |
| OFF-09 | Padres retirados durante la ausencia | ciclo no produce |
| OFF-10 | Padres modificados | `PARENTS_CHANGED` / nueva `pairRevision` |
| OFF-11 | Dos ciclos del mismo par | ids distintos |
| OFF-12 | Servicio reiniciado a mitad de puesta al día | reanuda desde la marca persistida |
| OFF-13 | Cola pendiente + ciclos nuevos | se drena la cola antes de producir |

## 13. T-ATOM — Atomicidad e idempotencia

| ID | Escenario | Esperado |
|---|---|---|
| ATOM-01 | Fallo dentro de `produceTx` | ni ciclo ni huevos persisten |
| ATOM-02 | Repetir `produce` con la misma clave | `created:false`, un solo huevo |
| ATOM-03 | Misma clave con contenido distinto | `IDEMPOTENCY_REUSE_MISMATCH` |
| ATOM-04 | `prepareDelivery` repetido | misma entrega, sin duplicar |
| ATOM-05 | `confirmDelivery` repetido | `DELIVERY_ALREADY_CONFIRMED`, sin duplicar |
| ATOM-06 | Caída entre prepare y confirm, luego `retry` | entrega completada una sola vez |
| ATOM-07 | `replay` de eventos ya aplicados | estado idéntico, sin duplicados |
| ATOM-08 | Intento de abrir `data/pokegotchi.db` | `STORE_ISOLATION_VIOLATION` |
| ATOM-09 | Dos huevos del mismo ciclo | propietarios distintos, ambos presentes |
| ATOM-10 | Rechazo del destinatario | `recipient_rejected`, huevo no perdido |

## 14. T-DET — Determinismo y RNG

| ID | Escenario | Esperado |
|---|---|---|
| DET-01 | Mismo contexto → misma secuencia | idéntica |
| DET-02 | `recipientRole` distinto | secuencia distinta |
| DET-03 | `purpose` distinto | secuencia distinta |
| DET-04 | `rulesetVersion` / `algorithmId` distintos | secuencia distinta |
| DET-05 | Reanudación por cursor | continúa sin repetir |
| DET-06 | `seedRef` no coincide | `SEED_MISMATCH` |
| DET-07 | `int(n)` fuera de rango | nunca ocurre; rechazo de módulo |
| DET-08 | Escaneo de fuentes | sin `Math.random` ni `Date.now` |
| DET-09 | Genética recalculada tras reabrir | idéntica a la persistida |
| DET-10 | Semilla maestra en logs/BD | prohibida; solo `seedRef` |

## 15. T-LEG — Legalidad en cuatro capas

| ID | Escenario | Esperado |
|---|---|---|
| LEG-01 | Regla interna incumplida | L1 `illegal`, no llega a L3 |
| LEG-02 | Regla generacional desconocida | L2 `UNKNOWN_RULES` |
| LEG-03 | `ResolvedGenetics` enviado a validación PKHeX | `INVALID_CANDIDATE_NOT_PKM` |
| LEG-04 | PKM real con incidencia cosmética | L3 `unverified` |
| LEG-05 | PKM real con incidencia estructural | L3 `illegal` |
| LEG-06 | L3 `unverified` | no habilita L4 |
| LEG-07 | L3 `legal` sin cadena oficial | L4 bloqueado `NO_OFFICIAL_CHAIN` |
| LEG-08 | Procedencia DEMO | L4 `DEMO_PROVENANCE` |
| LEG-09 | Procedencia desconocida | L4 `UNKNOWN_PROVENANCE` |
| LEG-10 | Cualquier caso | las cuatro capas se informan por separado |

## 16. T-EXP — Exportabilidad (siempre negativa en esta fase)

| ID | Escenario | Esperado |
|---|---|---|
| EXP-01 | Huevo simulado intenta exportarse | `exportable:false`, `NO_REAL_PKM` |
| EXP-02 | Genética resuelta sin PKM | `exportable:false`, `NOT_VALIDATED` |
| EXP-03 | Pokémon de Gen I/II hacia NDS | bloqueado, sin cadena oficial |
| EXP-04 | Escritura de `.srm` en la suite | prohibida por diseño |
| EXP-05 | Cualquier resultado | `realPkm:false` y `exportable:false` literales |

## 17. Cobertura mínima por `GameKey`

| GameKey | Familias obligatorias |
|---|---|
| `gen1-rb`, `gen1-y` | T-COMP (COMP-08), T-DV (DV-07/08), T-LEG |
| `gen2-gs`, `gen2-crystal` | T-COMP, T-DV, T-SHINY (01–04), T-MOVE (01,06), T-SPEC (09,11) |
| `gen3-rs`, `gen3-frlg` | T-IV (01,02,07), T-NAT (02), T-ABIL (01), T-MOVE (09) |
| `gen3-emerald` | T-IV (03), T-NAT (03,04), T-MOVE (10) |
| `gen4-dp`, `gen4-platinum` | T-IV (04,08), T-NAT (05) |
| `gen4-hgss` | T-IV (05,09,10), T-NAT (06) |
| `gen5-bw` | T-ABIL (03,04,05), T-NAT (07), T-SHINY (08) |
| `gen5-b2w2` | T-ABIL (06,07), T-NAT (08,09), T-SHINY (09) |

## 18. Criterios de aceptación para PG-08G.3

1. Todos los casos de las familias T-COMP…T-DET en verde.
2. T-LEG y T-EXP en verde **sin** generar ningún archivo PKM ni save.
3. Cero ocurrencias de `Math.random`/`Date.now` en los módulos genéticos.
4. Repetición completa de la suite con la misma semilla → resultado idéntico.
5. `bun run check` sin regresiones (473/473 de PG-08A–F y 101/101 de PG-07H).
6. 17 hashes protegidos intactos y `data/pokegotchi.db` sin cambios.
7. Ningún caso escribe en `data/`.

## 19. Lo que esta matriz NO prueba

- No prueba equivalencia con el RNG de los cartuchos originales.
- No prueba que un huevo simulado sea legal para PKHeX: eso exige PKM real.
- No prueba estabilidad de PKHeX.Core más allá de 26.10.18.
- No prueba concurrencia multi-proceso ni multi-nodo.
- No cubre cifrado, autenticación ni red (fuera de alcance).
