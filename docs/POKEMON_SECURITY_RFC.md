# Protección de Pokémon — Arquitectura (RFC)

**Estado:** PROPUESTA — diseño propuesto, sin implementación.
**Relacionado:** `docs/SHARED_NURSERIES_SPEC.md`, `docs/POKEMON_SECURITY_RFC.md`.

> Este documento analiza y propone medidas de protección para los Pokémon depositados en la plataforma. No implementa criptografía todavía.

---

## Cifrado

### Datos sensibles en reposo

- Cifrado autenticado (p. ej., AES-256-GCM o ChaCha20-Poly1305) para datos sensibles en reposo.
- Claves gestionadas fuera del frontend, en un servicio de claves (KMS/Secrets Manager) o HSM.
- Separación estricta entre datos públicos (nombre de usuario, estadísticas públicas) y privados (IV, naturaleza, movimientos, met data, save completo).
- Copias de seguridad cifradas con la misma protección que los datos primarios.
- Tratamiento seguro de saves importados: los archivos originales nunca se exponen a otros usuarios; solo se almacena la versión parseada y cifrada.

### Comunicaciones públicas

- TLS 1.2+ obligatorio para toda comunicación pública.
- Certificados gestionados con renovación automática.
- HSTS habilitado.

### Gestión de claves

- Rotación programada y manual.
- Recuperación ante pérdida de clave primaria (re-encrypt con clave secundaria).
- Auditoría de accesos a claves.

---

## Propiedad y autorización

### Identificadores

- **Identificador interno único** de cada Pokémon registrado (UUID).
- Vinculación persistente al propietario (user_id).
- Registro de estancia activa (nursery_id, check_in/out timestamps).
- Permisos específicos por estancia.

### Comprobaciones

- Todas las operaciones de modificación de datos pasan por validaciones del servidor.
- Registro de operaciones críticas (depósito, recuperación, breeding, modificación de permisos).
- Prevención de transferencias no autorizadas.

---

## Antiduplicación

### Modelo propuesto

- **Custodia o bloqueo lógico** durante las estancias: un Pokémon alojado en una Guardería queda marcado como `in_stay` y no puede solicitarse para otra Guardería.
- Transacciones atómicas con verificación de disponibilidad antes de confirmar la estancia.
- Registro transaccional (log de auditoría) para investigar inconsistencias.

### Distinciones

| Concepto | Protegible |
|---|---|
| Acceso no autorizado | Sí — auth + autorización + cifrado |
| Manipulación de datos | Sí — validaciones servidor + integridad |
| Duplicaciones dentro de la plataforma | Sí — bloqueo lógico + transacciones |
| Copias externas del save del usuario | **No** — el usuario controla su save; no se puede impedir que conserve copias externas |

> No prometer impedir todas las copias de un Pokémon importado desde un archivo local.

---

## Recuperación

El Pokémon nunca debe perderse por un fallo de sincronización.

### Escenarios y respuestas

| Escenario | Respuesta |
|---|---|
| Anfitrión se desconecta | La estancia queda en `error_recoverable`; el propietario puede recuperarlo sin depender del anfitrión. |
| Guardería se cierra | Las estancias activas se mantienen; el propietario recibe notificación y puede recuperar. |
| Servidor falla | Transacción atómica previene pérdida; estado registrado permite recuperación manual o automática. |
| Transacción incompleta | Rollback automático; reintento idempotente. |
| Propietario solicita devolución | Proceso guiado que no requiere que el anfitrión esté conectado. |

### Garantía

> El Pokémon nunca se pierde por un fallo de sincronización. Todo fallo deja un estado recuperable registrado.

---