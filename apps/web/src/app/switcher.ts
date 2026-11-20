// OC-STITCH-05 — Quick Switcher global inspirado en el Bus Switcher de Stitch.
// Comone primitivas de OC-STITCH-04; no ejecuta comandos ni acciones de juego.

import { createBadge, createDialog, createField } from "/ui.js";
import type { Domain, ModuleMeta } from "./registry.js";
import { DOMAINS, filterModules } from "./registry.js";
import type { Store } from "./store.js";

export interface SwitcherOptions {
  readonly store: Store;
  readonly navigate: (path: string) => void;
}

export interface Switcher {
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
}

function node<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

export function createSwitcher(options: SwitcherOptions): Switcher {
  const { store, navigate } = options;
  const input = node("input", "pg-switcher__input");
  input.type = "search";
  input.placeholder = "Escribe una pantalla, slug o comando...";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Buscar destinos de navegación");
  input.id = `pg-switcher-input-${Math.random().toString(36).slice(2, 8)}`;

  const field = createField({
    label: "Ir a…",
    control: input,
    hint: "Flechas para elegir · Enter para navegar · Esc para cerrar",
  });

  const tabs = node("div", "pg-switcher__domains");
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "Filtrar por dominio");

  const list = node("ul", "pg-switcher__results");
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Destinos disponibles");

  const status = node("p", "pg-switcher__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const content = node("div", "pg-switcher");
  const chassis = node("div", "pg-switcher__chassis");
  const sidebar = node("aside", "pg-switcher__sidebar");
  sidebar.setAttribute("aria-hidden", "true");
  sidebar.append(
    node("span", "pg-switcher__side-brand", "POKEGUARDE"),
    node("span", "pg-switcher__side-sub", "STUDIO CHASSIS v2.4"),
    node("span", "pg-switcher__side-bus", "CARTRIDGE BUS"),
  );
  const sideDomains = node("div", "pg-switcher__side-domains");
  for (const domain of DOMAINS) sideDomains.appendChild(node("span", "pg-switcher__side-domain", domain));
  sidebar.appendChild(sideDomains);

  const main = node("div", "pg-switcher__main");
  main.appendChild(node("h2", "pg-switcher__title", "POKEGUARDE BUS SWITCHER"));
  main.appendChild(node("p", "pg-switcher__subtitle", "UNIVERSAL NAVIGATION & TELEPORT ENGINE // MODEL: BUS-99"));
  const header = node("div", "pg-switcher__head");
  const inputRow = node("div", "pg-switcher__input-row");
  inputRow.append(field.element, node("span", "pg-switcher__hotkey", "⌘K / SELECT"));
  header.append(inputRow, tabs);

  const preview = node("aside", "pg-switcher__preview");
  preview.setAttribute("aria-live", "polite");
  const resultsRow = node("div", "pg-switcher__results-row");
  resultsRow.append(list, preview);
  main.append(header, resultsRow, status);
  chassis.append(sidebar, main);
  content.appendChild(chassis);

  let results: readonly ModuleMeta[] = [];
  let activeIndex = 0;
  let previousFocus: HTMLElement | null = null;
  let rendering = false;

  const dialog = createDialog({
    title: "Bus Switcher",
    content,
    onClose: () => {
      store.update({ switcherOpen: false, switcherQuery: "", activeDomain: "all" });
      previousFocus?.focus?.();
      previousFocus = null;
    },
  });
  dialog.element.classList.add("pg-dialog--switcher");

  const selectDomain = (domain: Domain | "all"): void => {
    store.update({ activeDomain: domain });
    renderResults();
  };

  const domainLabels: Readonly<Record<Domain | "all", string>> = {
    all: "TODAS",
    core: "NÚCLEO APP",
    habitat: "HÁBITAT",
    marketing: "MARKETING",
    theme: "TEMA",
    forensics: "FORENSE",
    emulation: "EMULACIÓN",
  };
  const domainButtons = new Map<Domain | "all", HTMLButtonElement>();
  const domains: readonly (Domain | "all")[] = ["all", ...DOMAINS];
  for (const domain of domains) {
    const modules = store.getState().modules;
    const count = domain === "all"
      ? modules.length
      : modules.filter((module) => module.domain === domain).length;
    const button = node("button", "pg-switcher__domain", `${domainLabels[domain]} (${count})`);
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", domain === "all" ? "true" : "false");
    button.addEventListener("click", () => selectDomain(domain));
    domainButtons.set(domain, button);
    tabs.appendChild(button);
  }

  const choose = (module: ModuleMeta | undefined): void => {
    if (!module) return;
    const path = module.path;
    dialog.close();
    navigate(path);
  };

  // El switcher es global: al abrirlo se limpia el filtro de dominio que la
  // ruta activa pudo fijar en el store, para que cualquier destino sea buscable.
  const show = (): void => {
    store.update({ switcherOpen: true, switcherQuery: "", activeDomain: "all" });
  };

  const paintPreview = (module: ModuleMeta | undefined): void => {
    preview.replaceChildren();
    if (!module) {
      preview.appendChild(node("p", "pg-switcher__preview-empty", "Selecciona un destino para ver su ficha."));
      return;
    }
    preview.append(
      node("span", "pg-switcher__preview-kicker", domainLabels[module.domain]),
      node("h3", "pg-switcher__preview-title", module.label),
      node("code", "pg-switcher__preview-path", module.path),
      node("p", "pg-switcher__preview-desc", module.description),
      node(
        "span",
        `pg-switcher__preview-state ${module.implemented ? "is-ready" : "is-pending"}`,
        module.implemented ? "DISPONIBLE" : "PRÓXIMAMENTE",
      ),
    );
  };

  const paintActive = (): void => {
    const items = [...list.querySelectorAll<HTMLElement>("[role=option]")];
    items.forEach((item, index) => {
      const selected = index === activeIndex;
      item.setAttribute("aria-selected", selected ? "true" : "false");
      item.classList.toggle("is-active", selected);
    });
    items[activeIndex]?.scrollIntoView?.({ block: "nearest" });
    paintPreview(results[activeIndex]);
  };

  const renderResults = (): void => {
    if (rendering) return;
    rendering = true;
    try {
      const state = store.getState();
      results = filterModules(state.switcherQuery, state.activeDomain, state.modules);
      activeIndex = 0;
      paintPreview(results[0]);
      list.replaceChildren();
      if (results.length === 0) {
        const empty = node("li", "pg-switcher__empty", "Sin destinos para esta búsqueda.");
        empty.setAttribute("role", "option");
        empty.setAttribute("aria-selected", "false");
        list.appendChild(empty);
        status.textContent = "0 destinos";
        paintPreview(undefined);
        return;
      }
      results.forEach((module, index) => {
        const item = node("li", "pg-switcher__option");
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", index === 0 ? "true" : "false");
        item.dataset.pgPath = module.path;
        item.classList.toggle("is-active", index === 0);

        const label = node("span", "pg-switcher__label", module.label);
        const domain = node("span", "pg-switcher__domain-label", module.domain);
        const badge = createBadge({
          text: module.implemented ? "DISPONIBLE" : "PRÓXIMAMENTE",
          tone: module.implemented ? "legal" : "neutral",
        }).element;
        const line = node("div", "pg-switcher__option-line");
        line.append(label, domain, badge);
        const description = node("small", "pg-switcher__description", module.description);
        item.append(line, description);
        item.addEventListener("click", () => {
          activeIndex = index;
          choose(module);
        });
        list.appendChild(item);
      });
      status.textContent = `${results.length} ${results.length === 1 ? "destino" : "destinos"}`;
    } finally {
      rendering = false;
    }
  };

  const renderState = (): void => {
    const state = store.getState();
    if (input.value !== state.switcherQuery) input.value = state.switcherQuery;
    for (const [domain, button] of domainButtons) {
      button.setAttribute("aria-selected", domain === state.activeDomain ? "true" : "false");
    }
    renderResults();
    if (state.switcherOpen && !dialog.isOpen) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.open();
      input.focus();
    } else if (!state.switcherOpen && dialog.isOpen) {
      dialog.close();
    }
  };

  input.addEventListener("input", () => {
    store.update({ switcherQuery: input.value });
  });

  tabs.addEventListener("keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    if (key !== "ArrowRight" && key !== "ArrowLeft") return;
    event.preventDefault();
    const state = store.getState();
    const index = domains.indexOf(state.activeDomain);
    const delta = key === "ArrowRight" ? 1 : -1;
    const next = domains[(index + delta + domains.length) % domains.length];
    selectDomain(next);
    domainButtons.get(next)?.focus();
  });

  const onListKey = (event: KeyboardEvent): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      activeIndex = (activeIndex + delta + results.length) % results.length;
      paintActive();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (results.length === 0) return;
      activeIndex = event.key === "Home" ? 0 : results.length - 1;
      paintActive();
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(results[activeIndex]);
    }
  };
  content.addEventListener("keydown", onListKey);

  const onGlobalKey = (event: KeyboardEvent): void => {
    const shortcutOwner = event.target instanceof HTMLElement
      ? event.target.closest("[data-pg-shortcut-owner]")
      : null;
    if (event.defaultPrevented || shortcutOwner) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (store.getState().switcherOpen) dialog.close();
      else show();
      return;
    }
    if (event.key === "Escape" && store.getState().switcherOpen) {
      event.preventDefault();
      dialog.close();
      return;
    }
    // Un atajo global no debe activarse mientras se edita texto en otra vista.
    if (isEditable(event.target) && !dialog.isOpen) return;
  };
  document.addEventListener("keydown", onGlobalKey, true);

  const openEvent = (): void => show();
  globalThis.addEventListener?.("pg:switcher-open", openEvent);

  const unsubscribe = store.subscribe(renderState);
  renderResults();

  return {
    open: show,
    close: () => dialog.close(),
    toggle: () => {
      if (store.getState().switcherOpen) dialog.close();
      else show();
    },
    destroy() {
      unsubscribe();
      document.removeEventListener("keydown", onGlobalKey, true);
      globalThis.removeEventListener?.("pg:switcher-open", openEvent);
      content.removeEventListener("keydown", onListKey);
      dialog.destroy();
    },
  };
}
