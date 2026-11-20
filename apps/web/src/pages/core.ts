// OC-STITCH-08 — Lote 1: páginas lógicas del núcleo sin implementar en OC-STITCH-07.
// NO sustituyen Homepage, Guardería, Biblioteca ni Ficha (ya operativas).
// Ninguna de estas vistas modifica motores, BD ni datos de partida.

import "./core.css";
import { PAGES, type PageEntry } from "./catalog.js";
import {
  button, cards, code, el, emptyState, moduleRail, pageFrame, progress,
  referenceOutline, section, table, toolbar, type Navigate,
} from "./contract.js";

function railFor(page: PageEntry, domain: string, navigate: Navigate): HTMLElement {
  const entries = PAGES.filter((p) => p.domain === domain).map((p) => ({
    label: p.title.replace(/^.*—\s*/, ""),
    route: p.route,
    active: p.route === page.route,
  }));
  return moduleRail("MÓDULOS DEL NÚCLEO", entries, navigate);
}

function breeding(page: PageEntry, navigate: Navigate): HTMLElement {
  const { root, body, aside } = pageFrame(page, navigate);
  const steps = ["01 SELECCIÓN DE PAREJA", "02 VALIDACIÓN BIOLÓGICA", "03 ECLOSIÓN PHIONE", "04 ENTREGA E INCUBACIÓN"];
  const flow = el("div", "pg-co-flow");
  steps.forEach((label, i) => {
    const step = el("div", "pg-co-step", label);
    if (page.sources.length > 1 && i < page.sources.length) {
      step.dataset.pgStitch = page.sources[i]?.id.slice(0, 8);
    }
    flow.appendChild(step);
  });
  body.append(
    section("Secuencia del flujo", "Cuatro pantallas de Stitch agrupadas en una única página lógica.", flow),
    section("Validación", undefined,
      table("Reglas mostradas en la referencia", [
        ["Especie y compatibilidad", "Se validarían con el motor de crianza (no implementado)."],
        ["Huevos y objeto", "Sin huevos reales: esta vista es un prototipo UI."],
        ["Incubación con GP", "Economía no activa en modo local."],
      ]),
    ),
    section("Controles de la maqueta", undefined, toolbar(["VALIDAR PAREJA", "GENERAR HUEVO", "INCUBAR", "ENTREGAR"])),
  );
  aside.append(railFor(page, "core", navigate), referenceOutline(page));
  return root;
}

function profile(page: PageEntry, navigate: Navigate): HTMLElement {
  const { root, body, aside } = pageFrame(page, navigate);
  body.append(
    section("Datos locales", "El modo local no usa cuentas, contraseñas ni sincronización.",
      table("Ficha de entrenador", [
        ["Cuenta", "No requerida en modo local"],
        ["Notificaciones", "Solo avisos de la aplicación, sin envío externo"],
        ["Privacidad", "Los saves y datos personales permanecen en 127.0.0.1"],
      ])),
    section("Preferencias visibles", undefined,
      progress("Movimiento reducido", 0),
      progress("Datos locales", 100),
      progress("Sincronización en la nube", 0)),
    section("Acciones no disponibles", undefined,
      emptyState("No hay servidor de cuentas: no se han inventado datos de usuario."),
      toolbar(["CAMBIAR CONTRASEÑA", "ACTIVAR 2FA", "BORRAR CUENTA"])),
  );
  aside.append(railFor(page, "core", navigate), referenceOutline(page));
  return root;
}

function players(page: PageEntry, navigate: Navigate): HTMLElement {
  const { root, body, aside } = pageFrame(page, navigate);
  body.append(
    section("Guarderías compartidas (PG-08)", "Dos Pokémon por guardería: propio y visitante; anfitrión cuida, propietario recupera.",
      cards([
        { title: "GUARDERÍA LOCAL", text: "Funciona sin cuentas, pagos ni conexión permanente.", tag: "OPERATIVA" },
        { title: "POKÉMON VISITANTE", text: "El propietario conserva titularidad y derecho de recuperación.", tag: "PG-08" },
        { title: "MODO WEB PÚBLICA", text: "Especificación futura: no hay servidor ni usuarios remotos activos.", tag: "FUTURO" },
      ])),
    section("Directorio", undefined,
      emptyState("Sin jugadores remotos: el modo local no consulta directorios externos."),
      toolbar(["BUSCAR JUGADOR", "ENVIAR INVITACIÓN", "VISITAR GUARDERÍA"])),
  );
  aside.append(railFor(page, "core", navigate), referenceOutline(page));
  return root;
}

function shop(page: PageEntry, navigate: Navigate): HTMLElement {
  const { root, body, aside } = pageFrame(page, navigate);
  body.append(
    section("Guardipuntos", "Catálogo visual de la tienda; la economía no está implementada.",
      cards([
        { title: "COMIDA", text: "Acciones de cuidado reales están en Guardería, no aquí.", tag: "MAQUETA" },
        { title: "DECORACIÓN", text: "El fondo de la habitación está versionado y no se modifica desde esta vista.", tag: "ASSET PROTEGIDO" },
        { title: "BAYAS REDUCTORAS DE EV", text: "Solo Gen 3+, con límites legales; requiere save cargado.", tag: "REGLA PRD" },
      ])),
    section("Compra", undefined,
      emptyState("Saldo no simulado: no se muestran puntos ni transacciones inventadas."),
      toolbar(["COMPRAR", "REGALAR", "VER HISTORIAL"])),
  );
  aside.append(railFor(page, "core", navigate), referenceOutline(page));
  return root;
}

function forensics(page: PageEntry, navigate: Navigate): HTMLElement {
  const { root, body, aside } = pageFrame(page, navigate);
  const panelLinks = el("div", "pg-co-panel-links");
  const related = PAGES.filter((p) => p.domain === "forensics");
  for (const p of related) {
    const b = button(p.title.replace(/^.*—\s*/, ""), () => navigate(p.route), "pg-btn");
    if (p.route === page.route) b.classList.add("is-active");
    panelLinks.appendChild(b);
  }
  body.append(
    section("Paneles de la inspección", "Los tres paneles comparten los datos del save importado cuando existe.", panelLinks),
    section("Veredicto y cadenas", undefined,
      table("Alcance de la referencia Stitch", [
        ["Detalle PKHeX", "Legalidad, motivos y estado no verificable del Pokémon seleccionado."],
        ["Time Capsule", "Gen I ↔ Gen II; nunca Gen I/II → NDS."],
        ["Checklist Gen II", "Reglas de legalidad y límites de la generación."],
      ])),
    section("Datos", undefined,
      emptyState("Carga una partida desde la Biblioteca para ver datos reales; esta página no inventa resultados."),
      button("ABRIR BIBLIOTECA", () => navigate("/biblioteca"))),
  );
  aside.append(railFor(page, "core", navigate), referenceOutline(page), code(page.route));
  return root;
}

export function createCoreWorkbench(page: PageEntry, navigate: Navigate): HTMLElement {
  switch (page.route) {
    case "/crianza": return breeding(page, navigate);
    case "/perfil": return profile(page, navigate);
    case "/jugadores": return players(page, navigate);
    case "/tienda": return shop(page, navigate);
    case "/forensics": return forensics(page, navigate);
    default: return pageFrame(page, navigate).root;
  }
}
