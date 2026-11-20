// OC-STITCH-05/06 — shell principal: router, store y Quick Switcher.
// OC-STITCH-06 añade la cabecera y la Homepage canónicas de Stitch.
// La lógica del juego sigue en main.ts/nursery.ts; aquí solo se coordina la
// navegación y se montan vistas visuales. Sin frameworks ni dependencias CDN.

import { DOMAINS, MODULES, type ModuleMeta } from "./registry.js";
import {
  DESTINATIONS,
  destinationForPath,
  pageForRoute,
  createCoreWorkbench,
  createCreatorWorkbench,
  createMarketingWorkbench,
  createEmulationWorkbench,
} from "/assets/pg08/workbenches.js";
import type { PageEntry } from "../pages/catalog.js";
import { createStore } from "./store.js";
import { createRouter, type RouteContext } from "./router.js";
import { renderHome, renderStub } from "./views.js";
import { createSwitcher } from "./switcher.js";
import { createBadge } from "/ui.js";

type ViewKey = "home" | "library" | "nursery" | "sheet" | "stub";

/** Navegación visible de la Homepage canónica; las demás rutas siguen en #pg-nav. */
const STITCH_NAV: readonly { label: string; path: string }[] = [
  { label: "Características", path: "/home" },
  { label: "Guardería", path: "/guarderia" },
  { label: "Compatibilidad Gen I-V", path: "/biblioteca" },
  { label: "Comunidad", path: "/studio/marketing" },
];

/** Los IDs de registro no coinciden con las claves del DOM legacy. */
const VIEW_BY_MODULE_ID: Readonly<Record<string, ViewKey>> = {
  home: "home",
  biblioteca: "library",
  guarderia: "nursery",
  ficha: "sheet",
};

/** Cada página canónica se construye con el workbench de su dominio. */
function workbenchForPage(page: PageEntry, navigate: (path: string) => void): HTMLElement {
  switch (page.domain) {
    case "core":
    case "forensics":
      return createCoreWorkbench(page, navigate);
    case "theme":
    case "creator_shell":
    case "habitat":
      return createCreatorWorkbench(page, navigate);
    case "marketing":
      return createMarketingWorkbench(page, navigate);
    case "emulation":
      return createEmulationWorkbench(page, navigate);
  }
}

export interface ShellHosts {
  home: HTMLElement;
  library: HTMLElement;
  nursery: HTMLElement;
  sheet: HTMLElement;
  stub: HTMLElement;
  header: HTMLElement;
}

export interface ShellCallbacks {
  showHome: () => void;
  showLibrary: () => void;
  restoreLibrary?: (tab?: string) => void;
  showNursery: (preferId?: number) => void;
  showSheet: () => void;
  closeDossier: () => void;
}

export interface ShellOptions extends ShellCallbacks {
  hosts?: Partial<ShellHosts>;
}

