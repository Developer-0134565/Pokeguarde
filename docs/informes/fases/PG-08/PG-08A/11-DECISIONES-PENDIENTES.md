# PG-08A — Decisiones pendientes de aprobación humana

**Estado:** PROPUESTAS. Ninguna de estas decisiones se ha adoptado silenciosamente. Todas deben resolverse antes de PG-08B o antes de cualquier despliegue compartido.

La recomendación técnica es una sugerencia del análisis, **no** una autorización concedida por esta misión.

---

## D1. Sistema de identidad y autenticación

**Pregunta:** ¿cómo se demuestra que un llamador es el propietario?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Cuentas con correo/contraseña | Estándar, recuperable por correo | Requiere correo, verificación, protección de menores y gestión de secretos |
| Inicio de sesión con proveedor (OIDC) | Externaliza contraseñas y MFA | Dependencia externa, términos del proveedor, privacidad de menores |
| Identidad local sin cuentas (clave privada en el dispositivo) | Funciona offline, sin registro; encaja con el modo local de AGENTS.md | Perder la clave equivale a perder la identidad; recuperación difícil; no basta para web pública |
| Invitaciones con código secreto por estancia | Muy simple para un prototipo | No escala, no prueba identidad persistente, código compartible |

**Recomendación:** diseñar una **identidad local soberana** (par de claves generado en el dispositivo, UUID público derivado) para modo local, y dejar una **capa de autenticación Federation-agnóstica** para la web pública. PG-08B debe definir la interfaz `OwnerAuthenticator`, no elegir proveedor.

**Bloqueante para:** cualquier endpoint que acepte `ownerId`; hoy la suplantación es trivial (riesgo ALTO en `06-AMENAZAS.md`).

---

## D2. Servicio autoritativo

**Pregunta:** ¿quién decide dónde está un Pokémon y si una recuperación es válida?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Registro central autoritativo | Una sola verdad; recuperación offline del propietario; resolución de conflictos sencilla | Servicio obligatorio; caída = indisponibilidad; costs y operación |
| Registro distribuido entre anfitriones | No requiere servidor central | La recuperación sin anfitrión conectado **no se puede garantizar**; conflictos complejos |
| Contrato inteligente / blockchain | Autoridad sin operador | Complejidad, coste, privacidad nula, rendimiento; no evaluado en PG-08A |
| Modelo híbrido: registro central + caché local | Funciona con desconexiones transitorias y conserva garantías | Requiere definir resolución de conflictos y expiración de caché |

**Recomendación:** **registro central con caché local de solo lectura** y vale de recuperación firmado por el registro. Es la única alternativa que satisface literalmente «el propietario recupera aunque el anfitrión esté desconectado» sin exponer los datos del save.

**Bloqueante para:** D3, D6, D7.

---

## D3. Persistencia de alojamientos

**Pregunta:** ¿dónde se guardan `Owner`, `Nursery`, `Stay`, `PermissionGrant` y el log de eventos?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Tablas nuevas en `data/pokegotchi.db` | Un solo proceso, sin infraestructura nueva | Mezcla datos locales y compartidos; contradice «separación entre partidas locales y datos online»; el archivo está protegido |
| Base de datos nueva (`shared.db`) | Separación física; se puede cifrar y respaldar aparte | Dos bases que sincronizar; requiere migraciones propias |
| Base de datos del servicio autoritativo | Coherente con D2; control de acceso central | Requiere despliegue y operación; fuera del alcance actual |
| Event store solo (append-only) | Auditoría perfecta y replay; encaja con `restore()` | Consultas más caras; requiere snapshots y compactación |

**Recomendación:** **event store append-only en el servicio autoritativo**, con proyecciones materializadas para consulta y un archivo local cifrado únicamente como caché. PG-08A ya implementa el `replay` en memoria que valida este enfoque.

**Restricción vigente:** no se crearon tablas nuevas en la BD real; el nombre `pokegotchi.db` permanece intacto a propósito.

---

## D4. Invitaciones y descubrimiento

**Pregunta:** ¿cómo encuentra un propietario una guardería ajena?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Solo invitaciones manuales por código | Privado por diseño, bajo abuso | Poco descubrimiento; código compartible |
| Directorio público de guarderías | Fácil de usar | Requiere moderación, anti-spam y metadatos públicos; riesgo para menores |
| Solo amigos (lista de contactos) | Equilibrio razonable | Requiere grafo social, aprobación mutua y gestión de bloqueos |
| Descubrimiento por proximidad/local | Sin cuentas | No aplicable a la web pública; información sensible de ubicación |

**Recomendación:** **fase inicial solo por invitación** con lista de amigos aprobada mutuamente; el directorio público queda **PROPOSED** en ROADMAP (PG-08B) y no se activa sin decisión explícita y control de abuso. El módulo ya rechaza `invite_only` con «pendiente de diseñar», coherente con esta recomendación.

---

## D5. Resolución de conflictos

