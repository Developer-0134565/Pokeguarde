# PG-08F — Spike de autoridad online (READ-ONLY)

**Estado: estudio técnico, NO implementación.** No se desplegó servicio, no se
configuraron credenciales, no se añadieron dependencias de pago y no se eligió
proveedor definitivo. La auditoría intentada con subagente **no fue
independiente**: agotó la cuota antes de emitir resultados, por lo que este
documento es elaborado directamente y debe considerarse no contrastado por
terceros.

## 1. Arquitectura local actual

| Capacidad | Implementación real |
|---|---|
| Identidad de jugador | `hostId` / `guestOwnerId` como cadenas opacas; sin cuentas ni login. |
| Persistencia | SQLite por proceso (`pair_*.db`) en rutas aisladas; nunca `pokegotchi.db`. |
| Autoridad | `EggAuthorityPort` simulada, con secuencia y permisos por rol (`denyRoles`, `orders`). |
| Eventos | Eventos inmutables + clave de idempotencia + outbox en la misma BD. |
| Recuperación | `replay()` y `drainBacklog()` tras reinicio o capacidad agotada. |
| Cifrado | Ninguno: todo es local, sin tránsito por red. |
| Saves | Intactos; ninguna entrega escribe en partidas. |

Garantías reales: todo-o-nada dentro de una SQLite, idempotencia por clave,
propiedad por rol, procedencia DEMO inmutable. Límites: no hay consenso entre
procesos remotos, no hay autenticación de identidad y no hay protección frente
a un actor que modifique la BD directamente.

## 2. Simulación de autoridad (PG-08C + PG-08F)

La autoridad simulada demuestra el **contrato**: verificación de permisos por
rol, orden monotonic (`STALE_ORDER`), revocación (`PERMISSION_REVOKED`) y
secuencia guardada en `pair_meta`. Es útil para probar reglas y fallos, pero:

- Un proceso con acceso de escritura a la BD puede falsear la secuencia.
- No hay firma criptográfica de comandos ni de eventos.
- No hay prueba de posesión de identidad: `hostId` es solo una cadena.
- Dos workers del mismo equipo no representan dos hosts desconectados.

Por tanto la simulación **no** es una garantía online ni de integridad ante
adversario.

## 3. Infraestructura necesaria para producción

Alternativas a estudiar, sin selección definitiva:

| Tema | Alternativa A | Alternativa B | Comentario |
|---|---|---|---|
| Identidad | Cuenta local con par de claves por dispositivo | Proveedor OIDC / OAuth | A requiere gestión de claves y recuperación; B añade dependencia externa y coste operativo. Ninguna autorizada. |
| Autenticación | Tokens firmados de corta duración + nonce | Sesión centralizada | Imprescindible para impedir suplantación de `hostId`/`guestOwnerId`. |
| Registro autoritativo | Un servidor central con un único escritor | Consenso (Raft) entre anfitriones | Central es más simple; consenso solo se justifica si se requiere operación sin servidor. |
| Persistencia | SQLite en servidor con copias cifradas | Postgres gestionado | SQLite encaja con el stack actual; Postgres facilita concurrencia y backup, añade coste. |
| Anfitrión desconectado | Servidor decide con backlog y handshake | Store-and-forward con firmas y reintentos | El backlog PG-08F ya modela la semántica; falta durabilidad y expiración. |
| Sincronización de eventos | Log append-only con secuencia y hash encadenado | Event sourcing con snapshots | El hash encadenado permite detectar manipulación; los snapshots aceleran el replay. |
| Protección replay | `idempotencyKey` + secuencia + nonce con TTL | Deduplicación por firma de comando | Las claves actuales son el punto de partida; un nonce con TTL evita reenvío indefinido. |
| Cifrado en tránsito | TLS 1.3 obligatorio en todo endpoint | TLS + pinning | No hay endpoint hoy; cualquier implementación futura debe ser fail-closed. |
| Secretos | Almacén de secretos del sistema operativo / variable de entorno | Gestor gestionado | Nunca en repositorio ni en logs; rotación documentada. |
| Backups | Copia cifrada programada + restauración probada | Replicación continua | Sin restauración probada no hay backup. |
| Recuperación ante fallos | Replay determinista + backlog | Failover automático | El replay ya existe en local; en producción requiere autoridad y reloj fiables. |

## Costes operativos estimados

Solo estimación **cualitativa**; no hay precios de proveedor verificados en
este repositorio, por lo que no se inventan cifras.

- **Bajo**: servidor único, SQLite, TLS con certificado gestionado, backups
  cifrados locales. Adecuado para pruebas controladas; punto único de fallo.
- **Medio**: base gestionada, secretos gestionados, monitorización y prueba de
  restauración. Requiere presupuesto y responsable de operaciones.
- **Alto**: consenso multi-anfitrión, auditoría de seguridad independiente,
  rotación y cumplimiento. Solo justificable con requisitos reales de
  disponibilidad y confianza.

## Riesgos

1. Suplantación de propietario si la identidad sigue siendo una cadena.
2. Reenvío de comandos si solo se usa `idempotencyKey` sin nonce/TTL.
3. Pérdida del par si el backlog no tiene expiración ni política de capacidad.
4. Filtración de saves: los archivos originales **nunca** deben subir.
5. Falsa sensación de atomicidad distribuida entre servicios distintos.
6. Dependencia de un proveedor sin autorización aumenta el riesgo operativo.

## Recomendación

Mantener PG-08F como simulación local. Antes de cualquier despliegue, definir
identidad, autoridad, cifrado, secretos, backups y política de recuperación, y
obtener autorización explícita. No seleccionar proveedor ni habilitar cuentas
reales en esta fase.
