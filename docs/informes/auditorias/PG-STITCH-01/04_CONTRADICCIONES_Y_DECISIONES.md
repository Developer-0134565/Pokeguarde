# 04 — Contradicciones y decisiones

**Misión:** PG-STITCH-01 · **Fase:** D · **Fecha:** 2026-11-19
**Fuentes comparadas:** exportación Stitch (Markdown y mockups), `AGENTS.md`, `README.md` y los RFC/roadmap del repositorio.

> Regla aplicada: **Stitch no es autoridad de mecánicas ni de datos** (`AGENTS.md:472-483,512-516`; `docs/STITCH_IMPLEMENTATION_PLAN.md:26,38-40`). Los mockups son ilustrativos y sus valores de ejemplo no son reglas del juego.

---

## 1. Contradicciones identificadas

| # | Contradicción | Evidencia Stitch | Evidencia del proyecto | Resolución propuesta |
|---|---|---|---|---|
| C1 | 12 pantallas declaradas vs 0 entregadas | Tabla de 12 SCREEN en el Markdown, líneas 19-34 | Los ZIP solo contienen 3 diseños base + 5 variantes, sin IDs | Pedir exportación real de las 12 pantallas; mientras tanto, no planificar pantallas no vistas como si existieran |
| C2 | Tres ocupantes en mockups vs capacidad 2 | z1/z8 (Chikorita, Cyndaquil, Totodile); z2 «3/6»; z12 «2/2» | `SHARED_NURSERIES_SPEC.md:10-12`, `ROADMAP.md:36-39`, `AGENTS.md:493-500`: **DECIDIDO 2** | Aplicar 2; los mockups de 3 son iteraciones descartadas |
| C3 | Gen II con 510 EV, 252/stat, naturaleza e IV | z10/z7, z11/z6 | `AGENTS.md:41-63,257-272,323-332`: Stat Exp hasta 65.535 **por stat**, Especial compartido; `STITCH_IMPLEMENTATION_PLAN.md:26` lo advierte | No adaptar el motor; corregir los mockups. Usar `capsFor()` |
| C4 | «Cero Microtransacciones» definitivo vs modelos futuros propuestos | Stitch §70-71 y :81-84 | `MONETIZATION_DESIGN_RFC.md:21-29,33-45`: GP no comprables inicialmente, pero Plus/cosméticos/premium/donaciones quedan como propuestas sujetas a evaluación legal; `ROADMAP.md:62-67` | Mantener GP gratuitos y no transferibles; **no** convertir el texto de Stitch en prohibición definitiva |
| C5 | «Cuarentena de Anomalías… bloqueados para Guardería o intercambio» vs veredicto `unverified` no bloqueante | Stitch §74-77 | `AGENTS.md:232-253,273-276`: `illegal` se rechaza; `unverified` se admite en Guardería | No aprobar cuarentena social sin decisión explícita; conservar el triple veredicto |
| C6 | Fondo Stitch 1200×896 presentado como 160×144 canónico | `LEEME_STITCH.md` §8; `03_RECURSOS_GRAFICOS/guarderia.png` = 1200×896, hash `55b20c80…` | `apps/web/assets/room/guarderia.png` = 160×144 RGBA, hash `bcedbd66…` | Conservar el canónico; el asset de Stitch es referencia, no reemplazo |
| C7 | Exportación y checksums simulados vs protocolo real | z10 «¡Descargado pokemon_crystal.sav!»; z6 «CARTUCHO .SAV EXPORTADO CON ÉXITO»; checksum `0x9F4C` decorativo | Protocolo de escritura de `AGENTS.md`: clon, dry-run, archivo nuevo, hashes, revalidación; `Program.cs:258-286,389-463` | Los botones de los mockups son decorativos; reutilizar `exportBlock`/`exportWrite`, nunca simular |
| C8 | «EXP x1.5», inyección SRAM y «Puntos de Cuidado PC» sin respaldo | z2, z8 | No aparecen en `AGENTS.md`, RFC ni roadmap | No implementar; documentar como propuesta visual sin autorización |
| C9 | Cacas visibles sin reglas | z3/z4 «¡POPÓ!» | No hay frecuencia, penalización, persistencia ni reglas de limpieza aprobadas (`STITCH_IMPLEMENTATION_PLAN.md:35,40`, `PG-06_SPRITE_AUDIT_TASK.md:26`) | Mantener fuera del motor; requiere spike y aprobación |
| C10 | Dependencias externas vs app local | Tailwind CDN, Google Fonts, imágenes Google, fuentes GitHub/jsdelivr | `AGENTS.md`: backend local, sin WASM, sin servicios en la nube, sin instalar dependencias sin permiso | No incorporar; reimplementar estilos con CSS propio y fuentes locales |
| C11 | Suma de Stat Exp «hasta 65.535 (5 valores)» vs tope por stat | Stitch §13, :74-77 | `AGENTS.md:55-59,270-272,327-330`: 65.535 **por stat**, sin tope global en Gen I/II | Aclarar redacción; el motor ya es correcto |
| C12 | UTC obligatoria como requisito cerrado vs reglas de reloj pendientes | Stitch §66-67, :81-84 | `BREEDING_DESIGN_RFC.md:48-58,62-73`; `ROADMAP.md:52-53`: antifraude PROPOSED, comportamiento offline pendiente | No fijar verificación UTC hasta aprobar el modelo offline |
| C13 | Manaphy + Ditto → Phione presentado como decidido | Stitch §15, :62-65, :81-84 | `BREEDING_DESIGN_RFC.md:14-20` solo «contempla excepciones como Manaphy y Ditto» | Regla Phione = PROPUESTA; requiere aprobación y validación PKHeX |
| C14 | Eclosión en 4 etapas y «2 huevos» como regla | Stitch §28-29, :27 | `BREEDING_DESIGN_RFC.md:18-20,24-28,77-81`: 1 huevo aleatorio por participante; eclosión no fijada | No adoptar 4 etapas; 1 huevo por participante con propietario único pendiente |
| C15 | Capacidad 2 interpretada como dos activas en local | Stitch §13, :23 | `AGENTS.md:273-282`, `README.md:136-140`: varias mascotas, **una activa** | Dos plazas son para guarderías compartidas (PG-08), no para el modo local actual |
| C16 | PG-06 marcado `PLANNED` vs completado en roadmap | — | `PG-06_SPRITE_AUDIT_TASK.md:1-3,16-22` vs `ROADMAP.md:19-25` e `PG07A_INTEGRATION_REPORT.md:3-7,118-125` | Actualizar el encabezado de la tarea en su momento; no afecta a esta auditoría |
| C17 | Tiers 16/24/40/64 presentados como regla cerrada | Stitch :40-49 | `PG-06_SPRITE_AUDIT_TASK.md:11` los deja sin aprobar; PG07A tiene overrides 95/321→40 y licencia sin resolver | No congelar la política de escalas; revisar licencia y `form` antes |