**Pregunta:** ¿qué ocurre si dos réplicas aceptan el mismo Pokémon o el registro y el anfitrión discrepan?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Último escritor gana (LWW) | Simple | Puede perder una recuperación legítima: **inaceptable** para propiedad |
| Revisión optimista + reintento | Ya implementado y probado (`STALE_REVISION`) | Requiere que el cliente maneje rechazos |
| Vección de relojes / CRDT | Convergencia automática | Complejidad alta; dominio con semántica de propiedad no es conmutativo |
| Autoridad única del registro | Determinista | Dependencia de disponibilidad (D2) |

**Recomendación:** **autoridad del registro + revisión optimista en el cliente**, con `409 STALE_REVISION` y reintento explícito del usuario. Nunca LWW para operaciones de propiedad. Las reglas de «operación ya iniciada antes de una revocación» siguen pendientes (ver `03-MODELO-PERMISOS.md`).

---

## D6. Garantías de recuperación offline

**Pregunta:** ¿qué significa exactamente «recuperación posible con el anfitrión desconectado» en producción?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Vale autoritativo con validez de 7 días | Modelado y probado en PG-08A; no depende del anfitrión | Requiere que el registro esté disponible al emitir y canjear; expiración necesita política de renovación |
| Vale sin caducidad | Más cómodo | Riesgo de recuperaciones tardías y estados obsoletos |
| Retirada inmediata sin vale | Muy simple | Permite retiradas duplicadas y condiciones de carrera |
| Recuperación por soporte humano | Cubre caídas largas | Coste operativo, abuso social engineering |

**Recomendación:** **vale autoritativo de 7 días, renovable mediante nueva solicitud**, con `revision` estricta e idempotencia en el canje. Está implementado en el modelo; su garantía real depende de D2 y D7.

---

## D7. Modelo de sincronización

**Pregunta:** ¿cómo se propagan los cambios entre registro, anfitrión y propietario?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Push de eventos (websocket/SSE) | Baja latencia | Requiere conexión; reconexión y orden de entrega |
| Sondeo periódico | Simple y robusto | Latencia; coste; no apto para datos sensibles sin cifrado |
| Cola de mensajes con reintentos | Durabilidad y orden por agregado | Infraestructura nueva; idempotencia obligatoria (ya presente en el modelo) |
| Sincronización bajo demanda al abrir la app | Encaja con el modo local | No notifica cambios urgentes como una revocación |

**Recomendación:** **eventos con idempotencia y secuencia por agregado** transportados por cola Duradera, con sondeo al abrir la app como mecanismo de puesta al día (análogo a los 7 días de `advance()`). El modelo ya expone `sequence`, `exportEvents()` y `restore()`.

---

## D8. Retención de datos

**Pregunta:** ¿cuánto tiempo se conservan estancias, permisos, vales, eventos y datos del Pokémon?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Retener todo indefinidamente | Auditoría máxima | Coste, privacidad, riesgo de exposición; crece sin límite |
| Borrar al finalizar la estancia | Mínima huella | Pierde trazabilidad de cambios relevantes exigida por AGENTS.md |
| Retención temporal con anonimización | Equilibrio | Requiere definir plazos y qué se anonimiza; complejidad legal |

**Recomendación:** conservar los **eventos de propiedad y recuperación** durante un plazo legal a definir, y anonimizar los datos de cuidado a los 30 días; nunca conservar el archivo de save original en el servicio. Los plazos concretos requieren revisión legal, especialmente por público menor de edad.

---

## D9. Límites y protección frente a abusos

**Pregunta:** ¿qué límites se imponen antes de abrir el servicio?

| Alternativa | Ventajas | Inconvenientes |
|---|---|---|
| Solo capacidad 2 (ya decidido) | Simple, documentado | No evita spam de solicitudes nidepósitos repetidos |
| Cuotas por propietario y por guardería | Controla abuso | Requiere identidad fiable (D1) |
| Lista de bloqueo y reputación | Protección social | Moderación, falsos positivos, privacidad |
| Rate limiting y verificación de consentimiento | Mitiga repetición y suplantación | No resuelve duplicación del archivo .srm |

**Recomendación:** combinar **capacidad 2 + idempotencia + rate limiting + cuotas por propietario** desde el primer despliegue. La duplicación mediante copias externas del `.srm` **no se puede eliminar técnicamente** y debe aceptarse como riesgo residual documentado (no se introducen mecanismos anti-copia coercitivos).

---

## Orden de resolución recomendado

1. **D1 + D2** (identidad y autoridad): sin ellas ninguna garantía es comprobable.
2. **D3 + D7** (persistencia y sincronización): definen el contrato observable.
3. **D5 + D6** (conflictos y recuperación): cierran las promesas de propiedad.
4. **D4 + D9** (descubrimiento y abuso): antes de exponer superficie pública.
5. **D8** (retención): antes de almacenar datos reales de menores.

**No se adopta ninguna de estas alternativas en PG-08A.** Esta lista existe para que PG-08B reciba decisiones explícitas del humano, no suposiciones del agente.
