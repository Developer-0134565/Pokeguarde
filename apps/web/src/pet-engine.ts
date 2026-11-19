// Motor de la Guardería: simulación determinista, sin DOM y sin relojes propios.
// Todo el estado se deriva de (estado previo, perfil, marcas de tiempo), así que
// el servidor y el navegador llegan al mismo resultado con el mismo `now`.
//
// Los textos visibles salen de `i18n.ts`. Los exports de etiquetas
// (`STAT_LABELS`, `ACTION_INFO`, `TRAIN_GAMES`, `MOOD_LABEL`) se construyen al
// cargar el módulo para no romper la API; la UI debe preferir los helpers
// dinámicos (`statLabel`, `actionLabel`, `trainLabel`, `moodLabel`) porque
// reflejan el idioma activo en el momento de pintar.
import { t } from "./i18n.ts";

export const ENGINE_VERSION = 1;

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

/** Tope de puesta al día: más allá de 7 días se simula solo una semana. */
export const MAX_CATCHUP_MS = 7 * DAY;

export type StatIndex = 0 | 1 | 2 | 3 | 4 | 5;

/** Orden de stats de PKHeX: PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad. */
export const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
/** Abreviaturas en el idioma activo al cargar (es por defecto). */
export const STAT_LABELS: readonly string[] = STAT_KEYS.map((key) => t(`statshort.${key}`));

/** Abreviatura (PS, ATQ…) del stat, en el idioma activo. */
export const statLabel = (i: StatIndex): string => t(`statshort.${STAT_KEYS[i]}`);
/** Nombre largo (PS, Ataque…) del stat, en el idioma activo. */
export const statName = (i: StatIndex): string => t(`statname.${STAT_KEYS[i]}`);

export type PetProfile = {
  species: number;
  speciesName: string;
  nickname: string;
  level: number;
  /** Naturaleza en inglés tal y como la da PKHeX (`Adamant`, `Timid`, …). */
  nature: string | null;
  /** Los 6 IV/DV. Nunca se modifican: solo modulan el comportamiento. */
  ivs: number[];
  /** EVs (Gen 3+) o stat exp (Gen 1-2) que ya tenía el Pokémon en el save. */
  baseEvs: number[];
  generation: number;
  pid: number;
  ot?: string | null;
  shiny?: boolean;
  gender?: number | null;
  metLocationName?: string | null;
  /** Rasgos derivados de la especie (deterministas). */
  traits: Traits;
};

export type Traits = {
  appetite: number;
  efficiency: number;
  cleanliness: number;
  sociability: number;
  activity: number;
  nocturne: boolean;
};

export type PetLogEntry = { at: number; kind: string; text: string };

export type PetState = {
  version: number;
  bornAt: number;
  updatedAt: number;
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  discipline: number;
  sleepiness: number;
  weight: number;
  sleeping: boolean;
  /** EV/stat exp acumulados por entrenamiento, pendientes de escribir en el save. */
  pendingEvs: number[];
  sessions: number;
  points: number;
  lastActionAt: Record<string, number>;
  log: PetLogEntry[];
};

