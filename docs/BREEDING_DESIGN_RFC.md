# Breeding — Diseño futuro (RFC)

**Estado:** DECIDED (parcialmente); implementación pendiente.
**Relacionado:** `docs/SHARED_NURSERIES_SPEC.md`, `docs/MONETIZATION_DESIGN_RFC.md`.

> Este documento registra las decisiones confirmadas sobre breeding y señala explícitamente los aspectos aún no resueltos. No contiene fórmulas inventadas ni valores definitivos para aceleración o costes.

---

## Decisiones confirmadas

- Las Guarderías admiten hasta **dos Pokémon**.
- La crianza podrá involucrar Pokémon de **diferentes propietarios**.
- Deben aplicarse las **reglas de compatibilidad correspondientes**.
- La pertenencia a **grupos huevo no constituye por sí sola compatibilidad completa**.
- Se contemplarán **excepciones como Manaphy y Ditto**.
- La participación de un **Pokémon visitante requiere autorización de su propietario**.
- **Cada jugador participante recibirá un huevo.**
- Las características de cada huevo serán **aleatorias**.
- La generación de características se definirá durante la fase de breeding.

---

## Huevos

Los huevos aparecerán en el **inventario de cada jugador**.

Cada huevo tendrá un **tiempo de espera antes de estar listo para eclosionar**.

**Rango confirmado:** **15 minutos a 3 horas**.

El tiempo dependerá de:

- **Rareza.**
- **Suma total de IV.**
- **Fórmula de cálculo todavía pendiente.**

> No se inventa la fórmula en este documento.

---

## Aceleración

Los jugadores podrán acelerar la espera utilizando la **moneda gratuita obtenida jugando** (Guardipuntos, GP).

**No habrá compra de moneda premium en el diseño inicial.**

### Pendiente de determinar

- Coste por minuto.
- Coste mínimo y máximo.
- Si se permite aceleración instantánea.
- Redondeo.
- Límites por huevo.
- Comportamiento offline.
- Reglas contra manipulación del reloj.

> No se implementan ni asumen valores definitivos.

---

## Integridad

Los huevos deben generarse de forma **verificable por el servidor** en el entorno online.

**Evitar:**

- Duplicación de huevos.
- Repetición de recompensas.
- Manipulación de IV.
- Alteración de rareza.
- Modificación del cooldown desde el cliente.
- Reutilización de transacciones de breeding.

---

## Decisiones pendientes

Documentar que las **reglas de crianza y los efectos sobre partidas originales requieren decisiones adicionales** antes de implementarse.

---