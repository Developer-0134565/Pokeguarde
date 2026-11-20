// OC-STITCH-05 — router hash ligero, sin frameworks y sin recargas.
// El entorno es inyectable para poder probarlo sin DOM.

export interface RouteContext {
  readonly path: string;
  readonly previous: string | null;
  readonly unknown: boolean;
}

export type RouteHandler = (context: RouteContext) => void;

export interface RouterEnv {
  getHash(): string;
  setHash(hash: string): void;
  onHashChange(handler: () => void): () => void;
}

export interface RouterOptions {
  readonly routes: Readonly<Record<string, RouteHandler>>;
  readonly fallback: string;
  /** Si existe, gestiona por completo las rutas desconocidas. */
  readonly onUnknown?: RouteHandler;
  readonly env?: RouterEnv;
}

export interface Router {
  start(): void;
  stop(): void;
  navigate(path: string): void;
  current(): string;
  isKnown(path: string): boolean;
}

export function normalizePath(input: string): string {
  const raw = input.trim().replace(/^#/, "");
  if (!raw || raw === "/") return "/home";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.replace(/\/+$/, "") || "/home";
}

function browserEnv(): RouterEnv {
  return {
    getHash: () => globalThis.location?.hash ?? "",
    setHash: (hash) => {
      if (globalThis.location) globalThis.location.hash = hash;
    },
    onHashChange: (handler) => {
      globalThis.addEventListener?.("hashchange", handler);
      return () => globalThis.removeEventListener?.("hashchange", handler);
    },
  };
}

export function createRouter(options: RouterOptions): Router {
  const env = options.env ?? browserEnv();
  const routes = new Map(Object.entries(options.routes));
  let currentPath = normalizePath(env.getHash());
  let previousPath: string | null = null;
  let unwatch: (() => void) | null = null;
  let running = false;

  const render = (): void => {
    const path = normalizePath(env.getHash());
    const unknown = !routes.has(path);
    const context: RouteContext = { path, previous: previousPath, unknown };
    previousPath = path;
    currentPath = path;
    if (unknown) {
      if (options.onUnknown) options.onUnknown(context);
      else routes.get(options.fallback)?.(context);
      return;
    }
    routes.get(path)?.(context);
  };

  return {
    start() {
      if (running) return;
      running = true;
      unwatch = env.onHashChange(render);
      render();
    },
    stop() {
      if (!running) return;
      unwatch?.();
      unwatch = null;
      running = false;
    },
    navigate(path) {
      const next = normalizePath(path);
      const hash = `#${next}`;
      if (env.getHash() === hash) render();
      else env.setHash(hash);
    },
    current: () => currentPath,
    isKnown: (path) => routes.has(normalizePath(path)),
  };
}
