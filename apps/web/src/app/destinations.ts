// OC-STITCH-08 — Registro ampliado de destinos.
// MODULES (13) se conserva intacto para los contratos OC-STITCH-05/PG-07.
// DESTINATIONS (58) añade todas las páginas lógicas del inventario Stitch.
// La navegación, el router y el Command Bus usan este registro.

import { MODULES, type Domain, type ModuleMeta } from "./registry.js";
import { PAGES } from "../pages/catalog.js";

const DOMAIN_OF: Readonly<Record<string, Domain>> = {
  core: "core",
  creator_shell: "core",
  emulation: "emulation",
  forensics: "forensics",
  habitat: "habitat",
  marketing: "marketing",
  theme: "theme",
};

function slug(path: string): string {
  return path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
}

function keywordsOf(title: string, notes: string, path: string): readonly string[] {
  return [...new Set(
    `${title} ${notes} ${path}`.toLocaleLowerCase("es").split(/[^a-z0-9áéíóúñü]+/i).filter((w) => w.length > 2),
  )];
}

const fromCatalog: readonly ModuleMeta[] = PAGES.map((page) => ({
  id: slug(page.route),
  label: page.title,
  path: page.route,
  domain: DOMAIN_OF[page.domain] ?? "core",
  keywords: keywordsOf(page.title, page.notes, page.route),
  implemented: true,
  description: `${page.notes} Estado: ${page.state}.`,
}));

/**
 * Unión por ruta: los módulos históricos operativos conservan su identidad.
 * Los módulos heredados no implementados NO sobrescriben una página real del
 * catálogo: hacerlo mostraba textos «PRÓXIMAMENTE» aunque la ruta ya existe.
 */
export const DESTINATIONS: readonly ModuleMeta[] = (() => {
  const byPath = new Map<string, ModuleMeta>();
  for (const entry of fromCatalog) byPath.set(entry.path, entry);
  for (const legacy of MODULES) {
    if (!legacy.implemented && byPath.has(legacy.path)) continue;
    byPath.set(legacy.path, legacy);
  }
  return [...byPath.values()];
})();

export function destinationForPath(path: string): ModuleMeta | undefined {
  return DESTINATIONS.find((module) => module.path === path);
}

export function destinationsOfDomain(domain: Domain | "all"): readonly ModuleMeta[] {
  return domain === "all" ? DESTINATIONS : DESTINATIONS.filter((module) => module.domain === domain);
}
