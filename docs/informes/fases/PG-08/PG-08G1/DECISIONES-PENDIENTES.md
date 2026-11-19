# PG-08G.1 — Auditoría de decisiones pendientes (D4, D8, D9)

## Estado general

No se ha adoptado ninguna decisión nueva en PG-08G.1. La regla aprobada de
**distribución 1+1** (PG-08F) se mantiene como decidida; lo que falta son
**subdecisiones** y parámetros, no la regla en sí.

## D4 — Invitaciones y descubrimiento

| Aspecto | Estado |
|---|---|
| Decisión agregada | **PENDIENTE** |
| Subdecisión «modo local sin cuentas» | Aprobada en `AGENTS.md` (PG-08): el modo local no depende de cuentas, pagos ni conexión permanente. |
| Subdecisión «solo invitación en fase inicial» | Recomendación técnica de PG-08A, **no aprobada**. |
| Directorio público / amigos / proximidad | Sin decidir. |
| Valor temporal en código | No se ha implementado descubrimiento; no hay valor de prueba que confundir con decisión. |

Consecuencia para PG-08G.2: el origen de la pareja puede venir de una estancia
local, pero no se debe asumir un mecanismo de descubrimiento.

## D8 — Retención de datos

| Aspecto | Estado |
|---|---|
| Decisión agregada | **PENDIENTE** |
| Recomendación PG-08A | Conservar eventos de propiedad/recuperación un plazo legal a definir; anonimizar cuidado a 30 días; no conservar saves en el servicio. |
| Plazos concretos | Sin aprobar; requieren revisión legal y público menor de edad. |
| Valor temporal en código | Ninguno en genética; PG-08E/F guardan eventos en stores aislados pero no aplican expiración. |

Consecuencia: no se debe fijar una política de expiración de huevos ni de datos
genéticos «por defecto» sin autorización.

## D9 — Límites y abuso

| Aspecto | Estado |
|---|---|
| Decisión agregada | **PENDIENTE** |
| Capacidad 2 por guardería | Aprobada en `AGENTS.md` (PG-08), distinta de la capacidad de huevos. |
| Cuotas / rate limiting / bloqueos | Recomendados en PG-08A, sin aprobar. |
| `DEFAULT_PAIR_CAPACITY=4` en PG-08F | **Valor de prueba explícitamente declarado**, no decisión. |
| `single` como acumulación por defecto | Comportamiento experimental de PG-08E, no política definitiva. |

Consecuencia: `GenerationRulesProvider` no debe incluir límites de producción;
la capacidad sigue siendo responsabilidad del store y de una decisión humana.

## Otras decisiones abiertas relevantes para el motor genético

- Genética por generación y versión (este informe propone reglas, no las fija).
- Política de asignación de propietario (`guest_owner`, `host`, `prearranged`,
  `pending`) sin adoptar.
- Acumulación y expiración de huevos.
- Exportabilidad futura de un Pokémon nacido de un huevo simulado.
- Reglas de legitimidad y validación frente a PKHeX.Core.
- Identidad/autoridad online (D1–D3, D5–D7 aprobadas como arquitectura, sin
  despliegue; ver informes PG-08A/B/C).

## Regla de interpretación

«Pendiente» significa **no decidido**, no «decidido en falso». Ningún valor de
prueba de PG-08D–F se convierte en política por el simple hecho de estar en el
código. Toda PG-08G.2 que necesite uno de estos valores debe detenerse y
solicitar decisión explícita.
