# PG-08D · Intervalos y reloj autoritativo

## Tabla PROVISIONAL de simulación

| Rareza | Intervalo |
|---|---|
| Común (`common`) | 1 hora |
| Poco común (`uncommon`) | 2 horas |
| Raro (`rare`) | 4 horas |
| Muy raro (`very_rare`) | 6 horas |
| Épico (`epic`) | 8 horas |
| Legendario compatible (`legendary_compatible`) | 10 horas |
| Extremo (`extreme`) | 12 horas |
| Desconocida (`unknown`) | 0 → bloquea producción |

**No es una clasificación oficial ni una decisión de balance definitiva.** La
rareza se obtiene del `BreedingCompatibilityProvider`, nunca del número de
Pokédex. Se usa la rareza **máxima** de la pareja.

`clampInterval(ms)` acota a `[1 h, 12 h]`; valores no finitos, cero o negativos
se convierten en 1 h. No existen huevos fraccionarios.

## Reloj

Toda hora sale de `clock.now()`. Las firmas públicas de `start`, `tick`,
`cancel`, `withdraw` y `expel` **no aceptan** parámetro `at`; un intento de
cliente de colar `at` se ignora (prueba 26). El reloj es inyectable para probar
reinicios, saltos temporales y desconexiones sin esperas reales.

## Política offline

- `single` (por defecto): un huevo como máximo por ciclo; al reconstruirse tras
  una desconexión se reinicia el ciclo «desde ahora». No acumula huevos.
- `bounded`: permite hasta `maxPendingEggs` huevos pendientes; cada `tick`
  produce a lo sumo uno y respeta el tope (`EGG_CAP`).

Ambas son configurables y explícitas. **No se ha adoptado** la acumulación
ilimitada de huevos durante desconexiones prolongadas.
