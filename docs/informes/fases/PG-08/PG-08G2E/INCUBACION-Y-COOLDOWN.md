# PG-08G.2E — INCUBACIÓN Y COOLDOWN

## 1. Decisión BR-06

- El cooldown de incubación comienza **al entrar el huevo en el inventario**.
- Se utiliza exclusivamente una duración previamente aprobada.
- No se inventa un nuevo cooldown.
- C4 permanece diferido: no se crea contador de incubación simultánea.

## 2. Evidencia verificada

No se ha localizado en los documentos de PG-08A–G ni en el código una
«duración previamente aprobada» para el cooldown de incubación de huevos.

Fuentes consultadas sin resultado:

- `PG-08D/03-POLITICA-INTERVALOS.md`: tabla de intervalos de **producción**,
  de 1 a 12 horas, marcada como simulación provisional; no es incubación.
- `PG-08E/01-CONTRATO-DEL-HUEVO.md`: `hatched:false`, sin duración.
- `PG-08F/RIESGOS-Y-DECISIONES.md`: «sin eclosión», sin duración.
- `PG-08G2/ARQUITECTURA-GENETICA-V2.md` y
  `PG-08G2/CONTRATOS-GENERACIONALES.md`: `hatchLevel` por generación, sin
  tabla de ciclos ni cooldown horario.
- `PG-08G2D/PLAN-PG08G3.md`: declara explícitamente que la tabla de ciclos de
  eclosión por especie no existe en los documentos leídos y debe cerrarse con
  `UNKNOWN_HATCH_CYCLES`.

Los únicos tiempos de enfriamiento presentes en el código son los de acciones
del Tamagotchi (`comer`, `jugar`, `limpiar`, etc.) en `pet-engine.ts`, que no
son aplicables a la incubación de huevos.

## 3. Regla de inicio

El instante de inicio debe ser el de la transición que BR-05 considera
«entrada al inventario». Según la interpretación pendiente documentada en
`PRODUCCION-Y-RECOGIDA.md`:

- opción A: `at` de la transición a `stored`;
- opción B: `at` de `confirmDelivery` / transición a `claimed`;
- opción C: `at` de la transición a `in_inventory`.

En todos los casos, el tiempo se toma del reloj inyectado de la autoridad y se
persiste como `incubationStartedAt`. Un reintento de recogida no puede
reiniciar esa marca.

## 4. Ausencia prolongada en la recogida

Si el huevo se recoge después de una ausencia, el cooldown se inicia con el
`at` real de la recogida confirmada, no con el `producedAt` ni con el tiempo
transcurrido mientras estuvo pendiente. Esto evita que un huevo nazca ya
incubado por el simple hecho de haber estado almacenado mucho tiempo.

Debe conservarse por separado:

- `producedAt`: instante del evento 1+1;
- `collectedAt`: instante de la recogida idempotente;
- `incubationStartedAt`: instante autoritativo de entrada al inventario;
- `hatchProgress`: progreso persistido, derivable del reloj inyectado.

## 5. Duración

**Estado:** `UNRESOLVED`. No se fija ningún valor.

Alternativas:

| Opción | Descripción | Evaluación |
|---|---|---|
| 1 | Reutilizar el intervalo de producción de PG-08D. | No recomendado: mezcla dos conceptos distintos. |
| 2 | Usar la duración que el propietario identifique como aprobada. | Recomendada; requiere referencia documental. |
| 3 | Derivar ciclos por especie de Gen II. | Bloqueada: no hay tabla verificada; `UNKNOWN_HATCH_CYCLES`. |
| 4 | Inventar un valor fijo nuevo. | Prohibido por BR-06. |

Hasta que se resuelva, cualquier implementación futura debe fallar cerrado con
`UNKNOWN_HATCH_COOLDOWN` y no avanzar el progreso de incubación.

## 6. C4

No se crea `ConcurrentIncubationLimit`, no se cuenta cuántos huevos incuban a
la vez y no se infiere C4 = C2. La incubación se modela por marca de tiempo por
huevo, sin cupo concurrente.
