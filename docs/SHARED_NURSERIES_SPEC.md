# Especificación de Guarderías compartidas (PG-08)

**Estado:** DECIDED (diseño de modelo y flujo); implementación pendiente.
**Relacionado:** `docs/BREEDING_DESIGN_RFC.md`, `docs/POKEMON_SECURITY_RFC.md`, `docs/MONETIZATION_DESIGN_RFC.md`, `docs/STITCH_IMPLEMENTATION_PLAN.md`.

> Este documento especifica el modelo de Guarderías compartidas, el flujo de depósito, el cuidado delegado y los permisos especiales. No se implementan todavía los componentes de la pestaña Jugadores ni la lógica de servidor asociada.

---

## Modelo de Guardería

Cada jugador dispone de una Guardería con **capacidad máxima de dos Pokémon**.

La Guardería puede estar en cada una de las siguientes dimensiones, que son **independientes** entre sí:

| Dimensión | Valores |
|---|---|
| Admisión de nuevas solicitudes | Abierta / Cerrada |
| Visibilidad | Pública / Solo amigos / Privada |
| Conectividad | Conectada / Desconectada |
| Ocupación | Con plazas disponibles / Completa |

**Cerrar una Guardería no expulsa automáticamente a los Pokémon ya alojados.**

---

## Pestaña Jugadores

La pestaña Jugadores incluirá los siguientes componentes (documentados, no implementados todavía):

1. Directorio de Guarderías.
2. Búsqueda de jugadores.
3. Filtros por disponibilidad.
4. Estado abierta/cerrada.
5. Ocupación de plazas.
6. Visitas a Guarderías ajenas.
7. Solicitudes de alojamiento.
8. Invitaciones privadas.
9. Amigos.
10. Bloqueos y denuncias.
11. Notificaciones.

---

## Flujo de depósito

Estados de una estancia de depósito:

1. **Disponible** — el Pokémon puede solicitarse para alojarse.
2. **Solicitud pendiente** — el propietario ha enviado una solicitud; aún no se transfiere ni reserva plaza.
3. **Aceptada / Rechazada** — el anfitrión responde a la solicitud.
4. **Estancia activa** — el Pokémon está alojado en la Guardería del anfitrión.
5. **Recogida solicitada** — el propietario ha pedido recuperar su Pokémon.
6. **Estancia finalizada** — el Pokémon ha abandonado la Guardería.
7. **Error recuperable** — operación fallida que permite reintento sin pérdida de datos.

**Reglas:**

- Una solicitud pendiente **no transfiere el Pokémon**.
- La aceptación debe **verificar la disponibilidad y reservar la plaza de forma atómica**.
- Un Pokémon **no puede estar alojado simultáneamente en varias Guarderías**.
- El propietario debe poder recuperar su Pokémon **sin depender de que el anfitrión esté conectado**.

---

## Cuidado delegado

El anfitrión podrá:

- Alimentar.
- Permitir dormir y descansar.
- Limpiar.
- Cuidar las necesidades normales.
- Realizar actividades de entretenimiento.
- Ejecutar minijuegos cooperativos específicos para dos mascotas.
- Realizar acciones normales que no requieran permisos especiales.

El propietario podrá desentenderse del cuidado cotidiano durante la estancia.

---

## Permisos especiales

Se registran **tres autorizaciones independientes**, todas **desactivadas por defecto**:

1. Uso de bayas que modifican EV.
2. Minijuegos de entrenamiento que modifican EV.
3. Solicitudes de breeding.

**Reglas:**

- El propietario podrá **concederlas y revocarlas**.
- El servidor **comprobará los permisos vigentes antes de cada operación**.
- Autorizar solicitudes de breeding **no equivale a consentir automáticamente cualquier crianza**.
- Las bayas que únicamente alimentan y no alteran EV podrán formar parte del cuidado normal (no requieren permiso especial).

---