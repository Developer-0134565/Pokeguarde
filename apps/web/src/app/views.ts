// OC-STITCH-06 — Homepage reconstruida desde la pantalla canónica de Stitch.
// Estructura y copys proceden de `home.html`; se genera con DOM puro, sin CDN,
// sin recursos remotos y sin datos de juego ficticios.

import { createBadge, createPanel } from "/ui.js";
import type { ModuleMeta } from "./registry.js";

type Navigate = (path: string) => void;

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

function linkButton(label: string, path: string, navigate: Navigate, className: string): HTMLButtonElement {
  const button = node("button", className, label);
  button.type = "button";
  button.addEventListener("click", () => navigate(path));
  return button;
}

function feature(
  number: string,
  title: string,
  description: string,
  chip: string,
  path: string,
  navigate: Navigate,
): HTMLElement {
  const article = node("a", "pg-home__feature");
  article.href = path.startsWith("/") ? `#${path}` : `#/${path}`;
  article.append(
    node("span", "pg-home__feature-badge", chip),
    node("h3", "pg-home__feature-title", `${number}. ${title}`),
    node("p", "pg-home__feature-text", description),
  );
  article.addEventListener("click", (event) => {
    event.preventDefault();
    navigate(path);
  });
  article.setAttribute("aria-label", `${title} — abrir sección`);
  return article;
}

function field(labelText: string, type: string, placeholder: string, maxLength?: number): HTMLElement {
  const wrapper = node("label", "pg-home__field");
  wrapper.append(node("span", "pg-home__field-label", labelText));
  const input = node("input", "pg-home__input");
  input.type = type;
  input.placeholder = placeholder;
  if (maxLength !== undefined) input.maxLength = maxLength;
  wrapper.appendChild(input);
  return wrapper;
}

function buildConsole(navigate: Navigate): HTMLElement {
  const center = node("section", "pg-home__center");
  const consoleBox = node("div", "pg-console");
  consoleBox.setAttribute("aria-label", "Consola Pocket Tech 1999, pantalla de demostración");

  const top = node("div", "pg-console__top");
  top.append(
    node("span", "pg-console__mark", "POKEGUARDE"),
    node("span", "pg-console__model", "MODEL PKG-02"),
  );

  const screen = node("div", "pg-console__screen");
  screen.append(
    node("span", "pg-console__slot", "SLOT: 01"),
    node("span", "pg-console__online", "● ONLINE"),
    node("span", "pg-console__lcd", "PANTALLA LCD 160×144"),
    node("span", "pg-console__active", "[SISTEMA ACTIVO]"),
    node("span", "pg-console__matrix", "DOT MATRIX"),
  );

  const pad = node("div", "pg-console__pad");
  pad.append(
    node("span", "pg-console__dpad", "◀ ▲ ▼ ▶"),
    node("span", "pg-console__ab", "A  B"),
  );

  consoleBox.append(top, screen, pad);
  center.appendChild(consoleBox);

  const play = linkButton("▶  PLAY NOW", "/guarderia", navigate, "pg-home__play");
  center.appendChild(play);
  return center;
}

function buildSignup(): HTMLElement {
  const form = node("form", "pg-home__signup");
  form.dataset.pgMock = "1";
  form.append(
    node("h3", "pg-home__side-title", "ÚNETE A LA RED POKEGUARDE"),
    field("CORREO ELECTRÓNICO", "email", "entrenador@pokeguarde.local"),
    field("OT / NOMBRE DE ENTRENADOR", "text", "MÍNIMO 1 · MÁXIMO 7", 7),
    field("CONTRASEÑA", "password", "••••••••"),
  );

  const social = node("div", "pg-home__social");
  social.append(
    node("button", "pg-home__social-btn", "GOOGLE"),
    node("button", "pg-home__social-btn", "DISCORD"),
  );
  social.querySelectorAll("button").forEach((button) => {
    button.type = "button";
    button.disabled = true;
  });
  form.appendChild(social);

  const submit = node("button", "pg-home__cta", "CREAR CUENTA DE ENTRENADOR");
  submit.type = "submit";
  form.appendChild(submit);

  const note = node("p", "pg-home__mock-note", "Maqueta visual: el modo local no usa cuentas ni envía datos.");
  form.appendChild(note);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    note.textContent = "Maqueta visual: el modo local no usa cuentas ni envía datos.";
  });
  return form;
}