---

## 2. Decisiones documentadas vigentes (no negociables en esta misión)

Fuente principal: informe de Luna, con citas verificadas.

| Tema | Decisión | Citas |
|---|---|---|
| Capacidad | Máximo 2 Pokémon por Guardería compartida | `SHARED_NURSERIES_SPEC.md:10-12`; `ROADMAP.md:36-39`; `AGENTS.md:493-500` |
| Dimensiones | Admisión, visibilidad, conectividad y ocupación son independientes; cerrar no expulsa | `SHARED_NURSERIES_SPEC.md:14-23` |
| Propiedad | El anfitrión cuida; el dueño conserva titularidad y recuperación | `AGENTS.md:493-500`; `SHARED_NURSERIES_SPEC.md:66-78` |
| Modo local | Sin cuentas, pagos ni conexión permanente | `AGENTS.md:493-500`; `SHARED_NURSERIES_SPEC.md:66-78` |
| Permisos | Tres flags (bayas EV, minijuegos EV, solicitudes de crianza), desactivados por defecto, verificados en servidor; breeding no implica consentimiento automático | `SHARED_NURSERIES_SPEC.md:82-95`; `ROADMAP.md:38-39` |
| Flujo | 7 estados; solicitud pendiente no transfiere ni reserva | `SHARED_NURSERIES_SPEC.md:45-61`; `ROADMAP.md:36-38` |
| Atomicidad | Reserva al aceptar; un Pokémon no puede estar en dos guarderías; recuperación sin anfitrión | `SHARED_NURSERIES_SPEC.md:57-62` |
| Regla del proyecto | Operaciones transaccionales e idempotentes y trazabilidad | `AGENTS.md:502-510` |
| Crianza | Requiere autorización del dueño; un huevo aleatorio por participante | `BREEDING_DESIGN_RFC.md:12-18,18-28`; `ROADMAP.md:48-50` |
| Incubación | 15 min–3 h; depende de rareza y suma de IV; **fórmula pendiente** | `BREEDING_DESIGN_RFC.md:28-38`; `ROADMAP.md:51` |
| GP | Gratuitos, obtenidos jugando, no comprables ni transferibles inicialmente; nombre provisional | `MONETIZATION_DESIGN_RFC.md:21-29` |
| Monetización | Nada implementado ni autorizado; modelos propuestos requieren evaluación legal | `MONETIZATION_DESIGN_RFC.md:33-45`; `ROADMAP.md:62-67` |
| Legalidad | IV/DV nunca se editan; Gen I/II Stat Exp 65.535 por stat con Especial compartido; PKHeX.Core es autoridad | `AGENTS.md:41-63,257-272,323-332` |
| Veredictos | `illegal` se rechaza; `unverified` se admite | `AGENTS.md:232-253,273-276` |
| Stitch | Las maquetas no son autoridad de reglas ni datos | `AGENTS.md:472-483,512-516`; `STITCH_IMPLEMENTATION_PLAN.md:26,38-40` |
| PG-07A | Implementado y verificado; solo visual; sin motor, saves ni PKHeX | `PG07A_INTEGRATION_REPORT.md:1-7,118-152`; `ROADMAP.md:23-25` |

