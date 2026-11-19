# PG-08D · Propuesta de siguiente fase (PG-08E)

**No autorizada todavía.** Solo propuesta técnica para decisión posterior.

## Objetivo propuesto

Investigar y validar la crianza real sin modificar saves todavía: qué datos
oficiales se necesitan para convertir un huevo simulado en un Pokémon legal.

## Trabajo propuesto

1. Catálogo verificable de grupos huevo, géneros, bebés, singulares, legendarios
   y excepciones por generación (Gen 1-5), con fuentes y sin inferir del dex.
2. Diseño de un `BreedingCompatibilityProvider` real, sustituyendo al proveedor
   de pruebas sin cambiar el motor.
3. Definición de las decisiones pendientes de PG-08D (destino, capacidad,
   acumulación offline, herencia) como decisiones explícitas del usuario.
4. Spike aislado con PKHeX.Core: generar un huevo en memoria y validar su
   legalidad, sin escribir archivos PKM ni saves.
5. Diseño de la integración con la Guardería tamagotchi sin tocar el motor actual.

## Fuera de alcance propuesto

Servidor público, cuentas reales, intercambio entre jugadores, Guardipuntos,
tienda, monetización, herencia genética y exportación a saves.

## Criterio de cierre propuesto

Todas las decisiones pendientes resueltas por escrito, proveedor real con
datos verificables, spike PKHeX documentado y `bun run check` en EXIT 0.
