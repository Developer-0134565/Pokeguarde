// OC-STITCH-05 — store ligero y tipado del armazón web.
// Guarda exclusivamente estado de navegación/interfaz. El estado de mascotas,
// saves e inventarios sigue viviendo en el motor y en la API existente.

import type { Domain, ModuleMeta } from "./registry.js";
import { MODULES } from "./registry.js";

export interface Preferences {
  readonly reduceMotion: boolean;
}

export interface AppState {
  readonly route: string;
  readonly previousRoute: string | null;
  readonly switcherOpen: boolean;
  readonly switcherQuery: string;
  readonly activeDomain: Domain | "all";
  readonly preferences: Preferences;
  readonly modules: readonly ModuleMeta[];
  readonly notice: string | null;
}

export type Listener = (state: AppState, previous: AppState) => void;
export type StateUpdate = Partial<AppState> | ((state: AppState) => Partial<AppState>);

export interface Store {
  getState(): AppState;
  update(patch: StateUpdate): AppState;
  subscribe(listener: Listener): () => void;
  clear(): void;
}

export function createStore(initial: Partial<AppState> = {}): Store {
  let state: AppState = {
    route: "/home",
    previousRoute: null,
    switcherOpen: false,
    switcherQuery: "",
    activeDomain: "all",
    preferences: { reduceMotion: false },
    modules: MODULES,
    notice: null,
    ...initial,
  };
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    update(patch) {
      const previous = state;
      const changes = typeof patch === "function" ? patch(state) : patch;
      state = { ...state, ...changes };
      for (const listener of [...listeners]) listener(state, previous);
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear() {
      listeners.clear();
    },
  };
}
