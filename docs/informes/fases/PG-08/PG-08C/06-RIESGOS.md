# PG-08C — Riesgos y límites

| Riesgo | Impacto | Mitigación / estado |
|---|---|---|
| Token de prueba con secreto en memoria | Cualquier proceso con acceso al objeto puede firmar tokens | Explícitamente NO apto para producción; D1 exige sustituirlo por proveedor real antes de cualquier despliegue |
| Autoridad en un solo proceso | No hay tolerancia a fallos del proceso; no es un servicio | Simulación local deliberada; D5 valida la semántica, no la disponibilidad |
| `expectedRevision` es opcional | Un comando sin revisión no detecta conflictos | Las pruebas de D5 siempre lo envían; en producción debe ser obligatorio (decisión pendiente) |
| Revisión lógica separada de la revisión del dominio | Dos contadores pueden divergir si se cambia el dominio | Documentado; se reenvía a las dos operaciones que aceptan revisión; requiere prueba de regresión al cambiar PG-08A |
| Cola en la misma BD que el EventStore | Un fallo de disco afecta a ambos | Es una ventaja para atomicidad; no hay replicación ni backup en esta fase |
| Entrega manual (`claim`/`syncReplica`) | No hay concurrencia real de workers ni temporizadores | Fuera de alcance: no se autorizó transporte ni servidor |
| `reconcile` depende de `exportEvents()` | Solo repara eventos ya confirmados en el log | Suficiente para el caso «commit sin encolado»; no cubre pérdida del log |
| Vales de siete días del prototipo | Pueden interpretarse como política de producto | Marcados experimentales; D6 sigue pendiente; no se eliminaron ni reforzaron |
| Copias externas del `.srm` | Riesgo heredado de PG-08A fuera del modelo | Sin cambios en PG-08C; requiere decisiones D8/D9 |
| Datos personales y saves | Ningún save se copia a réplicas ni se envía a red | Verificado: las réplicas solo guardan eventos de dominio |

## Decisiones pendientes que afectan a la seguridad

- D4 (invitaciones), D6 (recuperación), D8 (retención) y D9 (cuotas).
- Política definitiva para revocación durante una operación ya aceptada.
- Autenticación/autorización real, cifrado en tránsito y almacenamiento y
  protección contra duplicación en un entorno multiusuario.

**Conclusión:** PG-08C valida semántica y persistencia local. No habilita un
servicio compartido y no debe presentarse como producción.
