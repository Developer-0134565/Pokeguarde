# Roadmap Pokeguarde

**Estado:** documento vivo. Cada ítem está etiquetado como **DECIDED**, **PROPOSED**, **UNRESOLVED** o **DEFERRED**.
**Base:** fases 0-5 ✅ (ver `AGENTS.md`, «Fases»).

---

## Leyenda

| Etiqueta | Significado |
|---|---|
| **DECIDED** | Aprobado y listo para implementar (o ya implementado). |
| **PROPOSED** | Propuesto en documentación, sin aprobación final de implementación. |
| **UNRESOLVED** | Pendiente de decisión o investigación. |
| **DEFERRED** | Aplazado intencionalmente para fases posteriores. |

---

## Fase 6: Integración de sprites y UI (en curso)

| ID | Ítem | Etiqueta | Detalle |
|---|---|---|---|
| PG-06 | Auditoría de sprites overworld + spike de renderizado | **DECIDED** | `docs/PG-06_SPRITE_AUDIT_TASK.md`; `PG06_VIEWER_RESULTS.md`; auditoría READ-ONLY completada. |
| PG-07A | Integración de sprites overworld en la Guardería | **DECIDED** | `docs/PG07A_INTEGRATION_REPORT.md`; implementado en `apps/web/src/sprite-runtime.ts`, `apps/server/src/sprites.ts`. |
| PG-07B | Interfaz Tamagotchi basada en Stitch | **PROPOSED** | `docs/STITCH_IMPLEMENTATION_PLAN.md`; referencias en `docs/stitch/reference/`; no implementada. |
| PG-07C | Pantallas Ficha / Datos, Equipo Activo y navegación | **PROPOSED** | Separar de Guardería; reutilizar API y lógica existente. |

---

## Fase 7: Multijugador y Guarderías compartidas

| ID | Ítem | Etiqueta | Detalle |
|---|---|---|---|
| PG-08A | Usuarios y autenticación | **PROPOSED** | Cuentas, sesiones, tokens; modo local sin cuentas. |
| PG-08B | Directorio Jugadores (pestaña) | **PROPOSED** | Ver `docs/SHARED_NURSERIES_SPEC.md` § Pestaña Jugadores. |
| PG-08C | Modelo de Guardería (2 plazas, estados independientes) | **DECIDED** | Ver `docs/SHARED_NURSERIES_SPEC.md` § Modelo de Guardería. |
| PG-08D | Flujo de depósito (7 estados, reserva atómica) | **DECIDED** | Ver `docs/SHARED_NURSERIES_SPEC.md` § Flujo de depósito. |
| PG-08E | Cuidado delegado (anfitrión cuida ambos) | **DECIDED** | Ver `docs/SHARED_NURSERIES_SPEC.md` § Cuidado delegado. |
| PG-08F | Permisos especiales (bayas EV, minijuegos EV, breeding) | **DECIDED** | Ver `docs/SHARED_NURSERIES_SPEC.md` § Permisos especiales. |
| PG-08G | Seguridad y cifrado (plataforma) | **PROPOSED** | Ver `docs/POKEMON_SECURITY_RFC.md`. |

---

## Fase 8: Breeding y huevos

| ID | Ítem | Etiqueta | Detalle |
|---|---|---|---|
| PG-09A | Reglas de compatibilidad (grupos huevo, excepciones) | **PROPOSED** | Ver `docs/BREEDING_DESIGN_RFC.md`. |
| PG-09B | Autorización de participación de visitantes | **DECIDED** | Requiere permiso del propietario. |
| PG-09C | Generación de huevos (aleatoria, 1 por jugador) | **DECIDED** | Ver `docs/BREEDING_DESIGN_RFC.md`. |
| PG-09D | Cooldown 15 min – 3 h (rareza + suma IV) | **DECIDED** | Fórmula pendiente. |
| PG-09E | Aceleración con GP (coste pendiente) | **PROPOSED** | Ver `docs/BREEDING_DESIGN_RFC.md` § Aceleración. |
| PG-09F | Integridad servidor (antiduplicación, anti-manipulación) | **PROPOSED** | Ver `docs/BREEDING_DESIGN_RFC.md` § Integridad. |
| PG-09G | Efectos en partidas originales | **UNRESOLVED** | Requiere decisiones adicionales. |

---

## Fase 9: Economía y monetización

| ID | Ítem | Etiqueta | Detalle |
|---|---|---|---|
| PG-10A | Guardipuntos (GP) — ganancia por juego | **PROPOSED** | Ver `docs/MONETIZATION_DESIGN_RFC.md`. |
| PG-10B | Tienda de cosméticos y decoración | **PROPOSED** | Sin compra con dinero real en diseño inicial. |
| PG-10C | Suscripción Plus / Herramientas premium | **PROPOSED** | Requieren evaluación legal. |
| PG-10D | Publicidad, afiliados, donaciones, pases de temporada | **PROPOSED** | Requieren evaluación legal. |
| PG-10E | Protección de menores (6 puntos) | **PROPOSED** | Ver `docs/MONETIZATION_DESIGN_RFC.md`. |
| PG-10F | Revisión de derechos de propiedad intelectual | **UNRESOLVED** | Obligatorio antes de comercializar. |

---

## Dependencias cruzadas

- PG-07B/C → PG-08B (UI para pestaña Jugadores).
- PG-08A → PG-08B/G (usuarios requeridos para directorio y seguridad).
- PG-08C-F → PG-09A (breeding necesita Guardería con 2 plazas y permisos).
- PG-09D/E → PG-10A (aceleración consume GP).
- PG-08G (cifrado) → PG-09F (integridad breeding en online).

---

## Hitos existentes (no alterados)

| Fase | Estado |
|---|---|
| 0. Investigación + spike | ✅ |
| 1. Ingesta e inventario | ✅ |
| 2. Legalidad | ✅ |
| 3. Guardería | ✅ |
| 4. Adopción, entrenamiento y exportación | ✅ |
| 5. Pulido, i18n ES, arranque único | ✅ |

---

## Notas

- Los identificadores PG-08/PG-09 son propuestas; adaptar numeración si surge conflicto.
- `docs/stitch/reference/` se mantiene sin seguimiento (13 archivos, 2,5 MB) y no se incluye en checkpoints.
- `data/pokegotchi.db` y saves se conservan intencionalmente (ver AGENTS.md, «Excepción deliberada»).