# PG-08A — Propuesta concreta para PG-08B

**Estado:** PROPUESTA para aprobación humana. PG-08B **no ha comenzado** y PG-08A no autoriza su ejecución.

---

## 1. Objetivo propuesto

Convertir los contratos aislados de PG-08A en una **capa de dominio y persistencia compartida** que pueda ejecutarse en modo local sin cuentas y, más adelante, sobre un servicio autoritativo — sin modificar la aplicación actual ni los datos de producción.

Nombre sugerido: **PG-08B — Modelo de dominio persistente de guarderías compartidas**.

**Alcance explícitamente excluido de la propuesta:** endpoints públicos, autenticación real, registro de usuarios, directorio online, transferencias reales, crianza, huevos, Guardipuntos, tienda, cifrado y despliegue de servicio. Igual que en PG-08A, esas decisiones requieren aprobación (ver `11-DECISIONES-PENDIENTES.md`).

---

## 2. Entregables propuestos

| # | Entregable | Descripción |
|---|---|---|
| 1 | `packages/core/src/shared-nurseries.ts` promovido a paquete | Añadir `package.json` de paquete, exports tipados y `tsconfig` propio; **sin dependencias nuevas** |
| 2 | `apps/server/src/shared-store.ts` | Implementación de un `EventStore` en **base de datos nueva** (`data/shared-pg08b.db`), nunca en `data/pokegotchi.db`; WAL, FK, transacciones y snapshots |
| 3 | `scripts/pg08b-check.ts` | Pruebas de persistencia: replay tras reinicio, idempotencia cruzada, transacciones, capacidad 2, revocación y recuperación por vale |
| 4 | Integración en `scripts/check.sh` | Nueva sección aisladа antes de «Todo correcto.», con la BD de producción protegida por hash |
| 5 | Documentos PG-08B | Contrato de almacenamiento, migraciones, política de corruptión y límites de la capa |
| 6 | Informe final PG-08B | Con hashes, cobertura REAL vs SIMULADA y decisiones que siguen pendientes |

---

## 3. Arquitectura propuesta (sin despliegue)

```
   apps/web (sin cambios)
        │
        ▼  (más adelante, previa aprobación)
   API local 127.0.0.1
        │
        ▼
   ┌────────────────────────────────┐
   │ Dominio PG-08A (puro)          │  createNurserySystem(log)
   │ createNurserySystem / eventos  │  validadores, idempotencia
   └──────────────┬─────────────────┘
                  │ eventos + snapshot
                  ▼
   ┌────────────────────────────────┐
   │ EventStore PG-08B (nuevo)      │  data/shared-pg08b.db (NUNCA pokegotchi.db)
   │ append-only + proyecciones     │  BEGIN IMMEDIATE / COMMIT / ROLLBACK
   └────────────────────────────────┘
```

**Principio:** el módulo puro sigue siendo la única fuente de reglas de propiedad. El store solo persiste y rehidrata; no reimplementa validaciones. Esto preserva la separación exigida en AGENTS.md entre partidas locales y datos compartidos.

---

## 4. Secuencia de trabajo propuesta

1. **Fase 0 — Confirmación de decisiones:** el humano resuelve al menos D1, D2 y D3 de `11-DECISIONES-PENDIENTES.md`. Si no se resuelven, PG-08B se limita al store local aislado y NO expone ninguna operación a la UI.
2. **Fase 1 — Store append-only:** tablas `pg08b_events` (sequence, tipo, agregado, idempotency_key UNIQUE, payload JSON) y `pg08b_snapshots` (agregado, revisión, estado). Carga inicial = `restore(events)`.
3. **Fase 2 — Transaccionalidad:** adaptar `createNurserySystem` para que cada comando se ejecute dentro de una transacción SQLite del store; verificar que un `STALE_REVISION` revierte sin huellas.
4. **Fase 3 — Rehidratación y supervivencia:** cerrar y reabrir el store, reconstruir desde eventos, comprobar que la idempotencia de PG-08A sigue vigente (prefijos por tipo de comando ya implementados en `restore()`).
5. **Fase 4 — Puente local lejano:** funcione con guardería desconectada: la recuperación por vale se emite y canjea en el store, sin consultar conectividad del anfitrión.
6. **Fase 5 — Verificación y entrega:** suite nueva, `bun run check`, hashes protegidos, informe con REAL vs SIMULADO.

---

## 5. Criterios de aceptación propuestos para PG-08B

- Persistencia de alojamientos **en archivo distinto** a `data/pokegotchi.db`, con hash de la BD original idéntico antes y después.
- Replay determinista: el mismo log produce el mismo `snapshot()` en procesos distintos.
- Idempotencia entre reinicios: repetir un comando después de rehidratar devuelve el mismo `eventId`.
- Capacidad 2 y `STALE_REVISION` comprobados dentro de transacciones reales.
- Recuperación por vale válida con anfitrión desconectado **en el store local**.
- Los tres permisos siguen `null` por defecto y revocables; crianza sigue sin implementarse.
- Ningún endpoint nuevo, ninguna UI nueva, ningún commit/push sin autorización.

---

## 6. Riesgos de la propuesta

| Riesgo | Mitigación propuesta |
|---|---|
| Confundir `shared-pg08b.db` con la BD real | Ruta constante, prueba de hash y nombre distinto en la suite |
| Duplicar validación entre módulo y store | El store delega en los validadores y comandos de PG-08A |
| Crear dependencias nuevas | Prohibición explícita en los criterios de aceptación |
| Dar por «resuelta» la recuperación offline sin servicio | Etiquetar explícitamente como simulación local; el servicio real sigue en D2 |
| Abrir la puerta a crianza o pagos | Fuera de alcance, sin excepción |

---

## 7. Recomendación final

Ejecutar PG-08B **solo como capa de persistencia local aislada**, sin tocar la interfaz, sin conectar endpoints y sin crear cuentas. Es el siguiente paso más pequeño que añade valor verificable (supervivencia al reinicio y transaccionalidad) sin adoptar decisiones de producto que aún no están aprobadas.
