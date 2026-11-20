// OC-STITCH-05 — registro modular de destinos de navegación.
// No contiene datos de juego: solo metadatos de las vistas que el shell puede
// alcanzar. `implemented: false` identifica módulos todavía no integrados.

export type Domain = "core" | "habitat" | "marketing" | "theme" | "forensics" | "emulation";

export interface ModuleMeta {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly domain: Domain;
  readonly keywords: readonly string[];
  readonly implemented: boolean;
  readonly description: string;
}

export const DOMAINS: readonly Domain[] = [
  "core",
  "habitat",
  "marketing",
  "theme",
  "forensics",
  "emulation",
];

export const MODULES: readonly ModuleMeta[] = [
  {
    id: "home",
    label: "Inicio",
    path: "/home",
    domain: "core",
    keywords: ["home", "inicio", "portada", "landing", "play"],
    implemented: true,
    description: "Portada Pocket Tech 1999 con accesos al núcleo.",
  },
  {
    id: "guarderia",
    label: "Guardería",
    path: "/guarderia",
    domain: "core",
    keywords: ["guarderia", "guardería", "nursery", "tamagotchi", "cuidar"],
    implemented: true,
    description: "Motor determinista y Canvas 160×144 existentes.",
  },
  {
    id: "biblioteca",
    label: "Biblioteca",
    path: "/biblioteca",
    domain: "core",
    keywords: ["biblioteca", "library", "saves", "partidas", "cajas"],
    implemented: true,
    description: "Importación e inventario de partidas.",
  },
  {
    id: "ficha",
    label: "Ficha / Datos",
    path: "/ficha",
    domain: "core",
    keywords: ["ficha", "datos", "sheet", "pokemon", "legalidad"],
    implemented: true,
    description: "Ficha técnica y legalidad del Pokémon seleccionado.",
  },
  {
    id: "crianza",
    label: "Crianza",
    path: "/crianza",
    domain: "core",
    keywords: ["crianza", "breeding", "huevos", "pareja"],
    implemented: false,
    description: "Pantalla de crianza pendiente de integración.",
  },
  {
    id: "perfil",
    label: "Perfil",
    path: "/perfil",
    domain: "core",
    keywords: ["perfil", "profile", "entrenador", "privacidad"],
    implemented: false,
    description: "Perfil de entrenador pendiente de integración.",
  },
  {
    id: "tienda",
    label: "Tienda",
    path: "/tienda",
    domain: "core",
    keywords: ["tienda", "store", "guardipuntos", "gp"],
    implemented: false,
    description: "Tienda de guardipuntos pendiente de integración.",
  },
  {
    id: "forensics",
    label: "Inspección Forense",
    path: "/forensics",
    domain: "forensics",
    keywords: ["forense", "forensics", "pkhex", "save", "legalidad"],
    implemented: false,
    description: "Inspección forense pendiente de integración.",
  },
  {
    id: "studio-theme",
    label: "Theme Studio",
    path: "/studio/theme",
    domain: "theme",
    keywords: ["theme", "tema", "tokens", "tipografia", "color"],
    implemented: false,
    description: "Theme Studio pendiente de integración.",
  },
  {
    id: "studio-marketing",
    label: "Marketing Studio",
    path: "/studio/marketing",
    domain: "marketing",
    keywords: ["marketing", "brand", "campana", "prensa"],
    implemented: false,
    description: "Marketing Studio pendiente de integración.",
  },
  {
    id: "studio-shell",
    label: "Shell Studio",
    path: "/studio/shell",
    domain: "core",
    keywords: ["shell", "carcasa", "dispositivo", "device"],
    implemented: false,
    description: "Shell Studio pendiente de integración.",
  },
  {
    id: "studio-habitat",
    label: "Habitat Studio",
    path: "/studio/habitat",
    domain: "habitat",
    keywords: ["habitat", "habitacion", "sala", "editor"],
    implemented: false,
    description: "Habitat Studio pendiente de integración.",
  },
  {
    id: "emulation",
    label: "Emulation Suite",
    path: "/emulation",
    domain: "emulation",
    keywords: ["emulacion", "emulación", "emulation", "salas", "batalla", "cambio"],
    implemented: false,
    description: "Suite de emulación presentacional, sin servicios activos.",
  },
];

export function moduleForPath(path: string): ModuleMeta | undefined {
  return MODULES.find((module) => module.path === path);
}

/** Filtrado puro del Quick Switcher; se prueba sin DOM. */
export function filterModules(
  query: string,
  domain: Domain | "all" = "all",
  modules: readonly ModuleMeta[] = MODULES,
): readonly ModuleMeta[] {
  const words = query.trim().toLocaleLowerCase("es").split(/\s+/).filter(Boolean);
  return modules.filter((module) => {
    if (domain !== "all" && module.domain !== domain) return false;
    if (words.length === 0) return true;
    const haystack = [module.label, module.id, module.domain, ...module.keywords]
      .join(" ")
      .toLocaleLowerCase("es");
    return words.every((word) => haystack.includes(word));
  });
}
