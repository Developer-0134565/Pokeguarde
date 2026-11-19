# PG-08C — Recomendación técnica NO VINCULANTE sobre D6

**ESTA RECOMENDACIÓN NO APRUEBA D6 NI IMPLEMENTA NADA.**

D6 continúa **pendiente de decisión humana**. Lo que sigue es una orientación
técnica derivada del estudio (`07-ESTUDIO-D6.md`) y de las pruebas de PG-08C.
No sustituye a la autorización del usuario.

## Recomendación

Si en una fase posterior se autoriza avanzar, la opción técnicamente más
robusta es **D (híbrido)**, con dos precisiones obligatorias:

1. La vía directa solo existe cuando el servicio autoritativo está disponible.
2. La vía desconectada produce una **intención/vale**, nunca una recuperación
   confirmada fabricada en una réplica.

## Por qué no las otras en solitario

- **A (vale renovable)** es la más compatible con lo ya construido y atiende al
  anfitrión desconectado, pero no permite iniciar la retirada cuando falta el
  propietario y depende del servicio para canjear.
- **B (recuperación directa)** tiene la mejor experiencia en condiciones
  normales, pero no funciona sin servicio y, por sí sola, contradice el
  objetivo de recuperación desconectada de PG-08A.
- **C (custodia)** ofrece la garantía conceptual más clara al separar propiedad
  de custodia, pero introduce más estados y no resuelve por sí sola la
  desconexión del propietario.

## Condiciones que cualquier decisión futura debe conservar

1. **Invariante:** el derecho del propietario a recuperar su Pokémon no caduca.
   Solo pueden caducar instrumentos técnicos, siempre reemitibles.
2. **Propiedad separada de custodia**, con independencia de la alternativa que
   se elija.
3. **Una sola autoridad**: ninguna réplica puede confirmar una recuperación.
4. **Revisión optimista** y conflictos D5 resueltos con `STALE_REVISION`, nunca
   último escritor gana.
5. **Idempotencia** por `commandId` y anti-replay por `nonce`/`revision`.
6. **Reconciliación unilateral**: una recuperación confirmada gana siempre
   frente a un cuidado tardío o a una réplica desconectada.
7. **Diferenciación explícita** de anfitrión, propietario y servicio
   desconectados.
8. **El prototipo de vales de PG-08A/B se conserva**; cualquier nueva vía es
   aditiva y requiere autorización específica.

## Coste esperado de D

- Dos protocolos de recuperación y una capa de reconciliación.
- Pruebas cruzadas: vale + retirada directa, reintentos mixtos, desconexiones
  combinadas y pérdida de confirmación.
- Definición previa de la semántica de «confirmación definitiva offline», que
  en esta fase **no existe**.

##Estado de esta recomendación

| Elemento | Estado |
|---|---|
| Alternativa D recomendada como orientación técnica | NO VINCULANTE |
| Decisión D6 | PENDIENTE |
| Cambios en el dominio de recuperación | NINGUNO |
| Eliminación del prototipo de vales | NO REALIZADA |
| Implementación de servidor público / cuentas / transferencia remota | NO REALIZADA |

La decisión final corresponde al usuario. Hasta que se produzca, PG-08C queda
cerrada con D6 **estudiada pero no resuelta**.