export function renderHome(navigate: Navigate): HTMLElement {
  const root = node("div", "pg-home");
  root.dataset.pgStitch = "home-registro";

  const banner = node("div", "pg-home__banner");
  const bannerTitle = node("div", "pg-home__banner-heading");
  bannerTitle.append(
    node("span", "pg-home__banner-mark"),
    node(
      "p",
      "pg-home__banner-title",
      "SISTEMA PERPETUO DE PRESERVACIÓN & CRIANZA DE ESPECÍMENES POKÉMON (1996–2012)",
    ),
  );
  banner.appendChild(bannerTitle);
  const bannerBadges = node("div", "pg-home__banner-badges");
  bannerBadges.append(
    node("span", "pg-chip", "AUTÉNTICO KERNEL VINTAGE"),
    node("span", "pg-chip", "BIT-RATE: 8-BIT MONO"),
  );
  banner.appendChild(bannerBadges);
  root.appendChild(banner);

  const grid = node("div", "pg-home__grid");

  const left = node("aside", "pg-home__left");
  const specsHead = node("div", "pg-home__specs-head");
  specsHead.append(
    node("h2", "pg-home__specs-title", "ESPECIFICACIONES DEL SUBSISTEMA"),
    node("span", "pg-home__specs-range", "P01–P05"),
  );
  left.appendChild(specsHead);
  left.append(
    feature(
      "01",
      "Guardería Tamagotchi",
      "Cuida, alimenta y entrena a tu Pokémon en una pantalla LCD de 160×144.",
      "160×144 GBC",
      "/guarderia",
      navigate,
    ),
    feature(
      "02",
      "Crianza & Guarderías Compartidas",
      "Hasta dos Pokémon por guardería: propio y visitante, con cuidado compartido.",
      "PG-08 DUAL",
      "/crianza",
      navigate,
    ),
    feature(
      "03",
      "Entrenamiento EV & Stat Exp Real",
      "Los minijuegos suman EV reales con topes legales por edición.",
      "HARDWARE STAT",
      "/ficha",
      navigate,
    ),
    feature(
      "04",
      "Auditoría Forense PKHeX",
      "Cada Pokémon muestra su veredicto y los motivos concretos de legalidad.",
      "PKHEX.CORE",
      "/forensics",
      navigate,
    ),
    feature(
      "05",
      "Modo Local Perpetuo",
      "Sin cuentas, sin nube y sin dependencias: todo en 127.0.0.1.",
      "127.0.0.1",
      "/home",
      navigate,
    ),
  );
  grid.appendChild(left);
  grid.appendChild(buildConsole(navigate));

  const right = node("aside", "pg-home__right");
  const importBlock = node("section", "pg-home__import");
  importBlock.append(
    node("h3", "pg-home__side-title", "IMPORTA TU POKÉMON (.SAV)"),
    node("div", "pg-home__drop", "ARRASTRA O ELIGE TU ARCHIVO"),
    node("p", "pg-home__drop-hint", "32–512 KB · .sav / .srm / .dsv"),
    linkButton("ABRIR BIBLIOTECA", "/biblioteca", navigate, "pg-home__cta"),
  );
  right.append(importBlock, buildSignup());
  grid.appendChild(right);
  root.appendChild(grid);

  const footer = node("footer", "pg-home__footer");
  footer.append(
    node("span", undefined, "POKEGUARDE PROJECT ARCHIVE © 2026 | VERIFICACIÓN POR MOTOR PKHEX CANÓNICO"),
  );
  const footerLinks = node("div", "pg-home__footer-links");
  footerLinks.append(
    node("span", undefined, "POLÍTICA DE DATOS LOCALES"),
    node("span", undefined, "CHANGELOG (v2.44)"),
  );
  footer.appendChild(footerLinks);
  root.appendChild(footer);

  return root;
}

export function renderStub(module: ModuleMeta | undefined, requestedPath: string): HTMLElement {
  const root = node("section", "pg-stub");
  const panel = createPanel({
    title: module?.label ?? "Ruta no registrada",
    body: (() => {
      const body = node("div", "pg-stub__body");
      body.appendChild(createBadge({
        text: "SIN VISTA REGISTRADA",
        tone: "info",
      }).element);
      body.appendChild(node("p", undefined, "Usa el Command Bus (Ctrl+K / ⌘+K) para elegir una página disponible."));
      body.appendChild(node("code", "pg-stub__path", requestedPath));
      return body;
    })(),
  });
  root.appendChild(panel.element);
  return root;
}
