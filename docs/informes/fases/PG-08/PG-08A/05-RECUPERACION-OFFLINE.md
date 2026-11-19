# PG-08A — Modelo de recuperación offline

**Estado del modelo:** DISEÑADO Y SIMULADO. No existe servidor autoritativo desplegado.
**Requisito:** «La recuperación por el propietario debe ser posible incluso cuando el anfitrión esté desconectado.»

---

## 1. Problema

Un registro local del anfitrión **no puede garantizar** la recuperación: si el anfitrión
está apagado, su copia no responde y un diseño que exija su confirmación en tiempo real
convierte la desconexión en una pérdidaeffectiva del Pokémon. Tampoco sirve delegar la
decisión al visitante, porque permitiría retiradas arbitrarias.

La solución debe separar:

| Concepto | Quién lo decide | Dónde vive |
|---|---|---|
| Estado autoritativo de la estancia | Registro de eventos | Servicio futuro (simulado por `createNurserySystem`) |
| Solicitud de retirada | Propietario, con firma de su identidad | Evento `recovery.requested` |
| Autorización de retirada | Registro, no el anfitrión | `RecoveryVoucher` |
| Ejecución de la retirada | Registro, con el vale | Evento `recovery.completed` |

**La conectividad del anfitrión es información contextual** (`hostConnected`,
`hostOfflineNoted`). Nunca es un requisito para emitir el vale ni para completar la
retirada. El test 9 lo comprueba con la guardería en `disconnected` y
`hostConnected: false`.

---

## 2. Secuencia

```
Propietario ──requestRecovery(stayId,ownerId,reason)──▶ Registro
       ◀──────────── RecoveryVoucher(nonce,7d,revision) ────────────
Propietario ──completeRecovery(voucher)───────────────▶ Registro
       ◀──────────── Stay(state=stay_finished) ─────────────────────
```

1. `requestRecovery` valida la solicitud y comprueba que quien la envía es
   `stay.ownerId`. Cualquier otro obtiene `OWNER_MISMATCH` (test 2).
2. Solo se aceptan estancias en `stay_active`, `pickup_requested` o
   `recoverable_error`; un estado `stay_finished` da `STAY_NOT_ACTIVE`.
3. El registro emite un `RecoveryVoucher`:
   - `stayId` y `ownerId` vinculantes;
   - `nonce` UUID v4 imprredecible;
   - `issuedAt` = marca de la solicitud;
   - `expiresAt` = `issuedAt + 7 días`;
   - `revision` = revisión de la estancia **después** de la transición;
   - `usedAt = null`.
4. La estancia pasa a `pickup_requested` y se registra `hostOfflineNoted =
   !hostConnected`. Se emite `recovery.requested` con solicitud, estancia y vale.
5. `completeRecovery` valida el vale, comprueba propiedad, revisión y caducidad.
   Si la estancia ya está `stay_finished` o el vale ya tiene `usedAt`, devuelve
   **éxito sin evento**: la retirada repetida es un no-op idempotente.
6. En caso contrario marca `usedAt`, pone la estancia en `stay_finished`, libera
   el alojamiento (`hosted.delete`), recalcula el estado de la guardería y emite
   `recovery.completed`.

---

## 3. Propiedades verificadas

| Propiedad | Mecanismo | Prueba |
|---|---|---|
| Solo recupera el propietario | Comparación `stay.ownerId === req.ownerId` | test 2, test 8 |
| Funciona con anfitrión offline | El vale lo emite el registro; no se consulta conectividad | test 9 |
| Se registra la desconexión | `hostOfflineNoted = !hostConnected` | test 9 |
| Doble recuperación | `stay_finished` o `usedAt !== null` → `OK` sin evento | test 8 (estado final), test 10 (idempotencia) |
| Vale caducado | `Date.parse(at) > Date.parse(expiresAt)` → `VOUCHER_EXPIRED` | validador + lógica; no escenario de 7 días en la suite |
| Vale manipulado | Validación estricta + `OWNER_MISMATCH` + control de `revision` | tests 12 y 14 |
| Reinicio de la app | El registro de eventos se reapplya con `restore()` | test 14 |
| Conflicto de sincronización | `STALE_REVISION` si el vale quedó obsoleto | test 11 (mismo mecanismo) |

---

## 4. Vencimiento y renovación

El vale caduca a los 7 días. Pasado ese tiempo, `completeRecovery` devuelve
`VOUCHER_EXPIRED`. La estancia permanece en `pickup_requested`: **no se pierde**.
El propietario puede emitir una nueva solicitud con una clave de idempotencia
distinta y obtener un vale fresco. La política de reintento, notificaciones y
retención de vales caducados es una **decisión pendiente** (§11 del informe).

---

## 5. Límites de la simulación — LEA ESTO

`createNurserySystem` es un reducer en memoria. NO es un servicio, NO tiene
replicación, NO persiste en disco y NO resiste dos instancias independientes.
Por tanto:

- **VERIFICADO:** las propiedades del modelo (quién puede retirar, qué pasa si el
  anfitrión está offline, idempotencia, reconstrucción desde el log).
- **NO VERIFICABLE TODAVÍA:** recuperación real frente a un servidor caído,
  partición de red, firma criptográfica del vale o almacenamiento duradero.
  Requiere el servicio autoritativo de PG-08B (decisión humana pendiente).

Afirmar lo contrario sería presentar una simulación como infraestructura.

---

## 6. Alternativas estudiadas

| Alternativa | Ventaja | Inconveniente | Postura PG-08A |
|---|---|---|---|
| Confirmación del anfitrión | Simple, local | Rompe el requisito offline; anfitrión desconectado = Pokémon retenido | Rechazada |
| Retirada libre del visitante | Sin servidor | Suplantación y robo; sin propiedad protegida | Rechazada |
| Vale del registro autoritativo (elegida) | Cumple offline, auditable, idempotente | Necesita servicio autoritativo en producción | Diseñada y simulada; despliegue pendiente |
| Vale firmado localmente del propietario | Sin servidor | No resuelve quién tiene la copia válida; conflictos sin árbitro | Insuficiente |
| Contrato inteligente / blockchain | Autoridad compartida | Complejidad, coste, privacidad, fuera de alcance | No evaluada en detalle |

**Recomendación técnica:** vale emitido por el registro autoritativo, con
almacenamiento transaccional y replicación. No desplegar sin aprobación.
