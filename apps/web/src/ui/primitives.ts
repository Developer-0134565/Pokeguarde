// OC-STITCH-04 — primitivas visuales reutilizables.
// Sin imports, sin fetch, sin localStorage: solo DOM y los estilos pg-*.
// Un componente siempre expone `element` y `destroy()` para poder desmontarlo
// sin dejar listeners ni temporizadores vivos.

export type BadgeTone = "legal" | "unverified" | "illegal" | "info" | "neutral";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ToastTone = "legal" | "warning" | "danger";

export interface Component<T extends HTMLElement = HTMLElement> {
  readonly element: T;
  destroy(): void;
}

export interface TabsComponent extends Component<HTMLElement> {
  select(id: string): void;
  readonly activeId: string;
}

export interface DialogComponent extends Component<HTMLDialogElement> {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
}

export interface PanelOptions {
  title?: string;
  body?: string | Node;
  tone?: "accent" | "danger";
  /** Nivel de encabezado; por defecto 2. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  ariaLabel?: string;
}

export interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  ariaLabel?: string;
  onClick?: (event: MouseEvent) => void;
}

export interface TabOptions {
  id: string;
  label: string;
  content?: string | Node;
}

export interface TabsOptions {
  tabs: readonly TabOptions[];
  activeId?: string;
  ariaLabel?: string;
  onChange?: (id: string) => void;
}

export interface BadgeOptions {
  text: string;
  tone?: BadgeTone;
}

export interface FieldOptions {
  label: string;
  control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  hint?: string;
  ariaLabel?: string;
}

export interface DialogOptions {
  title: string;
  content?: string | Node;
  actions?: readonly ButtonOptions[];
  onClose?: () => void;
  /** false fuerza un diálogo no modal; por defecto se usa showModal(). */
  modal?: boolean;
}

export interface StepOptions {
  id: string;
  label: string;
}

export interface StepperOptions {
  steps: readonly StepOptions[];
  activeId?: string;
  ariaLabel?: string;
  onSelect?: (id: string) => void;
}

export interface TreeNodeOptions {
  id: string;
  label: string;
  children?: readonly TreeNodeOptions[];
  selected?: boolean;
}

export interface TreeOptions {
  nodes: readonly TreeNodeOptions[];
  ariaLabel?: string;
  onSelect?: (id: string, label: string) => void;
}

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  action?: ButtonOptions;
  /** 0 desactiva el cierre automático. Por defecto 4000 ms. */
  durationMs?: number;
}

export interface DeviceButtonOptions {
  id: string;
  label: string;
  ariaLabel?: string;
  onPress?: (id: string, event: MouseEvent) => void;
}

export interface DeviceShellOptions {
  screen?: Node;
  /** Por defecto A, B y C, en ese orden. */
  buttons?: readonly DeviceButtonOptions[];
  onButton?: (id: string, event: MouseEvent) => void;
  ariaLabel?: string;
}

type Cleanup = () => void;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function appendContent(target: Node, content?: string | Node): void {
  if (content === undefined) return;
  target.appendChild(typeof content === "string" ? document.createTextNode(content) : content);
}

function baseComponent<T extends HTMLElement>(
  element: T,
  cleanups: readonly Cleanup[],
): Component<T> {
  let destroyed = false;
  return {
    element,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const cleanup of cleanups) cleanup();
      element.remove();
    },
  };
}

export function createPanel(options: PanelOptions): Component<HTMLElement> {
  const panel = el("section", "pg-panel");
  if (options.tone === "accent") panel.classList.add("pg-panel--accent");
  if (options.tone === "danger") panel.classList.add("pg-panel--danger");

  if (options.title) {
    const title = el(`h${options.level ?? 2}`, "pg-panel__title", options.title);
    const titleId = `pg-panel-${Math.random().toString(36).slice(2, 9)}`;
    title.id = titleId;
    panel.setAttribute("aria-labelledby", titleId);
    panel.appendChild(title);
  } else if (options.ariaLabel) {
    panel.setAttribute("aria-label", options.ariaLabel);
  }

  const body = el("div", "pg-panel__body");
  appendContent(body, options.body);
  panel.appendChild(body);
  return baseComponent(panel, []);
}

export function createButton(options: ButtonOptions): Component<HTMLButtonElement> {
  const button = el("button", "pg-btn");
  button.type = "button";
  button.textContent = options.label;
  button.disabled = options.disabled ?? false;
  if (options.variant) button.classList.add(`pg-btn--${options.variant}`);
  button.setAttribute("aria-label", options.ariaLabel ?? options.label);

  const cleanups: Cleanup[] = [];
  if (options.onClick) {
    const handler = (event: MouseEvent) => options.onClick?.(event);
    button.addEventListener("click", handler);
    cleanups.push(() => button.removeEventListener("click", handler));
  }
  return baseComponent(button, cleanups);
}