export interface Shell {
  router: ReturnType<typeof createRouter>;
  store: ReturnType<typeof createStore>;
  switcher: ReturnType<typeof createSwitcher>;
  destroy: () => void;
}

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export function bootShell(options: ShellOptions): Shell {
  const hosts: ShellHosts = {
    home: options.hosts?.home ?? byId("pg-home"),
    library: options.hosts?.library ?? document.querySelector<HTMLElement>(".layout")!,
    nursery: options.hosts?.nursery ?? byId("nursery"),
    sheet: options.hosts?.sheet ?? byId("sheet"),
    stub: options.hosts?.stub ?? byId("pg-stub"),
    header: options.hosts?.header ?? document.querySelector<HTMLElement>("header.top")!,
  };

  const store = createStore({ modules: DESTINATIONS });
  const cleanups: Array<() => void> = [];
  document.body.classList.add("pg-stitch-06");

  // Submarca de la cabecera canónica. Se añade al DOM en lugar de modificar
  // index.html para no alterar los atributos i18n existentes.
  const brand = hosts.header.querySelector<HTMLElement>(".brand");
  const brandSub = document.createElement("span");
  brandSub.className = "pg-brand-sub";
  brandSub.textContent = "EST. 1999 • ARCHIVE NET";
  brand?.appendChild(brandSub);

  const nav = document.createElement("nav");
  nav.id = "pg-nav";
  nav.className = "pg-nav";
  nav.setAttribute("aria-label", "Navegación principal");
  hosts.header.appendChild(nav);

  const navButtons = new Map<string, HTMLButtonElement>();
  for (const module of MODULES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pg-nav__link";
    button.dataset.route = module.path;
    button.textContent = module.label;
    button.setAttribute("aria-label", module.label);
    if (!module.implemented) button.dataset.pending = "1";
    const badge = createBadge({
      text: module.domain,
      tone: module.implemented ? "info" : "neutral",
    });
    badge.element.classList.add("pg-nav__badge");
    button.appendChild(badge.element);
    nav.appendChild(button);
    navButtons.set(module.path, button);
  }

  const domainBar = document.createElement("div");
  domainBar.className = "pg-domains";
  domainBar.setAttribute("aria-label", "Dominios de la suite");
  for (const domain of DOMAINS) {
    const chip = document.createElement("span");
    chip.className = "pg-domain";
    chip.textContent = domain;
    domainBar.appendChild(chip);
  }
  hosts.header.appendChild(domainBar);

  // Cabecera visible reconstruida desde la Homepage canónica de Stitch.
  // La cabecera legacy permanece en el DOM por los contratos PG-07/OC-STITCH-05.
  const shellHead = document.createElement("div");
  shellHead.className = "pg-shell-head";
  const headMeta = document.createElement("div");
  headMeta.className = "pg-shell-head__meta";
  for (const [text, tone] of [
    ["OS Ver 2.44 EXP", "red"],
    ["MODEL: PKG-02", "blue"],
    ["● ONLINE", "amber"],
  ] as const) {
    const badge = document.createElement("span");
    badge.className = `pg-shell-head__badge pg-shell-head__badge--${tone}`;
    badge.textContent = text;
    headMeta.appendChild(badge);
  }
  const stitchNav = document.createElement("nav");
  stitchNav.className = "pg-shell-nav";
  stitchNav.setAttribute("aria-label", "Navegación Pocket Tech 1999");
  const stitchNavButtons = new Map<string, HTMLButtonElement>();
  for (const item of STITCH_NAV) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pg-shell-nav__link";
    button.dataset.route = item.path;
    button.textContent = item.label;
    stitchNav.appendChild(button);
    stitchNavButtons.set(item.path, button);
  }
  const login = document.createElement("button");
  login.type = "button";
  login.className = "pg-shell-login";
  login.textContent = "Iniciar Sesión";
  login.disabled = true;
  login.title = "Maqueta visual: el modo local no usa cuentas";
  login.setAttribute("aria-label", "Iniciar Sesión (maqueta visual, modo local sin cuentas)");
  shellHead.append(headMeta, stitchNav, login);
  hosts.header.insertBefore(shellHead, byId("pg-switcher"));

  const views: Record<ViewKey, HTMLElement> = {
    home: hosts.home,
    library: hosts.library,
    nursery: hosts.nursery,
    sheet: hosts.sheet,
    stub: hosts.stub,
  };

  let stubDestination: ModuleMeta | undefined;
  let stubPage: PageEntry | undefined;
  let stubPath = "/home";

  function paintStub() {
    if (stubPage) {
      hosts.stub.replaceChildren(workbenchForPage(stubPage, navigate));
      return;
    }
    hosts.stub.replaceChildren(renderStub(stubDestination, stubPath));
  }

  function showOnly(view: ViewKey) {
    for (const [key, node] of Object.entries(views) as Array<[ViewKey, HTMLElement]>) {
      node.classList.toggle("hidden", key !== view);
    }
  }

  function markActive(path: string) {
    for (const [route, button] of navButtons) {
      const active = route === path;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    for (const [route, button] of stitchNavButtons) {
      const active = route === path;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  }

  function applyRoute(ctx: RouteContext, view: ViewKey) {
    showOnly(view);
    store.update({
      route: ctx.path,
      previousRoute: ctx.previous,
      activeDomain: destinationForPath(ctx.path)?.domain ?? "all",
      notice: null,
    });
    markActive(ctx.path);
  }

  const handlers: Record<string, (ctx: RouteContext) => void> = {};
  for (const destination of DESTINATIONS) {
    handlers[destination.path] = (ctx) => {
      const legacyView = VIEW_BY_MODULE_ID[destination.id];
      if (legacyView) {
        if (destination.id === "home") options.showHome();
        else if (destination.id === "biblioteca") options.showLibrary();
        else if (destination.id === "guarderia") options.showNursery();
        else if (destination.id === "ficha") options.showSheet();
        applyRoute(ctx, legacyView);
        return;
      }
      if (destination.path === "/biblioteca/equipo") {
        options.restoreLibrary?.("equipo");
        applyRoute(ctx, "library");
        return;
      }
      const page = pageForRoute(destination.path);
      if (!page) {
        stubDestination = destination;
        stubPage = undefined;
        stubPath = ctx.path;
        paintStub();
        applyRoute(ctx, "stub");
        store.update({ notice: `Sin página registrada: ${ctx.path}` });
        return;
      }
      stubDestination = destination;
      stubPage = page;
      stubPath = ctx.path;
      paintStub();
      applyRoute(ctx, "stub");
    };
  }

  const navigate = (path: string) => router.navigate(path);
  const router = createRouter({
    routes: handlers,
    fallback: "/home",
    onUnknown: (ctx) => {
      stubDestination = undefined;
      stubPage = undefined;
      stubPath = ctx.path;
      paintStub();
      applyRoute(ctx, "stub");
      store.update({ notice: `Ruta desconocida: ${ctx.path}` });
    },
  });

  hosts.home.appendChild(renderHome(navigate));
  paintStub();

  const switcher = createSwitcher({ store, navigate });

  const onNavClick = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-route]");
    if (button?.dataset.route) navigate(button.dataset.route);
  };
  nav.addEventListener("click", onNavClick);
  cleanups.push(() => nav.removeEventListener("click", onNavClick));
  stitchNav.addEventListener("click", onNavClick);
  cleanups.push(() => stitchNav.removeEventListener("click", onNavClick));

  const onSwitcherClick = () => window.dispatchEvent(new CustomEvent("pg:switcher-open"));
  const switcherButton = document.getElementById("pg-switcher");
  switcherButton?.addEventListener("click", onSwitcherClick);
  if (switcherButton) cleanups.push(() => switcherButton.removeEventListener("click", onSwitcherClick));

  // La navegación legacy sigue existiendo para los contratos PG-07; el shell
  // la redirige al router para que haya una única fuente de verdad de ruta.
  const legacyLibrary = document.getElementById("nav-library") as HTMLButtonElement | null;
  const legacyNursery = document.getElementById("nav-nursery") as HTMLButtonElement | null;
  const legacySheet = document.getElementById("nav-sheet") as HTMLButtonElement | null;
  if (legacyLibrary) legacyLibrary.onclick = () => navigate("/biblioteca");
  if (legacyNursery) legacyNursery.onclick = () => navigate("/guarderia");
  if (legacySheet) legacySheet.onclick = () => navigate("/ficha");

  const unsubscribe = store.subscribe((state) => {
    if (state.notice) hosts.stub.dataset.notice = state.notice;
    else delete hosts.stub.dataset.notice;
  });
  cleanups.push(unsubscribe);

  router.start();
  markActive(router.current());

  const destroy = () => {
    router.stop();
    switcher.destroy();
    cleanups.forEach((fn) => fn());
    nav.remove();
    domainBar.remove();
    shellHead.remove();
    brandSub.remove();
    document.body.classList.remove("pg-stitch-06");
    store.clear();
    if ((window as unknown as { pgShell?: Shell }).pgShell === shell) {
      delete (window as unknown as { pgShell?: Shell }).pgShell;
    }
  };

  const shell: Shell = { router, store, switcher, destroy };
  (window as unknown as { pgShell?: Shell }).pgShell = shell;
  return shell;
}