---

## 3. Propuestas (NO decisiones)

| Tema | Estado | Citas |
|---|---|---|
| UUID por Pokémon, `user_id`, permisos por estancia | PROPUESTA (RFC de seguridad sin implementar) | `POKEMON_SECURITY_RFC.md:1-6,34-47` |
| Rollback e idempotencia concretos | PROPUESTA técnica; exigida como regla en `AGENTS.md` | `POKEMON_SECURITY_RFC.md:51-57,72-88` |
| Pestaña social: directorio, búsqueda, amigos, bloqueos, denuncias | PROPUESTA pendiente | `SHARED_NURSERIES_SPEC.md:27-41` |
| Manaphy + Ditto → Phione | PROPUESTA de Stitch; el RFC solo contempla excepciones | `BREEDING_DESIGN_RFC.md:14-20`; Stitch :62-65 |
| Antifraude en línea (generación verificable por servidor) | PROPUESTA | `BREEDING_DESIGN_RFC.md:62-73`; `ROADMAP.md:52-54` |
| Cosméticos, Plus, premium, publicidad, afiliados, donaciones, pases | PROPUESTOS, no autorizados | `MONETIZATION_DESIGN_RFC.md:33-45`; `ROADMAP.md:62-67` |
| Cuarentena/bloqueo social | PROPUESTA no aprobada | Stitch :74-77 |
| Reglas de render de Stitch (carcasa, fuentes, composición) | PROPUESTAS; spike pendiente | `STITCH_IMPLEMENTATION_PLAN.md:1-3,28-40` |
| Eclosión en 4 etapas y dos huevos por entrega | Sin respaldo documental | Stitch :27-29 |

---

## 4. Incertidumbres

1. **Recuperación offline:** está decidido el resultado, pero no el protocolo operativo en local ni la sincronización de `error_recoverable` (`SHARED_NURSERIES_SPEC.md:59-62`; `POKEMON_SECURITY_RFC.md:72-88`).
2. **Costes GP:** no hay coste por minuto, límites, redondeo ni comportamiento offline (`BREEDING_DESIGN_RFC.md:42-58`).
3. **Efectos en saves originales:** `UNRESOLVED` (`BREEDING_DESIGN_RFC.md:77-81`; `ROADMAP.md:54`).
4. **Fuentes concretas de GP:** el RFC dice «jugando»; Stitch enumera minijuegos, cuidados y logros sin aprobación.
5. **Licencia de sprites y fuentes de terceros:** sin resolver; uso local/no distribuible (`PG07A_INTEGRATION_REPORT.md:101-116,164-168`).
6. **`form` y sprite de sueño:** la API no expone forma; la pose de sueño es procedural (`PG07A_INTEGRATION_REPORT.md:59-66,84-95,164-170`).
7. **Alcance de bloqueos sociales** para cada veredicto de legalidad (`AGENTS.md:41-51,78-90`; `ROADMAP.md:48-54`).
8. **Existencia real de las 12 pantallas** en Google Stitch fuera de los ZIP exportados.

---

## 5. Bloqueos

- **BLOQUEO A:** no se puede contrastar el diseño visual de 9 de las 12 pantallas porque no hay archivos. Solo se dispone de descripción textual.
- **BLOQUEO B:** no se puede evaluar licencia de fuentes/imágenes de terceros sin contacto externo (prohibido).
- **BLOQUEO C:** no se puede verificar el comportamiento en ejecución de la app sin iniciar servicios (prohibido), por lo que la auditoría es estática; las pruebas dinámicas quedan documentadas en `07_PRUEBAS_Y_RIESGOS.md`.
