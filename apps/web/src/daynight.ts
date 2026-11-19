// Lógica pura del ciclo día/noche de la habitación. Sin DOM y sin imágenes:
// así se puede probar con `scripts/night-check.ts` y el render solo necesita
// aplicar el resultado (`nightMix` 0..1) como alfa de la capa nocturna.
//
// Regla: es de noche de 20:00 a 06:00 (hora local). Sin imagen nocturna
// cargada el objetivo siempre es 0, así que se mantiene `guarderia.png`.

/** Inicio de la noche, inclusive (20:00). */
export const NIGHT_START_HOUR = 20;
/** Fin de la noche, exclusivo (06:00). */
export const NIGHT_END_HOUR = 6;

/** Duración del fundido día -> noche, en milisegundos (1,2 s). */
export const NIGHT_CROSSFADE_MS = 1200;

/** ¿La hora local indicada (0..23) pertenece a la noche? */
export function isNightHour(hour: number): boolean {
  if (!Number.isFinite(hour)) return false;
  const h = Math.floor(hour);
  return h >= NIGHT_START_HOUR || h < NIGHT_END_HOUR;
}

/**
 * Objetivo del fundido: 1 si toca noche **y** existe la imagen nocturna;
 * 0 en cualquier otro caso (de día, o sin asset todavía).
 */
export function nightTarget(hour: number, hasNightImage: boolean): 0 | 1 {
  return hasNightImage && isNightHour(hour) ? 1 : 0;
}

/**
 * Avanza el fundido hacia `target` a ritmo de `durationMs`. `dtMs` es el tiempo
 * transcurrido desde el fotograma anterior. Nunca se pasa del objetivo.
 */
export function stepMix(
  current: number,
  target: number,
  dtMs: number,
  durationMs: number = NIGHT_CROSSFADE_MS,
): number {
  const from = Math.min(1, Math.max(0, current));
  const to = Math.min(1, Math.max(0, target));
  if (durationMs <= 0) return to;
  if (!Number.isFinite(dtMs) || dtMs <= 0) return from;
  const step = dtMs / durationMs;
  if (from < to) return Math.min(to, from + step);
  if (from > to) return Math.max(to, from - step);
  return from;
}
