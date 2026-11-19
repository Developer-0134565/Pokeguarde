# PG-08C — Propuesta de fase siguiente: PG-08D

**Propuesta, no autorización.** PG-08D no está aprobada. No se inicia sin
autorización explícita y sin resolver D6.

## Objetivo propuesto

Cerrar el ciclo de Guarderías Compartidas en modo **local simulado** con una
decisión humana sobre D6 y, solo después, una extensión controlada de la
superficie compartida. Sin servicios públicos.

## Prerrequisitos

1. Decisión D6 del usuario (A, B, C, D o una variante), con el invariante del
   derecho del propietario por escrito.
2. Revisión de los riesgos de PG-08C (`06-RIESGOS.md`), en especial
   autenticación de prueba y outbox local.
3. Confirmación de que no se tocarán saves reales ni `data/pokegotchi.db`.

## Trabajo propuesto

### 1. Consolidación de D6 (si se autoriza)

- Definir formalmente el instrumento de recuperación elegido y su renovación.
- Especificar la reconciliación y la precedencia de una recuperación
  confirmada frente a operaciones tardías.
- Añadir pruebas específicas de la alternativa elegida sobre BD temporal.
- **No** eliminar el prototipo de vales existente.

### 2. Endurecimiento local

- Sustituir `TestIdentityProvider` por un proveedor de prueba con expiración y
  revocación explícitas, siempre marcado como no apto para producción.
- Añadir pruebas de revocación durante una operación ya en curso, una vez
  exista decisión de producto (hoy el comportamiento es conservador).
- Ampliar la matriz de conflictos con interrupciones combinadas.

### 3. Modelo de datos y observabilidad

- Definir métricas locales para mensajes pendientes, huecos y réplicas
  desincronizadas.
- Registrar un informe legible de cada reconciliación.
- Mantener la separación estricta entre base compartida y base de producción.

### 4. Solo si se autoriza expresamente

- Evaluar un transporte real para la cola. **No** en PG-08D sin decisión
  separada: PG-08C prohíbe HTTP, WebSocket y SSE.
- Evaluar invitaciones (D4), retención (D8) y cuotas (D9) como decisiones
  independientes.

## Fuera del alcance propuesto de PG-08D

- Servidor público, cuentas online, directorio de guarderías.
- Depósitos o recuperaciones remotas reales.
- Crianza, huevos, Guardipuntos, monetización.
- Modificación de saves, sprites, motor Tamagotchi, PKHeX.Core o legalidad.
- Cambios en `data/pokegotchi.db`, fixtures o exportaciones existentes.

## Criterios de aceptación sugeridos

1. D6 decidida por el usuario y documentada como decisión vinculante.
2. Política de recuperación implementada de forma aditiva, sin borrar el
   prototipo de vales.
3. Pruebas sobre BD temporales, con el mismo nivel de aislamiento que PG-08C.
4. `bun run check` correcto.
5. Informe con hashes, Git y diferencias simulación/producción.

## Estado

| Elemento | Estado |
|---|---|
| PG-08D propuesta | PENDIENTE DE AUTORIZACIÓN |
| Decisión D6 | PENDIENTE |
| Implementación | NO INICIADA |
| Commits o pushes | NO REALIZADOS |