export type ActionResult = {
  ok: boolean;
  state: PetState;
  message: string;
  /** Milisegundos que faltan para poder repetir la acción (0 si se aplicó). */
  cooldownLeft: number;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------ */
/* Rasgos deterministas                                                */
/* ------------------------------------------------------------------ */

function mix(n: number): number {
  let x = n >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function unit(seed: number): number {
  return mix(seed) / 0xffffffff;
}

/**
 * Rasgos estables por especie. No es una tabla de 649 entradas: es una función
 * determinista de la especie, documentada como aproximación coherente.
 */
export function traitsOf(species: number): Traits {
  const base = mix(Math.imul(species + 1, 0x9e3779b1));
  return {
    appetite: round1(0.85 + unit(base + 1) * 0.35),
    efficiency: round1(0.85 + unit(base + 2) * 0.35),
    cleanliness: round1(0.85 + unit(base + 3) * 0.35),
    sociability: round1(0.8 + unit(base + 4) * 0.45),
    activity: round1(0.85 + unit(base + 5) * 0.35),
    nocturne: unit(base + 6) > 0.82,
  };
}

/* ------------------------------------------------------------------ */
/* Naturalezas                                                        */
/* ------------------------------------------------------------------ */

type NatureMods = { appetite: number; activity: number; mood: number };

const NEUTRAL: NatureMods = { appetite: 1, activity: 1, mood: 1 };

const NATURE_MODS: Record<string, Partial<NatureMods>> = {
  Lonely: { mood: 1.08 },
  Brave: { appetite: 1.12, activity: 1.06 },
  Adamant: { appetite: 1.12 },
  Naughty: { appetite: 1.1, mood: 1.06 },
  Bold: { activity: 0.92, mood: 0.96 },
  Relaxed: { activity: 0.9, appetite: 1.05 },
  Impish: { activity: 0.94 },
  Lax: { activity: 0.9, appetite: 1.08 },
  Timid: { activity: 1.14, mood: 1.04 },
  Hasty: { activity: 1.12 },
  Jolly: { activity: 1.1, mood: 0.94 },
  Naive: { activity: 1.08, mood: 1.06 },
  Modest: { mood: 1.08 },
  Mild: { appetite: 1.06, mood: 1.06 },
  Quiet: { activity: 0.9, mood: 0.94 },
  Bashful: {},
  Rash: { appetite: 1.06, mood: 1.08 },
  Calm: { mood: 0.9 },
  Gentle: { mood: 0.92 },
  Sassy: { mood: 0.94, activity: 0.94 },
  Careful: { mood: 0.92 },
  Quirky: {},
  Hardy: {},
  Docile: {},
  Serious: {},
};

export function natureMods(nature: string | null): NatureMods {
  if (!nature) return NEUTRAL;
  return { ...NEUTRAL, ...(NATURE_MODS[nature] ?? {}) };
}

/* ------------------------------------------------------------------ */
/* Estado inicial                                                     */
/* ------------------------------------------------------------------ */

export function createState(profile: PetProfile, now: number): PetState {
  const vigor = vigorOf(profile);
  return {
    version: ENGINE_VERSION,
    bornAt: now,
    updatedAt: now,
    hunger: 82,
    happiness: 70 + Math.round(profile.traits.sociability * 8),
    energy: clamp(88 + vigor * 8),
    hygiene: 90,
    discipline: 55,
    sleepiness: 18,
    weight: idealWeight(profile),
    sleeping: false,
    pendingEvs: [0, 0, 0, 0, 0, 0],
    sessions: 0,
    points: 0,
    lastActionAt: {},
    log: [{ at: now, kind: "adopcion", text: t("msg.adopted", { name: profile.nickname || profile.speciesName }) }],
  };
}

/** 0..1 a partir de la suma de IV (máx. 186). */
export function vigorOf(profile: PetProfile): number {
  const sum = (profile.ivs ?? []).slice(0, 6).reduce((a, b) => a + (Number(b) || 0), 0);
  return Math.min(1, Math.max(0, sum / 186));
}

function idealWeight(profile: PetProfile): number {
  const base = 2 + (profile.species % 420) / 42;
  return round1(base + profile.level / 32 + profile.traits.appetite * 0.6);
}

/* ------------------------------------------------------------------ */
/* Simulación                                                         */
/* ------------------------------------------------------------------ */

export type Extra = { nowHour?: number };

/**
 * Pone el estado al día hasta `now`. Integra en tramos de 15 minutos para que
 * los umbrales (dormirse, despertar, hambre crítica) se comporten igual con un
 * tick corto que tras una semana cerrada.
 */
export function advance(state: PetState, profile: PetProfile, now: number): PetState {
  if (!Number.isFinite(now) || now <= state.updatedAt) return state;

  const total = now - state.updatedAt;
  const window = Math.min(total, MAX_CATCHUP_MS);
  let cursor = now - window;

  const next: PetState = { ...state, log: state.log.slice(), lastActionAt: { ...state.lastActionAt } };
  const traits = profile.traits;
  const nature = natureMods(profile.nature);
  const vigor = vigorOf(profile);
  const efficiency = traits.efficiency * (0.86 + 0.28 * vigor);
  const maturity = clamp(profile.level, 1, 100) / 100;

  let remaining = window;
  let collapsed = false;
  let woke = false;
  let starving = false;

  while (remaining > 0.5) {
    const chunk = Math.min(remaining, 15 * 60_000);
    remaining -= chunk;
    const hours = chunk / HOUR;
    cursor += chunk;

    const hourOfDay = new Date(cursor).getHours();
    const night = hourOfDay >= 22 || hourOfDay < 7;

    if (next.sleeping) {
      next.energy = clamp(next.energy + 15 * efficiency * hours);
      next.sleepiness = clamp(next.sleepiness - 26 * hours);
      next.hunger = clamp(next.hunger - 1.7 * traits.appetite * nature.appetite * hours);
      next.hygiene = clamp(next.hygiene - 1.1 * traits.cleanliness * hours);
      next.happiness = clamp(next.happiness + 0.6 * hours * (next.energy > 40 ? 1 : 0.2));
      if (next.energy >= 99.5 || next.sleepiness <= 0) {
        next.sleeping = false;
        next.energy = clamp(next.energy);
        next.log.push({ at: cursor, kind: "despertar", text: t("msg.wokeUp", { name: label(profile) }) });
        woke = true;
      }
    } else {
      next.hunger = clamp(next.hunger - 3.6 * traits.appetite * nature.appetite * hours);
      next.hygiene = clamp(next.hygiene - 3.0 * traits.cleanliness * hours);
      next.energy = clamp(
        next.energy - (4.2 * traits.activity * nature.activity * (1.12 - 0.24 * maturity)) / efficiency * hours,
      );
      const tiredRate = traits.nocturne && night ? 2.8 : 6.2;
      next.sleepiness = clamp(next.sleepiness + tiredRate * hours);
      next.discipline = clamp(next.discipline - 0.55 * hours);

      if (next.energy <= 0.5) {
        next.sleeping = true;
        next.energy = 0;
        next.discipline = clamp(next.discipline - 2);
        next.log.push({ at: cursor, kind: "agotado", text: t("msg.collapsed", { name: label(profile) }) });
        collapsed = true;
      }
    }

    if (next.hunger <= 0.5 && !starving) {
      starving = true;
      next.happiness = clamp(next.happiness - 4);
      next.log.push({ at: cursor, kind: "hambre", text: t("msg.starving", { name: label(profile) }) });
    }

    // La felicidad persigue el estado real de las necesidades, no un número fijo.
    const target = clamp(
      Math.min(next.hunger, next.hygiene) * 0.45 + next.energy * 0.3 + next.discipline * 0.15 + 12,
    );
    const moodRate = 2.4 * nature.mood * hours;
    next.happiness = clamp(next.happiness + clamp(target - next.happiness, -moodRate, moodRate));

    if (next.sleeping) next.discipline = clamp(next.discipline - 0.15 * hours);

    const ideal = idealWeight(profile);
    next.weight = round1(next.weight + (ideal - next.weight) * 0.02 * hours);
    next.points = Math.min(9999, next.points + 0.15 * hours);
  }

  next.updatedAt = now;
  if (woke && collapsed) next.log.push({ at: now, kind: "nota", text: t("msg.sleepCycle") });
  if (total > MAX_CATCHUP_MS) {
    next.log.push({ at: now, kind: "nota", text: t("msg.catchup") });
  }
  next.log = next.log.slice(-40);
  return next;
}

function label(profile: PetProfile): string {
  return profile.nickname || profile.speciesName;
}

/* ------------------------------------------------------------------ */
/* Acciones                                                           */
/* ------------------------------------------------------------------ */

export type ActionId = "feed" | "play" | "clean" | "pet" | "scold" | "sleep" | "wake";

export const ACTION_INFO: Record<ActionId, { label: string; cooldown: number }> = {
  feed: { label: t("action.feed"), cooldown: 15 * 60_000 },
  play: { label: t("action.play"), cooldown: 8 * 60_000 },
  clean: { label: t("action.clean"), cooldown: 20 * 60_000 },
  pet: { label: t("action.pet"), cooldown: 90_000 },
  scold: { label: t("action.scold"), cooldown: 4 * 60_000 },
  sleep: { label: t("action.sleep"), cooldown: 0 },
  wake: { label: t("action.wake"), cooldown: 0 },
};

/** Etiqueta del botón de acción, en el idioma activo. */
export const actionLabel = (action: ActionId): string => t(`action.${action}`);

export function applyAction(
  state: PetState,
  profile: PetProfile,
  action: ActionId,
  now: number,
): ActionResult {
  const s = advance(state, profile, now);
  const info = ACTION_INFO[action];
  if (!info) return { ok: false, state: s, message: t("msg.unknownAction"), cooldownLeft: 0 };

  if (info.cooldown > 0) {
    const last = s.lastActionAt[action] ?? 0;
    const left = last + info.cooldown - now;
    if (left > 0) {
      return {
        ok: false,
        state: s,
        message: t("msg.cooldown", {
          min: Math.ceil(left / 60000),
          action: actionLabel(action).toLowerCase(),
        }),
        cooldownLeft: left,
      };
    }
  }

  const next: PetState = { ...s, lastActionAt: { ...s.lastActionAt }, log: s.log.slice() };
  const name = label(profile);
  const traits = profile.traits;
  let message = "";

  switch (action) {
    case "feed": {
      if (next.sleeping) return { ok: false, state: s, message: t("msg.sleeping", { name }), cooldownLeft: 0 };
      if (next.hunger > 92) return { ok: false, state: s, message: t("msg.full", { name }), cooldownLeft: 0 };
      next.hunger = clamp(next.hunger + 26 * (1.12 - 0.1 * traits.appetite));
      next.happiness = clamp(next.happiness + 4);
      next.hygiene = clamp(next.hygiene - 5);
      next.weight = round1(next.weight + 0.18);
      next.energy = clamp(next.energy + 3);
      message = t("msg.ate", { name });
      break;
    }
    case "play": {
      if (next.sleeping) return { ok: false, state: s, message: t("msg.sleeping", { name }), cooldownLeft: 0 };
      if (next.energy < 20) return { ok: false, state: s, message: t("msg.tooTiredPlay", { name }), cooldownLeft: 0 };
      const gain = 12 * traits.sociability;
      next.happiness = clamp(next.happiness + gain);
      next.energy = clamp(next.energy - 9);
      next.hygiene = clamp(next.hygiene - 6);
      next.discipline = clamp(next.discipline + 1.5);
      next.sleepiness = clamp(next.sleepiness + 6);
      message = t("msg.played", { name });
      break;
    }
    case "clean": {
      next.hygiene = clamp(next.hygiene + 45);
      next.happiness = clamp(next.happiness + 2);
      next.energy = clamp(next.energy - 3);
      message = t("msg.clean", { name });
      break;
    }
    case "pet": {
      if (next.sleeping) return { ok: false, state: s, message: t("msg.dontDisturb", { name }), cooldownLeft: 0 };
      next.happiness = clamp(next.happiness + 5);
      next.discipline = clamp(next.discipline + 1);
      next.sleepiness = clamp(next.sleepiness + 2);
      message = t("msg.petted", { name });
      break;
    }
    case "scold": {
      if (next.discipline >= 85) return { ok: false, state: s, message: t("msg.obeys", { name }), cooldownLeft: 0 };
      next.discipline = clamp(next.discipline + 12);
      next.happiness = clamp(next.happiness - 10);
      message = t("msg.scolded", { name });
      break;
    }
    case "sleep": {
      if (next.sleeping) return { ok: false, state: s, message: t("msg.alreadySleeping", { name }), cooldownLeft: 0 };
      next.sleeping = true;
      message = t("msg.curledUp", { name });
      break;
    }
    case "wake": {
      if (!next.sleeping) return { ok: false, state: s, message: t("msg.alreadyAwake", { name }), cooldownLeft: 0 };
      next.sleeping = false;
      if (next.energy < 30) next.happiness = clamp(next.happiness - 5);
      message = t("msg.woke", { name });
      break;
    }
  }

  next.lastActionAt[action] = now;
  next.updatedAt = now;
  next.log.push({ at: now, kind: action, text: message });
  next.log = next.log.slice(-40);
  return { ok: true, state: next, message, cooldownLeft: 0 };
}

/* ------------------------------------------------------------------ */
/* Entrenamiento                                                      */
/* ------------------------------------------------------------------ */

export type TrainGame = { stat: StatIndex; label: string; hint: string };

/** Etiqueta del minijuego, en el idioma activo. */
export const trainLabel = (stat: StatIndex): string => t(`train.${stat}.label`);
/** Pista/stat del minijuego, en el idioma activo. */
export const trainHint = (stat: StatIndex): string => t(`train.${stat}.hint`);

export const TRAIN_GAMES: TrainGame[] = [0, 1, 2, 3, 4, 5].map((stat) => ({
  stat: stat as StatIndex,
  label: trainLabel(stat as StatIndex),
  hint: trainHint(stat as StatIndex),
}));

export const TRAIN_COOLDOWN = 45_000;

export type Caps = {
  /** Tope por stat. */
  perStat: number;
  /** Tope global de EVs (0 = sin tope global, Gen 1-2). */
  total: number;
  unit: "ev" | "statexp";
};

export function capsFor(profile: PetProfile): Caps {
  return profile.generation >= 3
    ? { perStat: 255, total: 510, unit: "ev" }
    : { perStat: 65535, total: 0, unit: "statexp" };
}

export function evTotals(profile: PetProfile, state: PetState) {
  const caps = capsFor(profile);
  const current = [0, 1, 2, 3, 4, 5].map(
    (i) => (Number(profile.baseEvs?.[i]) || 0) + (Number(state.pendingEvs?.[i]) || 0),
  );
  const total = current.reduce((a, b) => a + b, 0);
  return { caps, current, total };
}

export type TrainResult = {
  ok: boolean;
  state: PetState;
  granted: number;
  capped: boolean;
  message: string;
};

/**
 * Suma EVs/stat exp reales al Pokémon. `score` es 0..1 y lo produce el minijuego.
 * Nunca supera los topes legales: si el Pokémon ya está al máximo, no concede.
 */
export function train(
  state: PetState,
  profile: PetProfile,
  stat: StatIndex,
  score: number,
  now: number,
): TrainResult {
  const s = advance(state, profile, now);

  if (s.sleeping) return { ok: false, state: s, granted: 0, capped: false, message: t("msg.trainSleeping") };
  if (s.energy < 15) return { ok: false, state: s, granted: 0, capped: false, message: t("msg.trainTired") };
  if (s.hunger < 10) return { ok: false, state: s, granted: 0, capped: false, message: t("msg.trainHungry") };

  const last = s.lastActionAt.train ?? 0;
  const left = last + TRAIN_COOLDOWN - now;
  if (left > 0) {
    return { ok: false, state: s, granted: 0, capped: false, message: t("msg.trainCooldown", { n: Math.ceil(left / 1000) }) };
  }

  const q = Math.min(1, Math.max(0, score));
  const { caps, current, total } = evTotals(profile, s);

  let grant = caps.unit === "ev" ? Math.round(2 + 6 * q) : Math.round(250 + 750 * q);

  // Rendimiento: cansado o sucio rinde menos.
  const condition = (s.energy / 100) * 0.6 + (s.hygiene / 100) * 0.25 + (s.happiness / 100) * 0.15;
  grant = Math.round(grant * (0.55 + 0.45 * condition));
  grant = Math.max(1, grant);

  const roomStat = caps.perStat - current[stat];
  const roomTotal = caps.total > 0 ? caps.total - total : Infinity;
  const allowed = Math.max(0, Math.min(grant, roomStat, roomTotal));
  const capped = allowed < grant;

  if (allowed <= 0) {
    return {
      ok: false,
      state: s,
      granted: 0,
      capped: true,
      message:
        caps.unit === "ev"
          ? t("msg.trainMaxEv")
          : t("msg.trainMaxStatexp"),
    };
  }

  const next: PetState = {
    ...s,
    pendingEvs: s.pendingEvs.slice(),
    lastActionAt: { ...s.lastActionAt },
    log: s.log.slice(),
  };
  next.pendingEvs[stat] = (next.pendingEvs[stat] ?? 0) + allowed;
  next.energy = clamp(next.energy - 12);
  next.hunger = clamp(next.hunger - 7);
  next.hygiene = clamp(next.hygiene - 6);
  next.happiness = clamp(next.happiness + 7 * q);
  next.discipline = clamp(next.discipline + 1);
  next.sessions += 1;
  next.points = Math.min(9999, next.points + Math.round(20 + 80 * q));
  next.lastActionAt.train = now;
  next.updatedAt = now;

  const unit = caps.unit === "ev" ? t("unit.ev") : t("unit.statexp");
  const message = t("msg.trainGranted", {
    n: allowed,
    unit,
    stat: statLabel(stat),
    suffix: capped ? t("msg.cappedSuffix") : "",
  });
  next.log.push({ at: now, kind: "entreno", text: message });
  next.log = next.log.slice(-40);

  return { ok: true, state: next, granted: allowed, capped, message };
}

/* ------------------------------------------------------------------ */
/* Lectura del estado                                                 */
/* ------------------------------------------------------------------ */

export type Mood = "dormido" | "hambriento" | "sucio" | "agotado" | "feliz" | "triste" | "normal";

export function moodOf(state: PetState): Mood {
  if (state.sleeping) return "dormido";
  if (state.hunger < 25) return "hambriento";
  if (state.hygiene < 25) return "sucio";
  if (state.energy < 20) return "agotado";
  if (state.happiness >= 75 && state.hunger > 50 && state.hygiene > 50) return "feliz";
  if (state.happiness < 30) return "triste";
  return "normal";
}

export const MOOD_LABEL: Record<Mood, string> = {
  dormido: t("mood.dormido"),
  hambriento: t("mood.hambriento"),
  sucio: t("mood.sucio"),
  agotado: t("mood.agotado"),
  feliz: t("mood.feliz"),
  triste: t("mood.triste"),
  normal: t("mood.normal"),
};

/** Etiqueta del ánimo, en el idioma activo. */
export const moodLabel = (mood: Mood): string => t(`mood.${mood}`);

export function ageDays(state: PetState, now: number): number {
  return Math.max(0, (now - state.bornAt) / DAY);
}