export function createTabs(options: TabsOptions): TabsComponent {
  const root = el("div", "pg-tabs");
  const list = el("div", "pg-tabs__list");
  list.setAttribute("role", "tablist");
  if (options.ariaLabel) list.setAttribute("aria-label", options.ariaLabel);

  const baseId = `pg-tabs-${Math.random().toString(36).slice(2, 9)}`;
  const tabs = new Map<string, { button: HTMLButtonElement; panel: HTMLElement }>();
  const order: string[] = [];

  for (const tab of options.tabs) {
    const button = el("button", "pg-tabs__tab", tab.label);
    button.type = "button";
    button.id = `${baseId}-tab-${tab.id}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", `${baseId}-panel-${tab.id}`);
    button.tabIndex = -1;

    const panel = el("div", "pg-tabs__panel");
    panel.id = `${baseId}-panel-${tab.id}`;
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", button.id);
    panel.hidden = true;
    appendContent(panel, tab.content);

    list.appendChild(button);
    root.appendChild(panel);
    tabs.set(tab.id, { button, panel });
    order.push(tab.id);
  }

  root.insertBefore(list, root.firstChild);
  let activeId = options.activeId && tabs.has(options.activeId)
    ? options.activeId
    : (order[0] ?? "");
  const cleanups: Cleanup[] = [];

  const select = (id: string, focus = false): void => {
    const next = tabs.get(id);
    if (!next) return;
    for (const [key, entry] of tabs) {
      const selected = key === id;
      entry.button.setAttribute("aria-selected", String(selected));
      entry.button.tabIndex = selected ? 0 : -1;
      entry.panel.hidden = !selected;
    }
    activeId = id;
    if (focus) next.button.focus();
    options.onChange?.(id);
  };

  for (const [id, entry] of tabs) {
    const click = () => select(id);
    const keydown = (event: KeyboardEvent) => {
      const index = order.indexOf(id);
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % order.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + order.length) % order.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = order.length - 1;
      else return;
      event.preventDefault();
      select(order[nextIndex], true);
    };
    entry.button.addEventListener("click", click);
    entry.button.addEventListener("keydown", keydown);
    cleanups.push(
      () => entry.button.removeEventListener("click", click),
      () => entry.button.removeEventListener("keydown", keydown),
    );
  }

  if (activeId) select(activeId);
  const component = baseComponent(root, cleanups);
  return Object.assign(component, {
    select: (id: string) => select(id),
    get activeId() { return activeId; },
  });
}

export function createBadge(options: BadgeOptions): Component<HTMLElement> {
  const badge = el("span", "pg-badge", options.text);
  badge.classList.add(`pg-badge--${options.tone ?? "neutral"}`);
  return baseComponent(badge, []);
}

export function createField(options: FieldOptions): Component<HTMLElement> {
  const field = el("div", "pg-field");
  const controlId = `pg-field-${Math.random().toString(36).slice(2, 9)}`;
  options.control.id = controlId;
  options.control.classList.add("pg-field__control");

  const label = el("label", "pg-field__label", options.label);
  label.htmlFor = controlId;
  field.appendChild(label);
  field.appendChild(options.control);

  if (options.hint) {
    const hintId = `${controlId}-hint`;
    const hint = el("small", "pg-field__hint", options.hint);
    hint.id = hintId;
    options.control.setAttribute("aria-describedby", hintId);
    field.appendChild(hint);
  }
  if (options.ariaLabel) options.control.setAttribute("aria-label", options.ariaLabel);

  return baseComponent(field, []);
}

export function createDialog(options: DialogOptions): DialogComponent {
  const dialog = el("dialog", "pg-dialog");
  const titleId = `pg-dialog-${Math.random().toString(36).slice(2, 9)}`;
  dialog.setAttribute("aria-labelledby", titleId);

  const inner = el("div", "pg-dialog__inner");
  const head = el("div", "pg-dialog__head");
  const title = el("h2", "pg-dialog__title", options.title);
  title.id = titleId;
  head.appendChild(title);
  inner.appendChild(head);
  appendContent(inner, options.content);
  dialog.appendChild(inner);

  const cleanups: Cleanup[] = [];
  const actions: Component<HTMLButtonElement>[] = [];

  if (options.actions?.length) {
    const bar = el("div", "pg-dialog__actions");
    for (const action of options.actions) {
      const button = createButton({
        ...action,
        onClick: (event) => {
          action.onClick?.(event);
          dialog.close();
        },
      });
      actions.push(button);
      bar.appendChild(button.element);
    }
    inner.appendChild(bar);
  }

  if (options.onClose) {
    const close = () => options.onClose?.();
    dialog.addEventListener("close", close);
    cleanups.push(() => dialog.removeEventListener("close", close));
  }

  const component = baseComponent(dialog, [
    ...cleanups,
    ...actions.map((action) => action.destroy),
  ]);

  return Object.assign(component, {
    open() {
      if (dialog.open) return;
      // createDialog devuelve un diálogo autónomo; debe estar en el documento
      // antes de showModal() o el navegador lanza InvalidStateError.
      if (!dialog.isConnected) document.body.appendChild(dialog);
      if (options.modal === false) dialog.show();
      else dialog.showModal();
    },
    close() {
      if (dialog.open) dialog.close();
    },
    get isOpen() { return dialog.open; },
  });
}

export function createStepper(options: StepperOptions): Component<HTMLElement> {
  const root = el("nav", "pg-stepper");
  const list = el("ol", "pg-stepper__list");
  if (options.ariaLabel) root.setAttribute("aria-label", options.ariaLabel);

  const steps = new Map<string, HTMLLIElement>();
  for (const step of options.steps) {
    const item = el("li", "pg-stepper__step", step.label);
    item.dataset.pgStep = step.id;
    if (options.onSelect) {
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      const activate = () => options.onSelect?.(step.id);
      const keydown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activate();
      };
      item.addEventListener("click", activate);
      item.addEventListener("keydown", keydown);
    }
    steps.set(step.id, item);
    list.appendChild(item);
  }
  root.appendChild(list);

  const active = options.activeId && steps.has(options.activeId)
    ? options.activeId
    : options.steps[0]?.id;
  if (active) steps.get(active)?.setAttribute("aria-current", "step");

  return baseComponent(root, []);
}

export function createTree(options: TreeOptions): Component<HTMLElement> {
  const root = el("div", "pg-tree");
  root.setAttribute("role", "tree");
  if (options.ariaLabel) root.setAttribute("aria-label", options.ariaLabel);
  const cleanups: Cleanup[] = [];
  const items: HTMLElement[] = [];

  const addNodes = (nodes: readonly TreeNodeOptions[], parent: HTMLElement): void => {
    for (const node of nodes) {
      const item = el("div", "pg-tree__item", node.label);
      item.setAttribute("role", "treeitem");
      item.setAttribute("aria-selected", String(Boolean(node.selected)));
      item.tabIndex = node.selected ? 0 : -1;
      item.dataset.pgTreeId = node.id;
      items.push(item);
      parent.appendChild(item);

      const activate = () => {
        for (const other of items) {
          other.setAttribute("aria-selected", String(other === item));
          other.tabIndex = other === item ? 0 : -1;
        }
        options.onSelect?.(node.id, node.label);
      };
      const keydown = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      };
      item.addEventListener("click", activate);
      item.addEventListener("keydown", keydown);
      cleanups.push(
        () => item.removeEventListener("click", activate),
        () => item.removeEventListener("keydown", keydown),
      );

      if (node.children?.length) {
        const group = el("div", "pg-tree__group");
        group.setAttribute("role", "group");
        addNodes(node.children, group);
        parent.appendChild(group);
      }
    }
  };

  addNodes(options.nodes, root);
  return baseComponent(root, cleanups);
}

export function createToast(options: ToastOptions): Component<HTMLElement> {
  const tone = options.tone ?? "legal";
  const toast = el("div", "pg-toast");
  toast.classList.add(`pg-toast--${tone}`);
  toast.setAttribute("role", tone === "danger" ? "alert" : "status");
  toast.setAttribute("aria-live", tone === "danger" ? "assertive" : "polite");
  toast.appendChild(el("span", undefined, options.message));

  const cleanups: Cleanup[] = [];
  if (options.action) {
    const action = createButton(options.action);
    toast.appendChild(action.element);
    cleanups.push(action.destroy);
  }

  const duration = options.durationMs ?? 4000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (duration > 0) timer = setTimeout(() => toast.remove(), duration);
  cleanups.push(() => { if (timer !== undefined) clearTimeout(timer); });

  return baseComponent(toast, cleanups);
}

export function createDeviceShell(options: DeviceShellOptions): Component<HTMLElement> {
  const shell = el("section", "pg-device-shell");
  shell.setAttribute("aria-label", options.ariaLabel ?? "Consola de la Guardería");

  const screen = el("div", "pg-device-shell__screen");
  screen.setAttribute("role", "region");
  screen.setAttribute("aria-label", "Pantalla");
  if (options.screen) screen.appendChild(options.screen);
  shell.appendChild(screen);

  const controls = el("div", "pg-device-shell__controls");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Botones de la consola");
  const cleanups: Cleanup[] = [];

  const defaults: readonly DeviceButtonOptions[] = [
    { id: "A", label: "A", ariaLabel: "Botón A: aceptar" },
    { id: "B", label: "B", ariaLabel: "Botón B: volver" },
    { id: "C", label: "C", ariaLabel: "Botón C: ciclar" },
  ];
  const buttons = options.buttons ?? defaults;

  for (const definition of buttons) {
    const button = el("button", "pg-device-shell__button", definition.label);
    button.type = "button";
    button.dataset.pgDeviceButton = definition.id;
    button.setAttribute("aria-label", definition.ariaLabel ?? `Botón ${definition.id}`);
    const handler = (event: MouseEvent) => {
      definition.onPress?.(definition.id, event);
      options.onButton?.(definition.id, event);
    };
    button.addEventListener("click", handler);
    cleanups.push(() => button.removeEventListener("click", handler));
    controls.appendChild(button);
  }

  shell.appendChild(controls);
  return baseComponent(shell, cleanups);
}
