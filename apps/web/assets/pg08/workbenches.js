// apps/web/src/app/registry.ts
var MODULES = [
  {
    id: "home",
    label: "Inicio",
    path: "/home",
    domain: "core",
    keywords: ["home", "inicio", "portada", "landing", "play"],
    implemented: true,
    description: "Portada Pocket Tech 1999 con accesos al núcleo."
  },
  {
    id: "guarderia",
    label: "Guardería",
    path: "/guarderia",
    domain: "core",
    keywords: ["guarderia", "guardería", "nursery", "tamagotchi", "cuidar"],
    implemented: true,
    description: "Motor determinista y Canvas 160×144 existentes."
  },
  {
    id: "biblioteca",
    label: "Biblioteca",
    path: "/biblioteca",
    domain: "core",
    keywords: ["biblioteca", "library", "saves", "partidas", "cajas"],
    implemented: true,
    description: "Importación e inventario de partidas."
  },
  {
    id: "ficha",
    label: "Ficha / Datos",
    path: "/ficha",
    domain: "core",
    keywords: ["ficha", "datos", "sheet", "pokemon", "legalidad"],
    implemented: true,
    description: "Ficha técnica y legalidad del Pokémon seleccionado."
  },
  {
    id: "crianza",
    label: "Crianza",
    path: "/crianza",
    domain: "core",
    keywords: ["crianza", "breeding", "huevos", "pareja"],
    implemented: false,
    description: "Pantalla de crianza pendiente de integración."
  },
  {
    id: "perfil",
    label: "Perfil",
    path: "/perfil",
    domain: "core",
    keywords: ["perfil", "profile", "entrenador", "privacidad"],
    implemented: false,
    description: "Perfil de entrenador pendiente de integración."
  },
  {
    id: "tienda",
    label: "Tienda",
    path: "/tienda",
    domain: "core",
    keywords: ["tienda", "store", "guardipuntos", "gp"],
    implemented: false,
    description: "Tienda de guardipuntos pendiente de integración."
  },
  {
    id: "forensics",
    label: "Inspección Forense",
    path: "/forensics",
    domain: "forensics",
    keywords: ["forense", "forensics", "pkhex", "save", "legalidad"],
    implemented: false,
    description: "Inspección forense pendiente de integración."
  },
  {
    id: "studio-theme",
    label: "Theme Studio",
    path: "/studio/theme",
    domain: "theme",
    keywords: ["theme", "tema", "tokens", "tipografia", "color"],
    implemented: false,
    description: "Theme Studio pendiente de integración."
  },
  {
    id: "studio-marketing",
    label: "Marketing Studio",
    path: "/studio/marketing",
    domain: "marketing",
    keywords: ["marketing", "brand", "campana", "prensa"],
    implemented: false,
    description: "Marketing Studio pendiente de integración."
  },
  {
    id: "studio-shell",
    label: "Shell Studio",
    path: "/studio/shell",
    domain: "core",
    keywords: ["shell", "carcasa", "dispositivo", "device"],
    implemented: false,
    description: "Shell Studio pendiente de integración."
  },
  {
    id: "studio-habitat",
    label: "Habitat Studio",
    path: "/studio/habitat",
    domain: "habitat",
    keywords: ["habitat", "habitacion", "sala", "editor"],
    implemented: false,
    description: "Habitat Studio pendiente de integración."
  },
  {
    id: "emulation",
    label: "Emulation Suite",
    path: "/emulation",
    domain: "emulation",
    keywords: ["emulacion", "emulación", "emulation", "salas", "batalla", "cambio"],
    implemented: false,
    description: "Suite de emulación presentacional, sin servicios activos."
  }
];

// apps/web/src/pages/catalog.ts
var PAGES = [
  {
    route: "/home",
    title: "Homepage Oficial y Shell",
    domain: "core",
    state: "OPERATIONAL",
    component: "HomeView",
    notes: "Página canónica ya implementada en OC-STITCH-06.",
    sources: [
      {
        id: "44464441f20242b0aec53f914e564835",
        title: "Pokeguarde — Homepage Oficial & Shell Definitivo (Registro)",
        classification: "WEB_PAGE",
        resolution: "2560x2134",
        headings: ["SISTEMA PERPETUO DE PRESERVACIÓN &amp; CRIANZA DE ESPECÍMENES POKÉMON (1996–2012)", "ESPECIFICACIONES DEL SUBSISTEMA", "01. Guardería Tamagotchi 160×144", "02. Crianza &amp; Guarderías Compartidas", "03. Entrenamiento EV &amp; Stat Exp Real", "04. Auditoría Forense PKHeX", "05. Modo Local Perpetuo Offline", "IMPORTA TU POKÉMON (.SAV)", "ÚNETE A LA RED POKEGUARDE NUEVO ENTRENADOR"],
        buttons: ["POKEGUARDE EST. 1999 • ARCHIVE NET", "Características", "Guardería", "Compatibilidad Gen I-V", "Comunidad", "Iniciar Sesión", "160×144 GBC 01. Guardería Tamagotchi 160×144", "IMPORTA TU POKÉMON (.SAV) 32 KB – 512 KB Arras", "DISCORD", "CREAR CUENTA DE ENTRENADOR", "Iniciar Sesión", "POLÍTICA DE DATOS LOCALES", "CHANGELOG (v2.44)"]
      }
    ]
  },
  {
    route: "/guarderia",
    title: "Guardería Tamagotchi (2/2)",
    domain: "core",
    state: "OPERATIONAL",
    component: "NurseryView",
    notes: "Motor determinista y Canvas 160x144 protegidos; sin cambios de lógica.",
    sources: [
      {
        id: "27103c1c412643f189472faa33166698",
        title: "Guardería (2/2 Pokémon) — Escritorio",
        classification: "WEB_PAGE",
        resolution: "2560x2254",
        headings: [],
        buttons: ["COMMAND DECK▼ PKGeggGuardería", "query_statsFicha / Datos", "shieldEquipo Activo", "groupJugadoresNET", "inventory_2Biblioteca", "backpackInventario & Tienda", "1: CHIKORITA [ANFITRIÓN]", "2: MANAPHY [HUÉSPED AZUL]", "A", "B", "C", "ENFOCAR ▶", "ENFOCAR ▶", "VER REGISTRO LOG", "FICHA COMPLETA"]
      }
    ]
  },
  {
    route: "/biblioteca",
    title: "Biblioteca — Cajas PC y Filtros",
    domain: "core",
    state: "OPERATIONAL",
    component: "LibraryView",
    notes: "Datos reales de inventario del save importado.",
    sources: [
      {
        id: "cd4b8b86e61f48bbb002dfe6e2508b19",
        title: "Biblioteca — Cajas de PC (1-14) & Filtros de Legalidad",
        classification: "WEB_PAGE",
        resolution: "2560x2594",
        headings: [],
        buttons: ["CHASSIS BUSSYS·LINK GBCD-PAD SHORTCUTS▲EQUIPO[01]", "▶GUARDERÍA[02]", "▼BIBLIOTECA[03]", "◀TIENDA[04]", "Guardería", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Inventario &amp; Tienda", "SINCRONIZAR .SAV", "EXPORTAR DRY-RUN", "[01] EQUIPO ACTIVO (6/6)", "▶ [02] CAJAS PC (1-14) · [ACTIVO]", "[03] MOCHILA / INVENTARIO"]
      }
    ]
  },
  {
    route: "/biblioteca/equipo",
    title: "Biblioteca — Equipo y Mochila",
    domain: "core",
    state: "OPERATIONAL",
    component: "LibraryView",
    notes: "Pestaña real del inventario; misma vista con sección inicial distinta.",
    sources: [
      {
        id: "db2fd3f1eafd442a860d9431d550e97b",
        title: "Biblioteca — Equipo Activo & Mochila",
        classification: "WEB_PAGE",
        resolution: "2560x2306",
        headings: [],
        buttons: ["CHASSIS BUSSYS·LINK GBCD-PAD SHORTCUTS▲EQUIPO[01]", "▶GUARDERÍA[02]", "▼BIBLIOTECA[03]", "◀TIENDA[04]", "Guardería", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Inventario &amp; Tienda", "sync Sincronizar Save", "file_download Exportar .SAV DRY-RUN", "▶ EQUIPO ACTIVO (ACTIVO) 6/6", "CAJAS PC (1-14) [24/280]", "MOCHILA / INVENTARIO EXPANDIDO"]
      }
    ]
  },
  {
    route: "/ficha",
    title: "Ficha y Datos del Pokémon",
    domain: "core",
    state: "OPERATIONAL",
    component: "SheetView",
    notes: "Ficha real con legalidad PKHeX y permisos de visitante.",
    sources: [
      {
        id: "3a99d39123d84b649ff36c5268b82c3c",
        title: "Ficha / Datos — Manaphy Visitante & Permisos",
        classification: "WEB_PAGE",
        resolution: "2560x2424",
        headings: [],
        buttons: ["COMMAND DECK▼ PKGeggGuardería", "query_statsFicha / Datos", "shieldEquipo Activo", "groupJugadoresNET", "inventory_2Biblioteca", "backpackInventario &amp; Tienda", "how_to_reg [Registrar Cuidado]", "Dar Baya (+EV Def)", "Filtrar Estanque", "Pausa Reposo", "mark_email_read Proponer Crianza Inviable (Bloqueado)"]
      }
    ]
  },
  {
    route: "/crianza",
    title: "Crianza y Huevos",
    domain: "core",
    state: "UI_PROTOTYPE",
    component: "BreedingFlow",
    notes: "Cuatro pantallas de un mismo flujo: selección, eclosión, animación y entrega. Sin huevos reales.",
    sources: [
      {
        id: "e390b05b3c2d42729527c9f24b0b20ad",
        title: "Crianza & Huevos — Selección de Pareja & Validación Biológica",
        classification: "WEB_PAGE",
        resolution: "2560x3652",
        headings: ["PROTOCOLO DE EMPAREJAMIENTO &amp; EVALUACIÓN BIOLÓGICA"],
        buttons: ["SISTEMA D-PADeggGUARDERÍA", "badgeFICHA / DATOS", "20mpEQUIPO ACTIVO", "groupJUGADORES", "nest_cam_wired_standCRIANZA &amp; HUEVOS", "menu_bookBIBLIOTECA", "storefrontINVENTARIO &amp; TIENDA", "OPCIÓN A [EVAL] MANAPHY (#490)", "OPCIÓN B [DITTO] DITTO (#132)", "block PROPUESTA BLOQUEADA", "autorenew SIMULAR CASO DITTO", "outgoing_mail ENVIAR SOLICITUD DE CONSENTIMIENTO A AZUL (SIN GASTO DE GP)"]
      },
      {
        id: "37fd513f83c44730bff71ea3683eb2c2",
        title: "Crianza & Huevos — Secuencia de Eclosión Phione",
        classification: "WEB_FLOW",
        resolution: "2560x3620",
        headings: [],
        buttons: ["SISTEMA D-PADeggGUARDERÍA", "badgeFICHA / DATOS", "20mpEQUIPO ACTIVO", "groupJUGADORES", "nest_cam_wired_standCRIANZA &amp; HUEVOS", "menu_bookBIBLIOTECA", "storefrontINVENTARIO &amp; TIENDA", "1. VIBRACIÓN", "2. GRIETAS", "3. DESTELLO", "4. PHIONE ACTIVO", "[BOTÓN A // RECOMENDADO] nest_cam_wired_stand TRAS", "[BOTÓN B // ALMACENAJE] inventory_2 ENVIAR A CAJA", "[SELECT // COMMS LINK] cable NOTIFICAR A ENTRENADO"]
      },
      {
        id: "1d780d729c334451bb76a66d32e5b40c",
        title: "Crianza & Huevos — Animación Interactiva de Eclosión Phione",
        classification: "WEB_FLOW",
        resolution: "2560x3866",
        headings: [],
        buttons: ["SISTEMA D-PADeggGUARDERÍA", "badgeFICHA / DATOS", "20mpEQUIPO ACTIVO", "groupJUGADORES", "nest_cam_wired_standCRIANZA &amp; HUEVOS", "menu_bookBIBLIOTECA", "storefrontINVENTARIO &amp; TIENDA", "play_arrow REPRODUCIR SECUENCIA AUTOMÁTICA", "restart_alt ↺ REINICIAR", "1. VIBRACIÓN", "2. GRIETAS", "3. DESTELLO", "4. PHIONE ACTIVO", "Saltar a Revelación", "[BOTÓN A // RECOMENDADO] nest_cam_wired_stand TRAS", "[BOTÓN B // ALMACENAJE] inventory_2 ENVIAR A CAJA"]
      },
      {
        id: "8d10ad1d2610466da8daaaa48f1e0d30",
        title: "Crianza & Huevos — Entrega de 2 Huevos & Incubación con GP",
        classification: "WEB_PAGE",
        resolution: "2560x2624",
        headings: ["CMD-10 CICLO COMPLETADO // ENTREGA SIMÉTRICA &amp; CÁMARA DE INCUBACIÓN", "CÁMARA DE INCUBACIÓN", "ACELERACIÓN GP"],
        buttons: ["SISTEMA D-PADeggGUARDERÍA", "badgeFICHA / DATOS", "20mpEQUIPO ACTIVO", "groupJUGADORES", "nest_cam_wired_standCRIANZA &amp; HUEVOS", "menu_bookBIBLIOTECA", "storefrontINVENTARIO &amp; TIENDA", "DETALLES", "fast_forward CONFIRMAR ACELERACIÓN (-50 GP)", "history VER HISTORIAL DE GUARDIPUNTOS"]
      }
    ]
  },
  {
    route: "/perfil",
    title: "Perfil, Notificaciones y Privacidad",
    domain: "core",
    state: "UI_PROTOTYPE",
    component: "ProfileView",
    notes: "Datos locales de la app; sin cuentas ni sincronización.",
    sources: [
      {
        id: "757ca63c66234011b64be17e3ca8131d",
        title: "Perfil de Jugador, Notificaciones & Privacidad",
        classification: "WEB_PAGE",
        resolution: "2560x4158",
        headings: ["BANDEJA DE EVENTOS", "CONMUTADORES RFC", "GARANTÍA INMUTABLE", "GESTIÓN SOCIAL &amp; ENLACE BILATERAL"],
        buttons: ["SISTEMA D-PADeggGUARDERÍA", "badgeFICHA / DATOS", "20mpEQUIPO ACTIVO", "groupJUGADORES", "nest_cam_wired_standCRIANZA &amp; HUEVOS", "menu_bookBIBLIOTECA", "storefrontINVENTARIO &amp; TIENDA", "qr_code_2 EMITIR BEACON LOCAL (BROADCAST)", "TODAS (4)", "CRIANZA &amp; HUEVOS (1)", "GUARDERÍA COMPARTIDA (1)", "SEGURIDAD &amp; AMIGOS (2)", "VER EN INCUBADORA", "DESCARTAR", "LOG COMPLETO", "ACEPTAR ENLACE"]
      }
    ]
  },
  {
    route: "/jugadores",
    title: "Directorio de Jugadores y Guarderías",
    domain: "core",
    state: "UI_PROTOTYPE",
    component: "PlayersView",
    notes: "Contrato PG-08: local sin cuentas; nada de datos remotos.",
    sources: [
      {
        id: "25d1b91e4ab54bb9af2371a1c9d9cb05",
        title: "Directorio de Jugadores & Guarderías Compartidas",
        classification: "WEB_PAGE",
        resolution: "2560x2318",
        headings: ["DIRECTORIO DE GUARDERÍAS EN RED", "REFUGIO JOHTO", "CUEVA CELESTE", "BOSQUE VERDE", "MONTE PLATEADO", "ESTANCIA ACTIVA", "NUEVA SOLICITUD DE DEPÓSITO", "MODIFICAR PERMISOS // MANAPHY"],
        buttons: ["COMMAND DECK▼ PKGeggGuardería", "query_statsFicha / Datos", "shieldEquipo Activo", "groupJugadoresNET", "inventory_2Biblioteca", "backpackInventario & Tienda", "▶ TODAS (4)", "CON PLAZAS (2)", "SOLO AMIGOS (1)", "EN LÍNEA (2)", "ONLINE • ID #08491 REFUGIO JOHTO Anfitrión: Luna (Criadora Experta) PLAZAS 1", "ONLINE • ID #00002 CUEVA CELESTE Anfitrión: Azul (Líder Gimnasio) PLAZAS 2 /", "DESCONECTADO • RFC ASÍNCRONO OK BOSQUE VERDE Anfitrión: Gold (Campeón Johto)", "PRIVADA • ID #00001 MONTE PLATEADO Anfitrión: Rojo (Leyenda Kanto) lock e", "transfer_within_a_station ESTANCIA ACTIVA ACTIVO (FASE 4/7)", "undo [SOLICITAR RECOGIDA INMEDIATA]"]
      }
    ]
  },
  {
    route: "/tienda",
    title: "Tienda de Guardipuntos",
    domain: "core",
    state: "UI_PROTOTYPE",
    component: "ShopView",
    notes: "Economía no implementada: catálogo visual, sin compras reales.",
    sources: [
      {
        id: "ba30ae2e56854a08826d0849afd45bd3",
        title: "Tienda de Guardipuntos (GP) & Editor de Decoración",
        classification: "WEB_PAGE",
        resolution: "2560x3272",
        headings: ["Carcasa Carmesí 1999 (Original)", "Carcasa 'Atomic Purple' Translúcida", "Carcasa Oro 'Arcoíris Sagrado'", "Carcasa Plata 'Islas Remolino'", "Tapete Circular Johto Verde", "Tapete Marino Templo del Mar", "Radio Retro Pokéflauta 101.5 FM", "Maceta Rústica Baya Aranja", "Lámpara Pokéball Pixelada", "Pelota Saltarina de Parque Nacional", "Espejo Pulido Acero-Valle", "Cepillo de Crines Suave Ponyta"],
        buttons: ["SISTEMA D-PADeggGUARDERÍA", "badgeFICHA / DATOS", "20mpEQUIPO ACTIVO", "groupJUGADORES", "nest_cam_wired_standCRIANZA &amp; HUEVOS", "menu_bookBIBLIOTECA", "storefrontINVENTARIO &amp; TIENDA", "smartphone Carcasas", "cottage Mobiliario", "toys Juguetes", "Todos", "En Inventario", "Por Comprar", "EN USO", "CANJEAR [150 GP]", "CANJEAR [250 GP]"]
      }
    ]
  },
  {
    route: "/forensics",
    title: "Inspección Forense PKHeX",
    domain: "forensics",
    state: "PARTIAL",
    component: "ForensicsView",
    notes: "Tres paneles: detalle de legalidad, Time Capsule y checklist Gen II. Reutiliza datos reales cuando hay save cargado.",
    sources: [
      {
        id: "bd45903df0cb4a77b77c7d004d875a91",
        title: "Inspección Forense — Detalle de Legalidad PKHeX (Celebi GS-Ball)",
        classification: "WEB_PAGE",
        resolution: "2560x2916",
        headings: ["ESPECIE #251: CELEBI (CORRUPTO / GAMESHARK INJECT)"],
        buttons: ["CHASSIS BUSSYS·LINK GBCD-PAD SHORTCUTS▲EQUIPO[01]", "▶GUARDERÍA[02]", "▼BIBLIOTECA[03]", "◀TIENDA[04]", "Guardería", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Inventario &amp; Tienda", "close ✕ ESC / CERRAR DIÁLOGO", "emergency_home AISLAR / ENVIAR A CUARENTENA SLOT #99", "build_circle CORREGIR CON PKHEX-CANON (DRY RUN) SIMULACIÓN", "delete_forever LIBERAR DE SRAM (RESTABLECER CANON) ZERO_FILL"]
      },
      {
        id: "c9b329e285e140ada55e4e130e2ca1f0",
        title: "Inspección Forense — Protocolo Time Capsule (Gen I ↔ Gen II)",
        classification: "WEB_PAGE",
        resolution: "2560x4068",
        headings: [],
        buttons: ["CHASSIS BUSSYS·LINK GBCD-PAD SHORTCUTS▲EQUIPO[01]", "▶GUARDERÍA[02]", "▼BIBLIOTECA[03]", "◀TIENDA[04]", "Guardería", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Inventario &amp; Tienda", "sync RE-VERIFICAR LINK", "description EXPORTAR REPORTE TXT", "shield BLOQUEAR MOVIMIENTO ILEGAL", "sports_esports SIMULAR TRADEBACK R/B/Y", "save GENERAR .PK1 / .PK2 CONVERTIDO"]
      },
      {
        id: "e580437cd19343eb9bb9ec70720f1b06",
        title: "Inspección Forense — Checklist de Legalidad PKHeX (Gen II)",
        classification: "WEB_PAGE",
        resolution: "2560x3000",
        headings: ["AUDITORÍA &amp; CHECKLIST DE LEGALIDAD PKHEX // GENERACIÓN II"],
        buttons: ["CHASSIS BUSSYS·LINK GBCD-PAD SHORTCUTS▲EQUIPO[01]", "▶GUARDERÍA[02]", "▼BIBLIOTECA[03]", "◀TIENDA[04]", "Guardería", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Inventario &amp; Tienda", "refresh Re-Escanear Save", "description Exportar TXT", "bolt Corregir DVs", "shield Cuarentena", "save Volcar .SAV Nuevo"]
      }
    ]
  },
  {
    route: "/studio/theme",
    title: "Theme Studio — Galería",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Overview del estudio; tokens del tema Pocket Tech 1999.",
    sources: [
      {
        id: "e5eaddbd77c04e3b8bed11938292568a",
        title: "Theme Studio — Overview & Visual Theme Gallery",
        classification: "WEB_PAGE",
        resolution: "2560x4068",
        headings: ["Theme Studio", "PREDEFINED THEME GALLERY", "POKÉGUARDE CLASSIC", "POKÉGUARDE DARK", "RETRO LCD", "POKÉGUARDE MINIMAL", "POKÉGUARDE MODERN", "NUEVO TEMA PERSONALIZADO"],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESGuar", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Tienda &amp; Decoración", "&gt; OVERVIEW &amp; GALLERY", "&gt; GLOBAL COLORS", "&gt; TYPOGRAPHY", "&gt; SPACING &amp; DENSITY", "&gt; COMPONENT STUDIO", "&gt; LAYOUT MANAGER", "&gt; LIVE PREVIEW", "&gt; TOKEN MANAGER", "&gt; DESIGN.MD SYNC"]
      }
    ]
  },
  {
    route: "/studio/theme/colors",
    title: "Theme Studio — Color",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Módulo de paleta; edición persistente no implementada.",
    sources: [
      {
        id: "73cdd1fd6c6b4e95bbb8c32200211d02",
        title: "Theme Studio — Global Color Editor & Token Palette",
        classification: "WEB_PAGE",
        resolution: "2560x4036",
        headings: [],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESGuar", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Tienda &amp; Decoración", "&gt; OVERVIEW &amp; GALLERY", "&gt; GLOBAL COLORS", "&gt; TYPOGRAPHY", "&gt; SPACING &amp; DENSITY", "&gt; COMPONENT STUDIO", "&gt; LAYOUT MANAGER", "&gt; LIVE PREVIEW", "&gt; TOKEN MANAGER", "&gt; DESIGN.MD SYNC"]
      }
    ]
  },
  {
    route: "/studio/theme/typography",
    title: "Theme Studio — Tipografía",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Escala de encabezados.",
    sources: [
      {
        id: "71ad15543a264619921742dcc20e3a9a",
        title: "Theme Studio — Módulo 02: Typography Studio & Heading Scale",
        classification: "WEB_PAGE",
        resolution: "2560x3524",
        headings: ["Chikorita — Crianza Avanzada", "Sinergia en Guardería: +12 GP/Hora"],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESGuar", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Tienda &amp; Decoración", "&gt; OVERVIEW &amp; GALLERY", "&gt; GLOBAL COLORS", "&gt; TYPOGRAPHY", "&gt; SPACING &amp; DENSITY", "&gt; COMPONENT STUDIO", "&gt; LAYOUT MANAGER", "&gt; LIVE PREVIEW", "&gt; TOKEN MANAGER", "&gt; DESIGN.MD SYNC"]
      }
    ]
  },
  {
    route: "/studio/theme/spacing",
    title: "Theme Studio — Espaciado",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Densidad y espaciado.",
    sources: [
      {
        id: "15d5c374ea1d4352a4c298b467b43b99",
        title: "Theme Studio — Módulo 03: Spacing & Density Editor",
        classification: "WEB_PAGE",
        resolution: "2560x2696",
        headings: [],
        buttons: ["PKG-02 SILVER4.19 MHzPWR: 100% [DC-IN]ONLINE LINKTRAINER REGREDWALLET450 GPCORE", "badgeFicha / Datos", "swordsEquipo Activo", "groupJugadores", "eggCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "grid_viewOverview &amp; Gallery", "colorizeGlobal Colors", "match_caseTypography", "straightenSpacing &amp; Density", "widgetsComponent Studio", "dashboard_customizeLayout Manager", "devicesLive Preview", "tokenToken Manager", "sync_altDESIGN.MD Sync"]
      }
    ]
  },
  {
    route: "/studio/theme/components",
    title: "Theme Studio — Componentes",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Catálogo atómico.",
    sources: [
      {
        id: "21e0a77821a149f08e75ecc65a6f8bab",
        title: "Theme Studio — Módulo 04: Component Studio & Atomic Catalog",
        classification: "WEB_PAGE",
        resolution: "2560x3836",
        headings: [],
        buttons: ["PokéguardeOS v2.4 // SilverCOM[ Core Modules ]07eggGuardería", "badgeFicha / Datos", "20mpEquipo Activo", "groupJugadores", "nest_multi_roomCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "▶ Overview &amp; Gallery", "▶ Global Colors", "▶ Typography", "▶ Spacing &amp; Density", "▶ Component Studio", "▶ Layout Manager", "▶ Live Preview", "▶ Token Manager", "▶ DESIGN.md Sync"]
      }
    ]
  },
  {
    route: "/studio/theme/layout",
    title: "Theme Studio — Layout",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Geometría de rejilla.",
    sources: [
      {
        id: "83cce8b75bf44459b992a515cd727781",
        title: "Theme Studio — Módulo 05: Layout Manager & Grid Geometry",
        classification: "WEB_PAGE",
        resolution: "2560x4770",
        headings: [],
        buttons: ["PokéguardeOS v2.4 // SilverCOM[ Core Modules ]07eggGuardería", "badgeFicha / Datos", "20mpEquipo Activo", "groupJugadores", "nest_multi_roomCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "▶ Overview &amp; Gallery", "▶ Global Colors", "▶ Typography", "▶ Spacing &amp; Density", "▶ Component Studio", "▶ Layout Manager", "▶ Live Preview", "▶ Token Manager", "▶ DESIGN.md Sync"]
      }
    ]
  },
  {
    route: "/studio/theme/preview",
    title: "Theme Studio — Vista previa",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Matriz multipantalla.",
    sources: [
      {
        id: "2934c8ca176d4020ae9368364b0c0537",
        title: "Theme Studio — Módulo 06: Live Preview Multipantalla & Matrix Studio",
        classification: "WEB_PAGE",
        resolution: "2560x2746",
        headings: [],
        buttons: ["PokéguardeOS v2.4 // SilverCOM[ Core Modules ]07eggGuardería", "badgeFicha / Datos", "20mpEquipo Activo", "groupJugadores", "nest_multi_roomCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "▶ Overview &amp; Gallery", "▶ Global Colors", "▶ Typography", "▶ Spacing &amp; Density", "▶ Component Studio", "▶ Layout Manager", "▶ Live Preview", "▶ Token Manager", "▶ DESIGN.md Sync"]
      }
    ]
  },
  {
    route: "/studio/theme/tokens",
    title: "Theme Studio — Tokens",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Gestor de tokens y bindings.",
    sources: [
      {
        id: "234d533523914394875f4dba7e447a67",
        title: "Theme Studio — Módulo 07: Token Manager & Bindings",
        classification: "WEB_PAGE",
        resolution: "2560x3722",
        headings: ["THEME 01 // POKÉGUARDE CLASSIC (CANÓNICO)", "BLOQUE A // MATRIZ CENTRAL DE TOKENS &amp; INSPECCIÓN DE VALORES", "BLOQUE B // GRAPH DE DEPENDENCIAS &amp; CADENA DE ALIAS", "PANEL C // MOTOR DE BINDINGS", "PANEL D // AUDITORÍA DE CONTRASTE &amp; INTEGRIDAD"],
        buttons: ["PokéguardeOS v2.4 // SilverCOM[ Core Modules ]07eggGuardería", "badgeFicha / Datos", "20mpEquipo Activo", "groupJugadores", "nest_multi_roomCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "▶ Overview &amp; Gallery", "▶ Global Colors", "▶ Typography", "▶ Spacing &amp; Density", "▶ Component Studio", "▶ Layout Manager", "▶ Live Preview", "▶ Token Manager", "▶ DESIGN.md Sync"]
      }
    ]
  },
  {
    route: "/studio/theme/designmd",
    title: "Theme Studio — DESIGN.md",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Sincronización documental; no escribe ficheros.",
    sources: [
      {
        id: "fedf5d38b1f2451dbd97c1c1adc91792",
        title: "Theme Studio — Módulo 08: DESIGN.md Sync & Repository Pipeline",
        classification: "WEB_PAGE",
        resolution: "2560x3516",
        headings: ["THEME 01 // POKÉGUARDE CLASSIC", "SECTIONS VALIDATOR &amp; AST NODES TREE", "GIT STAGING &amp; DEPLOYMENT", "REVISION SNAPSHOTS"],
        buttons: ["PokéguardeOS v2.4 // SilverCOM[ Core Modules ]07Guardería", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Tienda &amp; Decoración", "▶ Overview &amp; Gallery", "▶ Global Colors", "▶ Typography", "▶ Spacing &amp; Density", "▶ Component Studio", "▶ Layout Manager", "▶ Live Preview", "▶ Token Manager", "▶ DESIGN.md SyncACTIVE"]
      }
    ]
  },
  {
    route: "/studio/theme/tripanel",
    title: "Theme Studio — Editor tri-panel",
    domain: "theme",
    state: "UI_PROTOTYPE",
    component: "ThemeStudio",
    notes: "Workspace combinado con vista previa.",
    sources: [
      {
        id: "7300c5b9955643ea8f5ae95bb5bf37c4",
        title: "Theme Studio — Editor Tri-Panel & Live Preview Multipantalla",
        classification: "WEB_PAGE",
        resolution: "2560x2472",
        headings: [],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESGuar", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Tienda &amp; Decoración", "&gt; OVERVIEW &amp; GALLERY", "&gt; GLOBAL COLORS", "&gt; TYPOGRAPHY", "&gt; SPACING &amp; DENSITY", "&gt; COMPONENT STUDIO", "&gt; LAYOUT MANAGER", "&gt; LIVE PREVIEW", "&gt; TOKEN MANAGER", "&gt; DESIGN.MD SYNC"]
      }
    ]
  },
  {
    route: "/studio/shell",
    title: "Shell Studio — Workspace",
    domain: "creator_shell",
    state: "UI_PROTOTYPE",
    component: "ShellStudio",
    notes: "Editor tri-panel de carcasas; sin exportación real.",
    sources: [
      {
        id: "fa47a8c2c6ec4d958a1f67422779d0b6",
        title: "Shell Studio — Workspace Principal Tri-Panel & Editor de Carcasas",
        classification: "WEB_PAGE",
        resolution: "2560x2408",
        headings: [],
        buttons: ["POKEGUARDESTUDIO CHASSIS v2.4CARTRIDGE BUSgrid_viewDashboard", "shelvesHabitat Library", "architectureHabitat Editor", "categoryAsset Library", "local_fire_departmentElemental Presets", "smart_toyPreview &amp; Testing", "saveExport Center", "settingsSettings", "syncCOMPILE", "play_arrowTEST RUN", "save Guardar", "verified Validar (0 Err)", "visibility Device Preview", "archive Exportar Pack", "palette SHELL REPOSITORY 24 MOLDES search ⌘K TODOS (24)", "ELEM (18)"]
      }
    ]
  },
  {
    route: "/studio/shell/export",
    title: "Shell Studio — Export Center",
    domain: "creator_shell",
    state: "UI_PROTOTYPE",
    component: "ShellStudio",
    notes: "Máscara WebP y manifiesto JSON: maqueta, sin descargas.",
    sources: [
      {
        id: "60f8b75cee31477b94ad6d4f09376aa9",
        title: "Shell Studio — Export Center (WebP Mask & JSON Manifest)",
        classification: "WEB_PAGE",
        resolution: "2560x2232",
        headings: ["PAQUETE &amp; MOLDES", "INSPECTOR ÓPTICO // ALFA 100%", "SHELL-MANIFEST.JSON"],
        buttons: ["POKEGUARDESTUDIO CHASSIS v2.4CARTRIDGE BUSgrid_viewDashboard", "shelvesHabitat Library", "architectureHabitat Editor", "categoryAsset Library", "local_fire_departmentElemental Presets", "smart_toyPreview &amp; Testing", "saveExport Center", "settingsSettings", "syncCOMPILE", "play_arrowTEST RUN", "tuneWORKSPACE EDITOR", "devicesDEVICE PREVIEW", "EXPORT CENTER (ACTIVO)", "terminalVALIDATION LOGS", "1X (160p)", "2X (RETINA)"]
      }
    ]
  },
  {
    route: "/studio/shell/preview",
    title: "Shell Studio — Vista multiángulo",
    domain: "creator_shell",
    state: "UI_PROTOTYPE",
    component: "ShellStudio",
    notes: "Frente, 3/4 y dorso.",
    sources: [
      {
        id: "b62752700f894385a3616b6985cbd548",
        title: "Shell Studio — Device Preview Multi-Ángulo (Frente, 3/4 y Dorso)",
        classification: "WEB_PAGE",
        resolution: "2560x3404",
        headings: [],
        buttons: ["POKEGUARDESTUDIO CHASSIS v2.4CARTRIDGE BUSgrid_viewDashboard", "shelvesHabitat Library", "architectureHabitat Editor", "categoryAsset Library", "local_fire_departmentElemental Presets", "smart_toyPreview &amp; Testing", "saveExport Center", "settingsSettings", "syncCOMPILE", "play_arrowTEST RUN", "view_in_ar MULTI-VISTA (0° + 30° + 180°)", "crop_portrait FRENTE (0°)", "deployed_code 3/4 ISOMÉTRICO (30°)", "flip DORSO (180°)", "compare_arrows SPLIT A/B", "CHIKORITA 160x144"]
      }
    ]
  },
  {
    route: "/studio/habitat",
    title: "Habitat Studio — Editor",
    domain: "habitat",
    state: "UI_PROTOTYPE",
    component: "HabitatStudio",
    notes: "Workspace principal. No modifica ROOM ni el Canvas protegido.",
    sources: [
      {
        id: "ad7dddf3c06b44f7b46f2bf77a6a2c41",
        title: "Habitat Editor — Primary Workspace",
        classification: "WEB_PAGE",
        resolution: "2560x2048",
        headings: [],
        buttons: ["POKEGUARDECREATOR SUITEHABITAT V-ENGINEREV 2.1grid_viewDashboard", "shelvesHabitat Library", "handymanHabitat Editor", "perm_mediaAsset Library", "nest_farsight_weatherElemental Presets", "smart_toyPreview &amp; Testing", "system_update_altExport Center", "tuneSettings", "undo", "redo", "remove", "add", "play_arrowPREVIEW", "file_downloadEXPORT", "near_me", "highlight_alt"]
      }
    ]
  },
  {
    route: "/studio/habitat/devices",
    title: "Habitat Studio — Dispositivo",
    domain: "habitat",
    state: "UI_PROTOTYPE",
    component: "HabitatStudio",
    notes: "Simulador de carcasa y LCD.",
    sources: [
      {
        id: "670ec1e657354994b61003123550371c",
        title: "Habitat Studio — Tamagotchi Device Preview & Chassis Simulator",
        classification: "WEB_PAGE",
        resolution: "2560x2048",
        headings: [],
        buttons: ["POKEGUARDESTUDIO CHASSIS v2.4CARTRIDGE BUSgrid_viewDashboard", "shelvesHabitat Library", "architectureHabitat Editor", "categoryAsset Library", "local_fire_departmentElemental Presets", "smart_toyPreview &amp; Testing", "saveExport Center", "settingsSettings", "syncCOMPILE", "play_arrowTEST RUN", "100%", "200%", "300% (3x)", "FIT", "grid_4x4 GRID 8x8", "crop_free SAFE (160×144)"]
      }
    ]
  },
  {
    route: "/studio/habitat/library",
    title: "Habitat Studio — Biblioteca",
    domain: "habitat",
    state: "UI_PROTOTYPE",
    component: "HabitatStudio",
    notes: "Presets ambientales; solo referencia visual.",
    sources: [
      {
        id: "1c4e250da1d74a79adc9f7e4545c8099",
        title: "Habitat Studio — Habitat Library & Environmental Presets",
        classification: "WEB_PAGE",
        resolution: "2560x3256",
        headings: ["HABITAT LIBRARY", "Classic Bedroom", "Fire Chamber", "Aquatic Sanctuary", "Forest Retreat", "Frozen Cavern", "Electric Laboratory", "Rocky Shelter", "Create New Habitat"],
        buttons: ["POKEGUARDECREATOR SUITEHABITAT V-ENGINEREV 2.1grid_viewDashboard", "shelvesHabitat Library", "handymanHabitat Editor", "perm_mediaAsset Library", "nest_farsight_weatherElemental Presets", "smart_toyPreview &amp; Testing", "system_update_altExport Center", "tuneSettings", "undo", "redo", "remove", "add", "play_arrowPREVIEW", "file_downloadEXPORT", "file_upload IMPORT HABITAT", "add_circle NEW HABITAT"]
      }
    ]
  },
  {
    route: "/studio/marketing",
    title: "Marketing Studio — Overview",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Pantalla maestra del Studio.",
    sources: [
      {
        id: "d8bee907486a42a39beaa658ced48825",
        title: "Marketing Studio — Overview (Pantalla Maestra)",
        classification: "WEB_PAGE",
        resolution: "2560x4128",
        headings: ["Marketing Studio", "Proyectos Recientes", "Lanzamiento Oficial Pokeguarde 1999", "Social Post — Gen II Daycare Reveal", "Boletín de Actualizaciones #04", "Cronograma de Campañas Q4", "Cola de Publicación Inmediata"],
        buttons: ["POKÉGUARDEOS Ver. 2.44 EXPESTADO NAVEGACIÓNGuardería01", "Ficha / Datos02", "Equipo Activo03", "Jugadores04", "Crianza &amp; Huevos05", "Biblioteca06", "Tienda &amp; Decoración07", "\uD83D\uDD12 Marketing Studio★", "Brand Kit", "Social Media", "Creative Canvas", "Press Kit", "Roadmap", "Campaigns", "AI Copy", "Localization"]
      }
    ]
  },
  {
    route: "/studio/marketing/brand",
    title: "Marketing — Brand Kit",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Bóveda de marca.",
    sources: [
      {
        id: "d31014d6779a49b5a835b56f20325a7a",
        title: "Marketing Studio — Módulo 01: Brand Kit & Bóveda de Marca",
        classification: "WEB_PAGE",
        resolution: "2560x5128",
        headings: ["BRAND KIT", "Logo Primario Canónico", "Logotipo Horizontal Completo", "Emblema Hardware / Favicon"],
        buttons: ["POKÉGUARDEOS Ver. 2.44 EXPESTADO NAVEGACIÓNGuardería01", "Ficha / Datos02", "Equipo Activo03", "Jugadores04", "Crianza &amp; Huevos05", "Biblioteca06", "Tienda &amp; Decoración07", "\uD83D\uDD12 Marketing Studio★", "Brand Kit", "Social Media", "Creative Canvas", "Press Kit", "Roadmap", "Campaigns", "AI Copy", "Localization"]
      }
    ]
  },
  {
    route: "/studio/marketing/social",
    title: "Marketing — Social",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Sin publicación externa.",
    sources: [
      {
        id: "5e303f4db15444a4b08628dbcb8478b3",
        title: "Marketing Studio — Módulo 02: Social Media Studio",
        classification: "WEB_PAGE",
        resolution: "2560x3450",
        headings: [],
        buttons: ["POKÉGUARDEOS Ver. 2.44 EXPESTADO NAVEGACIÓNGuardería01", "Ficha / Datos02", "Equipo Activo03", "Jugadores04", "Crianza &amp; Huevos05", "Biblioteca06", "Tienda &amp; Decoración07", "\uD83D\uDD12 Marketing Studio★", "Brand Kit", "Social Media", "Creative Canvas", "Press Kit", "Roadmap", "Campaigns", "AI Copy", "Localization"]
      }
    ]
  },
  {
    route: "/studio/marketing/creative",
    title: "Marketing — Banner & Canvas",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Editor tri-panel.",
    sources: [
      {
        id: "2792aede64e244ccb8d195e85357a20d",
        title: "Marketing Studio — Módulo 03: Banner & Creative Canvas (Editor Tri-Panel) [Corregido]",
        classification: "WEB_PAGE",
        resolution: "2560x2424",
        headings: ["ESTUDIO DE COMPOSICIÓN GRÁFICA // 1999 ENGINE", "GUARDA, CRÍA Y ENTRENA TUS POKÉMON CLÁSICOS"],
        buttons: ["POKÉGUARDEOS Ver. 2.44 EXPESTADO NAVEGACIÓNGuardería01", "Ficha / Datos02", "Equipo Activo03", "Jugadores04", "Crianza &amp; Huevos05", "Biblioteca06", "Tienda &amp; Decoración07", "\uD83D\uDD12 Marketing Studio★", "Brand Kit", "Social Media", "Creative Canvas●", "Press Kit", "Roadmap", "Campaigns", "AI Copy", "Localization"]
      }
    ]
  },
  {
    route: "/studio/marketing/press",
    title: "Marketing — Press Kit",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Dossier de prensa.",
    sources: [
      {
        id: "314244b46ca74443a1f6ff6b2195ee5c",
        title: "Marketing Studio — Módulo 04: Press Kit & Dossier de Prensa",
        classification: "WEB_PAGE",
        resolution: "2560x7036",
        headings: ["01 // FICHA TÉCNICA (FACTSHEET OFICIAL)", "02 // TEXTOS EDITORIALES Y DESCRIPCIONES (BOILERPLATES)", "03 // PREGUNTAS FRECUENTES PARA PERIODISTAS (Q&amp;A EDITORIAL)", "04 // CLÁUSULA LEGAL &amp; TRADEMARK NOTICE", "ASSET 01: MASTER SHELL", "ASSET 02: LOGOS &amp; WORDMARKS", "ASSET 03: IN-GAME CAPTURES", "BRAND COLORS &amp; TYPE"],
        buttons: ["POKÉGUARDEOS Ver. 2.44 EXPESTADO NAVEGACIÓNGuardería01", "Ficha / Datos02", "Equipo Activo03", "Jugadores04", "Crianza &amp; Huevos05", "Biblioteca06", "Tienda &amp; Decoración07", "\uD83D\uDD12 Marketing Studio★", "Brand Kit", "Social Media", "Creative Canvas●", "Press Kit", "Roadmap", "Campaigns", "AI Copy", "Localization"]
      }
    ]
  },
  {
    route: "/studio/marketing/roadmap",
    title: "Marketing — Roadmap",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Anuncios.",
    sources: [
      {
        id: "fa83a4be7f4342cfbf5f6d99739d1487",
        title: "Marketing Studio — Módulo 05: Roadmap & Anuncios",
        classification: "WEB_PAGE",
        resolution: "2560x3544",
        headings: ["developer_board Roadmap Público &amp; Gestor de Comunicados"],
        buttons: ["POKÉGUARDEOS Ver. 2.44 EXPESTADO NAVEGACIÓNGuardería01", "Ficha / Datos02", "Equipo Activo03", "Jugadores04", "Crianza &amp; Huevos05", "Biblioteca06", "Tienda &amp; Decoración07", "\uD83D\uDD12 Marketing Studio★", "Brand Kit", "Social Media", "Creative Canvas●", "Press Kit", "Roadmap", "Campaigns", "AI Copy", "Localization"]
      }
    ]
  },
  {
    route: "/studio/marketing/campaigns",
    title: "Marketing — Campaigns",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Campañas y newsletter; sin envío real.",
    sources: [
      {
        id: "8ffd2ff3f78e42618726ac04e924093b",
        title: "Marketing Studio — Módulo 06: Campaign Studio & Newsletter",
        classification: "WEB_PAGE",
        resolution: "2560x3418",
        headings: ["LANZAMIENTO v2.45: JOHTO DAYCARE OVERHAUL", "EVENTO COMUNITARIO: ECLOSIÓN DEL HUEVO MANAPHY", "BOLETÍN MENSUAL: RETRO ARCHAEOLOGY #04", "CAMPAÑA PRESERVACIÓN: DRY-RUN SRAM AUDIT"],
        buttons: ["POKÉGUARDEOS Ver. 2.44 EXPESTADO NAVEGACIÓNGuardería01", "Ficha / Datos02", "Equipo Activo03", "Jugadores04", "Crianza &amp; Huevos05", "Biblioteca06", "Tienda &amp; Decoración07", "\uD83D\uDD12 Marketing Studio★", "Brand Kit", "Social Media", "Creative Canvas●", "Press Kit", "Roadmap", "Campaigns", "AI Copy", "Localization"]
      }
    ]
  },
  {
    route: "/studio/marketing/copy",
    title: "Marketing — AI Copywriter",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Redacción local y determinista; sin LLM en bucle.",
    sources: [
      {
        id: "173af7a28b2742ae81e3082d72044408",
        title: "Marketing Studio — Módulo 07: AI Copywriter & Redacción Contextual",
        classification: "WEB_PAGE",
        resolution: "2560x4540",
        headings: [],
        buttons: ["POKÉGUARDEOS Ver. 2.44 EXPESTADO NAVEGACIÓNGuardería01", "Ficha / Datos02", "Equipo Activo03", "Jugadores04", "Crianza &amp; Huevos05", "Biblioteca06", "Tienda &amp; Decoración07", "\uD83D\uDD12 Marketing Studio★", "Brand Kit", "Social Media", "Creative Canvas●", "Press Kit", "Roadmap", "Campaigns", "AI Copy", "Localization"]
      }
    ]
  },
  {
    route: "/studio/marketing/localization",
    title: "Marketing — Localización",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Glosario protegido.",
    sources: [
      {
        id: "49de641566e147b7afb70fd9f5b38fdb",
        title: "Marketing Studio — Módulo 08: Localización & Glosario Protegido",
        classification: "WEB_PAGE",
        resolution: "2560x2640",
        headings: [],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESeggG", "badgeFicha / Datos", "swordsEquipo Activo", "groupsJugadores", "nest_cam_indoorCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "&gt;Brand Kit", "&gt;Social Media", "&gt;Creative Canvas", "&gt;Press Kit", "&gt;Roadmap", "&gt;Campaigns", "&gt;AI Copy", "&gt;LOCALIZATION", "&gt;Media Library"]
      }
    ]
  },
  {
    route: "/studio/marketing/assets",
    title: "Marketing — Media Library",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "DAM local, sin subidas.",
    sources: [
      {
        id: "df59d4f97ebc44ea973c93b55174ceaf",
        title: "Marketing Studio — Módulo 09: Media Library & Asset Manager (DAM)",
        classification: "WEB_PAGE",
        resolution: "2560x2770",
        headings: ["Pokeguarde Shell Master", "Banner Campaña 16:9", "Habitación Guardería GBC", "Chikorita Overworld Sheet", "Manaphy Overworld Sheet", "Social Card 1:1 Post", "Boletín Header 16:9", "Electrodo Overworld Tier 40"],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESeggG", "badgeFicha / Datos", "swordsEquipo Activo", "groupsJugadores", "nest_cam_indoorCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "&gt;Brand Kit", "&gt;Social Media", "&gt;Creative Canvas", "&gt;Press Kit", "&gt;Roadmap", "&gt;Campaigns", "&gt;AI Copy", "&gt;LOCALIZATION", "&gt;Media Library"]
      }
    ]
  },
  {
    route: "/studio/marketing/calendar",
    title: "Marketing — Content Calendar",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Calendario editorial.",
    sources: [
      {
        id: "b6af4fd14f6b42898c54e5a8e99d6b98",
        title: "Marketing Studio — Módulo 10: Content Calendar (Calendario Editorial)",
        classification: "WEB_PAGE",
        resolution: "2560x2876",
        headings: [],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESeggG", "badgeFicha / Datos", "swordsEquipo Activo", "groupsJugadores", "nest_cam_indoorCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "&gt;Brand Kit", "&gt;Social Media", "&gt;Creative Canvas", "&gt;Press Kit", "&gt;Roadmap", "&gt;Campaigns", "&gt;AI Copy", "&gt;LOCALIZATION", "&gt;Media Library"]
      }
    ]
  },
  {
    route: "/studio/marketing/community",
    title: "Marketing — Community Hub",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Discord y recursos: enlaces inertes.",
    sources: [
      {
        id: "85db2f6666d64917bd941ab44f2db25f",
        title: "Marketing Studio — Módulo 11: Community Hub (Discord & Recursos)",
        classification: "WEB_PAGE",
        resolution: "2560x3538",
        headings: ["hub COMMUNITY HUB &amp; DISCORD RESOURCE CENTER", "TORNEO DE CRIANZA JOHTO: SEMANA DEL HUEVO PHIONE", "\uD83D\uDCE2 ¡La Guardería Johto v2.45 ya está disponible!"],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESeggG", "badgeFicha / Datos", "swordsEquipo Activo", "groupsJugadores", "nest_cam_indoorCrianza &amp; Huevos", "menu_bookBiblioteca", "storefrontTienda &amp; Decoración", "&gt;Brand Kit", "&gt;Social Media", "&gt;Creative Canvas", "&gt;Press Kit", "&gt;Roadmap", "&gt;Campaigns", "&gt;AI Copy", "&gt;LOCALIZATION", "&gt;Media Library"]
      }
    ]
  },
  {
    route: "/studio/marketing/analytics",
    title: "Marketing — Analytics",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Métricas de ejemplo NO presentadas como datos reales.",
    sources: [
      {
        id: "e729a99365b54edd94ff31d3dd3825f0",
        title: "Marketing Studio — Módulo 12: Analytics (Métricas & Embudo)",
        classification: "WEB_PAGE",
        resolution: "2560x3642",
        headings: ["Telemetría &amp; Métricas Internas", "Tendencia de Tráfico &amp; Actividad Diaria", "Embudo de Conversión Telemetría (Funnel)", "Desglose de Tráfico por Canal &amp; Campaña", "Crianza &amp; Adopción", "Auditoría &amp; Privacidad", "Objetivo v2.45 Johto"],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESGuar", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Tienda &amp; Decoración", "&gt; Brand Kit", "&gt; Social Media", "&gt; Creative Canvas", "&gt; Press Kit", "&gt; Roadmap", "&gt; Campaigns", "&gt; AI Copy", "&gt; LOCALIZATION", "&gt; Media Library"]
      }
    ]
  },
  {
    route: "/studio/marketing/export",
    title: "Marketing — Export Center",
    domain: "marketing",
    state: "UI_PROTOTYPE",
    component: "MarketingStudio",
    notes: "Empaquetado: sin descargas reales.",
    sources: [
      {
        id: "9acbc3f5614a438aba6b0c3ee58df6c8",
        title: "Marketing Studio — Módulo 13: Export Center (Centro de Exportación & Empaquetado)",
        classification: "WEB_PAGE",
        resolution: "2560x2650",
        headings: ["PRESET BUNDLES // PACKS CERTIFICADOS JOHTO-1999", "SOCIAL MEDIA LAUNCH PACK", "PRESS KIT &amp; MEDIA OUTLETS", "BRAND &amp; ASSET VAULT", "COMMUNITY &amp; DISCORD"],
        buttons: ["SYSTEM OK // PKG-02STN-LCD20mpPOKEGUARDEADMIN SUITE v2.8b SILVERCORE MODULESGuar", "Ficha / Datos", "Equipo Activo", "Jugadores", "Crianza &amp; Huevos", "Biblioteca", "Tienda &amp; Decoración", "&gt; Brand Kit", "&gt; Social Media", "&gt; Creative Canvas", "&gt; Press Kit", "&gt; Roadmap", "&gt; Campaigns", "&gt; AI Copy", "&gt; LOCALIZATION", "&gt; Media Library"]
      }
    ]
  },
  {
    route: "/emulation",
    title: "Emulation — Room Explorer",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Live Wall y explorador. Sin emulación, streaming ni conexiones.",
    sources: [
      {
        id: "6bb51da32c704f1c80d9c0ff72b72dc9",
        title: "PG EMULATION — ROOM EXPLORER / LIVE WALL",
        classification: "WEB_PAGE",
        resolution: "2560x5510",
        headings: ["Pokéguarde", "PG Emulation — Room Explorer &amp; Live Wall", "Mural en Vivo (Prioritary Live Wall) 6 CELDAS DE MONITORIZACIÓN", "Torneo Johto Silver Cup • Ronda 4", "Intercambio Canónico Johto ↔ Kanto", "Sala Abierta: Guardería &amp; Exploración Libre", "Hoenn Battle Frontier Test Hub", "Intercambio Evolutivo: Haunter ➔ Gengar", "Bóveda Privada: Liga Silph Co. [Invitación]", "Adaptador de Emulación Desacoplado &amp; Neutral"],
        buttons: ["PKG-02 SILVER Pokéguarde VIRTUAL HARDWARE 1999", "Habitat Studio (Tiles) 02", "Marketing Suite (DAM) 03", "Theme Studio (Tokens) 04", "Forensics &amp; Legalidad 05", "▶ Live Wall (6 Salas)", "◇ Buscador &amp; Filtros", "◇ Amigos &amp; Invitaciones", "◇ Adapter Sandbox Specs", "refresh SYNC ALL", "add_link CREAR SALA", "Gen I-II (GBC)", "Gen III (GBA)", "Gen IV (DS)", "Gen V (DS-2)", "RB/Y"]
      },
      {
        id: "4b835dcc78664efba319d0281be2b1a2",
        title: "PG EMULATION — LIVE WALL",
        classification: "WEB_PAGE",
        resolution: "2560x4778",
        headings: ["SALA JOHTO-NORTH (01)"],
        buttons: ["POKÉGUARDEPG EMULATION // 1999HW:V2SYSTEM BUS NAVIGATION01 CORE UNITS1. Core: Gu", "2. Habitat Studio", "3. Marketing Suite", "4. Theme Studio", "5. Forensics &amp; Legalidad", "Live Wall▶", "Buscador &amp; Filtros", "Diagnóstico &amp; Desc.", "Sandbox Specs", "TODAS LAS SALAS (6 ACTIVAS)", "FORMATO GBC (4)", "FORMATO GBA (2)", "SOLO TORNEOS", "SOLO INTERCAMBIO", "↻ ACTUALIZAR (F5)", "⊞ MOSAICO 3x2 FIJO"]
      }
    ]
  },
  {
    route: "/emulation/flows",
    title: "Emulation — Mapa de flujos",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Flujo 01-06 documental dentro de la app.",
    sources: [
      {
        id: "9c029d80f66542e094db39311df9d81e",
        title: "PG EMULATION — MAPA DE FLUJOS 01-06",
        classification: "WEB_FLOW",
        resolution: "2560x6068",
        headings: ["MAPA MAESTRO DE FLUJOS DE NAVEGACIÓN &amp; ESTADOS FINITOS (01–06)", "ARQUITECTURA DE FLUJOS INTERCONECTADOS (01 A 06)", "OBSERVAR PARTIDA", "CREAR BATALLA", "UNIRSE A BATALLA", "INTERCAMBIAR", "ADMINISTRAR SALA", "CONFIGURAR EMULADOR", "MATRIZ MAESTRA DE ESTADOS FINITOS &amp; EVENTOS DISPARADORES", "CONSOLA TÁCTIL DE SIMULACIÓN DE DISPAROS"],
        buttons: ["POKÉGUARDE1999SYSTEM CONTROL OS v2.4// SYSTEM DOMAINS01 CORE (GUARDERÍA &amp; SA", "02 HABITAT STUDIO (TILES)", "03 MARKETING SUITE (DAM)", "04 THEME STUDIO (TOKENS)", "05 FORENSICS &amp; LEGALIDAD", "06 PG EMULATION", "- ROOM EXPLORER / LIVE WALL", "- EMULATION ROOMS", "- ROOM SUITE STUDIO", "- MAPA DE FLUJOS 01-06", "- QUICK SWITCHER", "folder_zip EXPORTAR MANIFIESTO .JSON", "rule AUDITAR MATRIZ DE TRANSICIÓN", "RESETEAR DIAGRAMA", "F01: OBS", "F02: CREAR"]
      }
    ]
  },
  {
    route: "/emulation/create",
    title: "Emulation — Crear sala",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Asistente de 9 pasos presentado como prototipo.",
    sources: [
      {
        id: "93854f7301f74bca97d506d15ac0a673",
        title: "PG CREATE ROOM — ASISTENTE 9 PASOS",
        classification: "WEB_FLOW",
        resolution: "2560x3540",
        headings: ["PG CREATE ROOM — ASISTENTE DE CONFIGURACIÓN V2.4", "troubleshoot MATRIZ DE VALIDACIÓN TRI-ESTADO", "PARÁMETROS LINK"],
        buttons: ["PokéguardeEMU ENGINE v1.99PKG-02Chassis Modulesmemory01 CORE (SAV)", "grid_view02 HABITAT (TILES)", "perm_media03 MARKETING (DAM)", "palette04 THEME (TOKENS)", "gavel05 FORENSICS", "▶LIVE WALL", "▶PG ROOM 01", "▶PG ROOM 02", "▶PG ROOM 03", "▶CREAR SALA", "▶BUSCADOR &amp; FILTROS", "▶SANDBOX SPECS", "build_circle APLICAR PARCHE DE SINCRONIZACIÓN", "IGNORAR (SRAM SOLO LECTURA)", "C GUARDAR BORRADOR EN LOCAL", "B RETROCEDER PASO 04: ADAPTADOR"]
      }
    ]
  },
  {
    route: "/emulation/rooms/01",
    title: "Emulation — Sala 01 (1 jugador)",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Vista de sala; estados de conexión representados visualmente.",
    sources: [
      {
        id: "348106f7781d4d06a4743c375be457cb",
        title: "PG EMULATION ROOM — 01 UN JUGADOR",
        classification: "WEB_PAGE",
        resolution: "2560x2924",
        headings: [],
        buttons: ["PKG-02 ARCHITECTUREPWRPOKÉGUARDE PGEMU CORE ARCHITECTURE V2.4memoryCore: Guarder", "paletteHabitat Studio", "campaignMarketing Suite", "devicesTheme Studio", "verifiedForensics &amp; Legalidad", "▶Room 01 — Un Jugador", "grid_viewMural 6 Salas", "filter_listBuscador &amp; Filtros", "troubleshootDiagnóstico &amp; Desc.", "terminalSandbox Specs", "volume_up", "refresh", "[REINICIAR BUFFER]", "[CONFIGURAR HARDWARE]", "[SALIR A LIVE WALL]", "1x"]
      }
    ]
  },
  {
    route: "/emulation/rooms/02",
    title: "Emulation — Sala 02 (2 jugadores)",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Sin Cable Link real.",
    sources: [
      {
        id: "688083253b054f4f889b9571a0a25151",
        title: "PG EMULATION ROOM — 02 DOS JUGADORES",
        classification: "WEB_PAGE",
        resolution: "2560x2908",
        headings: [],
        buttons: ["CHASSIS LINK ACTIVEHW: 1999videogame_assetPOKÉGUARDEPG-EMU CLUSTER v2.4DOMINIOS", "02 HABITAT STUDIO (TILES)", "03 MARKETING SUITE (DAM)", "04 THEME STUDIO (TOKENS)", "05 FORENSICS &amp; LEGALIDAD", "• LIVE WALL (MURAL EN VIVO)60FPS", "• PG ROOM 02 (DOS JUGADORES)P1/P2", "• BUSCADOR &amp; FILTROSROM/SAV", "• DIAGNÓSTICO &amp; DESC.I/O LOG", "• SANDBOX SPECSSTN-LCD", "sync FORZAR SYNC ACK", "B SILENCIAR AUDIO", "A TRANSMISIÓN ACTIVA", "logout ABANDONAR", "VOLCAR BUFFER HEX", "PURGAR FIFO (0B)"]
      }
    ]
  },
  {
    route: "/emulation/rooms/03",
    title: "Emulation — Sala 03 (dual viewport)",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Dos paneles de vista previa.",
    sources: [
      {
        id: "193db1ef62514a769e3e6a499044c98b",
        title: "PG EMULATION ROOM — 03 DUAL VIEWPORT",
        classification: "WEB_PAGE",
        resolution: "2560x5306",
        headings: ["BUS SERIAL Y PROTOCOLO", "CHAT &amp; AUDITORÍA ESPECTADORES", "INTEGRIDAD .SAV &amp; PKHEX"],
        buttons: ["POKÉGUARDEv2.1 SILVER 01 :: Core SystemeggGuardería", "badgeFicha", "groupsEquipo", "inventory_2Cajas", "backpackMochila", "forestBiomas", "devicesChasis", "drawEditor", "paletteBrand Kit", "campaignCampañas", "outputExport", "colorizeColores", "match_caseTipografía", "tokenTokens", "verifiedLegalidad", "historyTime Capsule"]
      }
    ]
  },
  {
    route: "/emulation/rooms/04",
    title: "Emulation — Sala 04 (espectador)",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Modo espectador visual.",
    sources: [
      {
        id: "3c94a67bb527421295250d707bb25612",
        title: "PG EMULATION ROOM — 04 VISTA DE ESPECTADOR",
        classification: "WEB_PAGE",
        resolution: "2560x2982",
        headings: [],
        buttons: ["Pokéguardev1.99.2-SLVROM// SYSTEM DOMAINS01CORE (GUARDERÍA &amp; SAV)", "02HABITAT STUDIO (TILES)", "03MARKETING SUITE (DAM)", "04THEME STUDIO (TOKENS)", "05FORENSICS &amp; LEGALIDAD", "LIVE WALL", "PG ROOM 01 [1P]", "PG ROOM 02 [2P]", "PG ROOM 03 [DUAL]", "PG ROOM 04 [SPEC]", "volume_up AUDIO: ACTIVO", "tv FILTRO: STN-GRID", "fullscreen VIEWPORT ⛶", "logout SALIR AL LIVE WALL", "10:9 GBC", "4:3 CRT"]
      }
    ]
  },
  {
    route: "/emulation/rooms/05",
    title: "Emulation — Sala 05 (pantalla completa)",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Maqueta a pantalla completa.",
    sources: [
      {
        id: "7873749354a8485a84eef80c62d8559f",
        title: "PG EMULATION ROOM — 05 PANTALLA COMPLETA",
        classification: "WEB_PAGE",
        resolution: "2560x2048",
        headings: [],
        buttons: ["POKÉGUARDEPWRSYS VER. 1999.02ROM OK// SYSTEM DOMAINS01 CORE (GUARDERÍA &amp; SAV", "02 HABITAT STUDIO (TILES)[MAP]", "03 MARKETING SUITE (DAM)[DAM]", "04 THEME STUDIO (TOKENS)[CSS]", "05 FORENSICS &amp; LEGALIDAD[CHK]", "LIVE WALL", "PG ROOM 01 UN JUGADOR", "PG ROOM 02 DOS JUGADORES", "PG ROOM 03 DUAL VIEWPORT", "PG ROOM 05 PANTALLA COMPLETA", "BUSCADOR &amp; FILTROS", "terminal OCULTAR TELEMETRÍA", "fullscreen_exit RESTAURAR SALA", "hub INSPECTOR HUD WS SYNC JUGADORES 2 / 2 LLENO ESPECTADORES 184", "volume_up APU ACTIVO", "1X"]
      }
    ]
  },
  {
    route: "/emulation/battle",
    title: "Emulation — Battle Room",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "NO simula combates reales.",
    sources: [
      {
        id: "5927cdbb6bd44402936cb492fe2c0cbe",
        title: "PG BATTLE ROOM — LINK CABLE",
        classification: "WEB_PAGE",
        resolution: "2560x3104",
        headings: ["TRAINER RED [SIMULADO]", "TRAINER BLUE [SIMULADO]"],
        buttons: ["POKÉGUARDESYS-OS 1999 // V2.4SILVERCHASSIS MODULESterminal01CORE (GUARDERÍA &amp", "02HABITAT STUDIO (TILES)", "03MARKETING SUITE (DAM)", "04THEME STUDIO (TOKENS)", "05FORENSICS &amp; LEGALIDAD", "06PG EMULATIONACTIVE [LIVE WALL]", "terminal [FORZAR ACK SERIAL]", "restart_alt [REINICIAR BUFFER (0B)]", "power_off [DESCONECTAR EN CALIENTE]", "▶ LUCHAR", "▷ POKÉMON (6)", "▷ MOCHILA", "✕ HUIR [LOCK]", "B", "A", "COPIAR TELEMETRÍA JSON"]
      }
    ]
  },
  {
    route: "/emulation/trade",
    title: "Emulation — Trade Room",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Solo protocolo futuro por Cable Link emulado; sin intercambios.",
    sources: [
      {
        id: "d42705a4e9274de88653206f27c2e2ed",
        title: "PG TRADE ROOM — LINK CABLE",
        classification: "WEB_PAGE",
        resolution: "2560x4802",
        headings: ["PG TRADE ROOM // PROTOCOLO DE INTERCAMBIO POR CABLE LINK VIRTUAL [SIMULADO]", "MOTOR DE REGLAS // MATRIZ DE COMPATIBILIDAD &amp; INTEGRIDAD PRE-SWAP", "CAJA DE CONTROL DE DESCONEXIÓN Y RECUPERACIÓN (FAIL-SAFE DRILL)"],
        buttons: ["POKÉGUARDEPG-EMU CLUSTER V2.4 // 1999 ED// SYSTEM DOMAINS01 CORE (GUARDERÍA &amp", "02 HABITAT STUDIO (TILES)", "03 MARKETING SUITE (DAM)", "04 THEME STUDIO (TOKENS)", "05 FORENSICS &amp; LEGALIDAD", "LIVE WALL (MURAL EN VIVO)", "PG ROOM 02 (DOS JUGADORES)", "PG TRADE ROOM (LINK CABLE)▶", "BUSCADOR &amp; FILTROS", "DIAGNÓSTICO &amp; DESC.", "SANDBOX SPECS", "FORZAR SYNC ACK", "pause PAUSAR INTERCAMBIO", "shield ABORTAR Y PROTEGER .SAV", "LISTO PARA CONFIRMAR", "LISTO PARA CONFIRMAR"]
      }
    ]
  },
  {
    route: "/emulation/studio",
    title: "Emulation — Room Suite Studio",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Overview del estudio de salas.",
    sources: [
      {
        id: "89f2ed24e8a246c998a58a9d28d95389",
        title: "PG ROOM SUITE STUDIO — 01 OVERVIEW",
        classification: "WEB_PAGE",
        resolution: "2560x3720",
        headings: ["PG ROOM SUITE STUDIO // OVERVIEW MAESTRA", "MATRIZ DE SALAS EN EJECUCIÓN (LIVE CLUSTER)", "HISTORIAL &amp; LOG DE ACTIVIDAD DEL ENLACE SERIAL", "LATENCIA Y ESTABILIDAD DEL BUS DE RELOJ (PROCEDURAL)", "SUBSISTEMAS", "ESPECTADORES", "SANDBOX ZERO-ROM"],
        buttons: ["POKÉGUARDEPKG-02HARDWARE DOMAINSCH-06 RUNNING01 CORE (GUARDERÍA &amp; SAV)memory", "02 HABITAT STUDIOgrid_view", "03 MARKETING SUITE (DAM)photo_library", "04 THEME STUDIOpalette", "05 FORENSICS &amp; LEGALIDADverified_user", "06 EMULATION CLUSTERsports_esports", "01 OVERVIEWACT", "02 ROOM EXPLOREREXP", "03 1P SOLORDY", "04 2P DUAL COOPSTBY", "05 LINK CABLE TRADELNK", "06 BATTLE ROOMVS", "07 SPECTATOR HUBLIVE", "08 FULLSCREEN STNLCD", "add_circle CREAR SALA ASISTIDA (9 PASOS)", "sync_alt FORZAR ACK SERIAL"]
      }
    ]
  },
  {
    route: "/emulation/studio/manager",
    title: "Emulation — Room Manager",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Gestión visual de salas.",
    sources: [
      {
        id: "c5dfb1e9fc8642128b398be5741be3d6",
        title: "PG ROOM SUITE STUDIO — 02 ROOM MANAGER",
        classification: "WEB_PAGE",
        resolution: "2560x3240",
        headings: ["Panel de Control de Salas", "Inspector de Sala"],
        buttons: ["System DomainsHARDWARE BUS ARCH01 CORE (GUARDERÍA &amp; SAV)", "02 HABITAT STUDIO (TILES)", "03 MARKETING SUITE (DAM)", "04 THEME STUDIO (TOKENS)", "05 FORENSICS &amp; LEGALIDAD", "06 PG EMULATION", "01 Overview", "02 Room Manager", "03 Spectator Wall", "04 Netplay Config", "05 Link Cable Protocol", "06 Save State Sync", "07 Tournament Rules", "08 Diagnostic Logs", "ios_share EXPORTAR LOG .CSV", "restart_alt REINICIAR TABLA"]
      }
    ]
  },
  {
    route: "/emulation/studio/monitor",
    title: "Emulation — Live Monitor",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Monitor en vivo simulado y etiquetado.",
    sources: [
      {
        id: "8bf4dfb7d4d048cc8d602b8d666e4320",
        title: "PG ROOM SUITE STUDIO — 03 LIVE MONITOR",
        classification: "WEB_PAGE",
        resolution: "2560x3814",
        headings: [],
        buttons: ["SYSTEM DOMAINS01 CORE (GUARDERÍA &amp; SAV)", "02 HABITAT STUDIO", "03 MARKETING SUITE", "04 THEME STUDIO", "05 FORENSICS &amp; LEGALIDAD", "06 PG EMULATIONACTIVE", "01 OVERVIEW", "02 SINGLE VIEW", "03 LIVE MONITOR", "04 DUAL VIEWPORT", "05 SPECTATOR HUB", "06 FULL SCREEN", "07 LINK DIAGNOSTICS", "08 STREAM ROUTER", "sync FORZAR SYNC ACK", "pause_circle PAUSAR TELEMETRÍA"]
      }
    ]
  },
  {
    route: "/emulation/studio/link",
    title: "Emulation — Link Manager",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Sin enlaces reales.",
    sources: [
      {
        id: "875af41abc094d09815dc96e31506abb",
        title: "PG ROOM SUITE STUDIO — 04 LINK MANAGER",
        classification: "WEB_PAGE",
        resolution: "2560x4282",
        headings: [],
        buttons: ["PG::SUITEHW 1999 R2DOMAINS01 CORE", "02 HABITAT", "03 MARKET", "04 THEMES", "05 FORENSIC", "06 EMULATION", "01 ROOM", "02 BATTLE", "03 TRADE", "04 LINK-MGR", "05 THEATER", "06 MATRIX", "07 PACKET", "08 RESYNC", "sync [FORZAR SYNC ACK]", "pause [PAUSAR BUFFER (0B)]"]
      }
    ]
  },
  {
    route: "/emulation/studio/permissions",
    title: "Emulation — Permisos",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Matriz de permisos visual.",
    sources: [
      {
        id: "7bbd1a83ad1f49059076ad47ed9d4075",
        title: "PG ROOM SUITE STUDIO — 05 PERMISSIONS",
        classification: "WEB_PAGE",
        resolution: "2560x4088",
        headings: ["MATRIZ DE PERMISOS &amp; CONTROL DE ACCESO DE SALA", "BLOQUE A // SELECTOR DE SALA OBJETIVO &amp; REGLAS DE ENTRADA", "BLOQUE B // MATRIZ DE CAPACIDADES POR ROL (PER-ROLE ACCESS MATRIX)", "BLOQUE C // LOG AUDITABLE DE EVENTOS &amp; MODERACIÓN (LOOP BUFFER 128 KB)", "CONEXIONES ACTIVAS &amp; ENLACE", "CHAT &amp; SEGURIDAD DE MENORES"],
        buttons: ["SYSTEM DOMAINS // HARDWARE BUS ARCH01 CORE (GUARDERÍA &amp; SAV)", "02 HABITAT STUDIO (TILES)", "03 MARKETING SUITE (DAM)", "04 THEME STUDIO (TOKENS)", "05 FORENSICS &amp; LEGALIDAD", "06 PG EMULATION[BUS 06]", "01 Overview", "02 Room Manager", "03 Live Monitor", "04 Link Cable Protocol", "05 Permissions", "06 Save State Sync", "07 Tournament Rules", "08 Diagnostic Logs", "save GUARDAR POLÍTICA .JSON", "restart_alt RESTAURAR DEFAULTS"]
      }
    ]
  },
  {
    route: "/emulation/studio/logs",
    title: "Emulation — Session Logs",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Registros de ejemplo, sin sesiones reales.",
    sources: [
      {
        id: "947d28089510489487967548e5f13286",
        title: "PG ROOM SUITE STUDIO — 06 SESSION LOGS",
        classification: "WEB_PAGE",
        resolution: "2560x3580",
        headings: ["REGISTRO DE SESIONES &amp; TELEMETRÍA DE RED"],
        buttons: ["PG ROOM SUITE'99PRIMARY CHASSISSYS.0101 CORE (SAV)[01]", "02 HABITAT (TILES)[02]", "03 MARKETING (DAM)[03]", "04 THEME (TOKENS)[04]", "05 FORENSICS/LAW[05]", "06 PG EMULATION", "06 STUDIO RAILV1.9901 OVERVIEW", "02 ROOM MANAGER", "03 LIVE MONITOR", "04 LINK MANAGER", "05 TOURNAMENT RULES", "06 SESSION LOGS", "07 SAVE STATE SYNC", "08 DIAGNOSTIC LOGS", "file_download EXPORTAR LOGS .CSV (SIMULADO)", "delete_sweep PURGAR BUFFER LOCAL"]
      }
    ]
  },
  {
    route: "/emulation/studio/analytics",
    title: "Emulation — Analytics",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Analíticas ilustrativas.",
    sources: [
      {
        id: "e74c36201d3e4b169548d62363312934",
        title: "PG ROOM SUITE STUDIO — 07 ANALYTICS",
        classification: "WEB_PAGE",
        resolution: "2560x3866",
        headings: ["PANEL DE ANALÍTICA &amp; MÉTRICAS DE ENLACE SERIAL", "ACTIVIDAD POR FRANJA HORARIA (24H UTC)", "DURACIÓN Y CONEXIÓN POR MODALIDAD", "OSCILOSCOPIO SERIAL 8192 HZ", "POPULARIDAD &amp; TOPOLOGÍA", "REGISTRO FORENSE &amp; DESPACHO HEXADECIMAL DE PAQUETES"],
        buttons: ["COM-0", "RESET", "DOMAINSmemory01 CORE", "grid_view02 HAB", "folder_special03 MKT", "palette04 THM", "verified05 LAW", "sports_esports06 EMU", "ROOM SUITEACTIVE01Overview", "02Room Manager", "03Live Monitor", "04Link Manager", "05Netplay Config", "06Save State Sync", "07Analytics", "08Diagnostic Logs"]
      }
    ]
  },
  {
    route: "/emulation/studio/adapters",
    title: "Emulation — Emulator Adapters",
    domain: "emulation",
    state: "UI_PROTOTYPE",
    component: "EmulationSuite",
    notes: "Listado de adaptadores como especificación futura.",
    sources: [
      {
        id: "4d1139dd9df14d3abc62b13c753152d5",
        title: "PG ROOM SUITE STUDIO — 08 EMULATOR ADAPTERS",
        classification: "WEB_PAGE",
        resolution: "2560x5366",
        headings: ["CATÁLOGO DE ADAPTADORES &amp; INTERFACES NEUTRAS"],
        buttons: ["PRIMARY HARDWARE DOMAINS01 CORE (SAV)ROM", "02 HABITAT STUDIOMAP", "03 MARKETING SUITEDAM", "04 THEME STUDIOPAL", "05 FORENSICS/LAWSEC", "06 PG EMULATION", "06 // MODULE SUITEEMU CLUSTER01 Overview", "02 Room Manager", "03 Live Monitor", "04 Link Manager", "05 Link Cable Protocol", "06 Save State Sync", "07 Tournament Rules", "08 Emulator Adapters", "add_box + REGISTRAR ESPECIFICACIÓN IPC", "verified_user AUDITAR SANDBOX"]
      }
    ]
  }
];
function pageForRoute(route) {
  return PAGES.find((page) => page.route === route);
}
function pagesForDomain(domain) {
  return PAGES.filter((page) => page.domain === domain);
}

// apps/web/src/app/destinations.ts
var DOMAIN_OF = {
  core: "core",
  creator_shell: "core",
  emulation: "emulation",
  forensics: "forensics",
  habitat: "habitat",
  marketing: "marketing",
  theme: "theme"
};
function slug(path) {
  return path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
}
function keywordsOf(title, notes, path) {
  return [...new Set(`${title} ${notes} ${path}`.toLocaleLowerCase("es").split(/[^a-z0-9áéíóúñü]+/i).filter((w) => w.length > 2))];
}
var fromCatalog = PAGES.map((page) => ({
  id: slug(page.route),
  label: page.title,
  path: page.route,
  domain: DOMAIN_OF[page.domain] ?? "core",
  keywords: keywordsOf(page.title, page.notes, page.route),
  implemented: true,
  description: `${page.notes} Estado: ${page.state}.`
}));
var DESTINATIONS = (() => {
  const byPath = new Map;
  for (const entry of fromCatalog)
    byPath.set(entry.path, entry);
  for (const legacy of MODULES) {
    if (!legacy.implemented && byPath.has(legacy.path))
      continue;
    byPath.set(legacy.path, legacy);
  }
  return [...byPath.values()];
})();
function destinationForPath(path) {
  return DESTINATIONS.find((module) => module.path === path);
}
function destinationsOfDomain(domain) {
  return domain === "all" ? DESTINATIONS : DESTINATIONS.filter((module) => module.domain === domain);
}
// apps/web/src/pages/contract.ts
function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className)
    element.className = className;
  if (text !== undefined)
    element.textContent = text;
  return element;
}
function button(label, onClick, className = "pg-btn") {
  const b = el("button", className, label);
  b.type = "button";
  if (onClick)
    b.addEventListener("click", onClick);
  return b;
}
function mockButton(label, why = "Maqueta visual: esta acción no está implementada en modo local.") {
  const b = button(label);
  b.disabled = true;
  b.title = why;
  b.setAttribute("aria-label", `${label} (${why})`);
  return b;
}
var STATE_LABEL = {
  OPERATIONAL: "OPERATIVA · DATOS REALES",
  PARTIAL: "PARCIAL · DATOS REALES DISPONIBLES",
  UI_PROTOTYPE: "PROTOTIPO UI · SIN BACKEND",
  BLOCKED: "BLOQUEADO"
};
function pageFrame(page, navigate) {
  const root = el("section", "pg-page");
  root.dataset.pgStitch = page.sources[0]?.id ?? "";
  root.dataset.pgDomain = page.domain;
  root.dataset.pgState = page.state;
  const head = el("header", "pg-page__head");
  const kicker = el("div", "pg-page__kicker");
  kicker.append(el("span", "pg-page__domain", page.domain.toUpperCase()), el("span", `pg-page__state pg-page__state--${page.state.toLowerCase()}`, STATE_LABEL[page.state]));
  const title = el("h1", "pg-page__title", page.title);
  const crumbs = el("nav", "pg-page__crumbs");
  crumbs.setAttribute("aria-label", "Ruta de navegación");
  const home = button("INICIO", () => navigate("/home"), "pg-page__crumb");
  crumbs.append(home, el("span", "pg-page__crumb-sep", "/"), el("span", "pg-page__crumb-current", page.title));
  head.append(kicker, title, crumbs);
  const notice = el("p", "pg-page__notice");
  if (page.state === "UI_PROTOTYPE") {
    notice.textContent = `${page.notes} Interfaz de referencia: no ejecuta acciones externas ni inventa datos.`;
  } else if (page.state === "PARTIAL") {
    notice.textContent = `${page.notes} Los datos disponibles proceden de la app local.`;
  } else {
    notice.textContent = page.notes;
  }
  const layout = el("div", "pg-page__layout");
  const content = el("div", "pg-page__content");
  const body = el("div", "pg-page__body");
  const aside = el("aside", "pg-page__aside");
  content.append(notice, body);
  layout.append(content, aside);
  root.append(head, layout);
  return { root, body, aside, content };
}
function section(title, subtitle, ...children) {
  const s = el("section", "pg-sec");
  const h = el("h2", "pg-sec__title", title);
  s.appendChild(h);
  if (subtitle)
    s.appendChild(el("p", "pg-sec__sub", subtitle));
  for (const child of children)
    s.appendChild(child);
  return s;
}
function table(caption, rows) {
  const wrap = el("div", "pg-table-wrap");
  const t = el("table", "pg-table");
  const cap = el("caption", undefined, caption);
  const thead = el("thead");
  const hr = el("tr");
  hr.append(el("th", undefined, "CAMPO"), el("th", undefined, "VALOR"));
  thead.appendChild(hr);
  const tbody = el("tbody");
  for (const [k, v] of rows) {
    const tr = el("tr");
    tr.append(el("th", undefined, k), el("td", undefined, v));
    tbody.appendChild(tr);
  }
  t.append(cap, thead, tbody);
  wrap.appendChild(t);
  return wrap;
}
function cards(items) {
  const grid = el("div", "pg-cards");
  for (const item of items) {
    const card = el("article", "pg-card");
    if (item.tag)
      card.appendChild(el("span", "pg-card__tag", item.tag));
    card.append(el("h3", "pg-card__title", item.title), el("p", "pg-card__text", item.text));
    grid.appendChild(card);
  }
  return grid;
}
function toolbar(labels) {
  const bar = el("div", "pg-toolbar");
  bar.setAttribute("aria-label", "Barra de herramientas de maqueta");
  for (const label of labels)
    bar.appendChild(mockButton(label));
  return bar;
}
function emptyState(text) {
  const box = el("div", "pg-empty");
  box.setAttribute("role", "status");
  box.append(el("span", "pg-empty__icon", "□"), el("p", undefined, text));
  return box;
}
function progress(label, value) {
  const row = el("div", "pg-progress");
  const head = el("div", "pg-progress__head");
  head.append(el("span", undefined, label), el("span", undefined, `${Math.round(value)}%`));
  const track = el("div", "pg-progress__track");
  const fill = el("div", "pg-progress__fill");
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  track.appendChild(fill);
  row.append(head, track);
  return row;
}
function code(text) {
  return el("code", "pg-code", text);
}
function moduleRail(title, entries, navigate) {
  const rail = el("nav", "pg-rail");
  rail.setAttribute("aria-label", title);
  rail.appendChild(el("h2", "pg-rail__title", title));
  const list = el("div", "pg-rail__list");
  for (const entry of entries) {
    const b = button(entry.label, () => navigate(entry.route), "pg-rail__item");
    if (entry.active) {
      b.classList.add("is-active");
      b.setAttribute("aria-current", "page");
    }
    list.appendChild(b);
  }
  rail.appendChild(list);
  return rail;
}
function referenceOutline(page) {
  const src = page.sources[0];
  const box = el("div", "pg-outline");
  box.appendChild(el("h3", "pg-outline__title", "Estructura de la referencia"));
  const headings = src?.headings ?? [];
  const buttons = src?.buttons ?? [];
  if (headings.length === 0 && buttons.length === 0) {
    box.appendChild(emptyState("La referencia Stitch no expone encabezados extraíbles."));
    return box;
  }
  if (headings.length) {
    box.appendChild(el("h4", "pg-outline__sub", "Secciones"));
    const ul = el("ul", "pg-outline__list");
    for (const h of headings.slice(0, 10))
      ul.appendChild(el("li", undefined, h));
    box.appendChild(ul);
  }
  if (buttons.length) {
    box.appendChild(el("h4", "pg-outline__sub", "Controles"));
    const chips = el("div", "pg-outline__chips");
    for (const b of buttons.slice(0, 14))
      chips.appendChild(el("span", "pg-outline__chip", b));
    box.appendChild(chips);
  }
  if (src)
    box.appendChild(el("p", "pg-outline__id", `Stitch ${src.id.slice(0, 8)} · ${src.resolution}`));
  return box;
}

// apps/web/src/pages/core.ts
function railFor(page, domain, navigate) {
  const entries = PAGES.filter((p) => p.domain === domain).map((p) => ({
    label: p.title.replace(/^.*—\s*/, ""),
    route: p.route,
    active: p.route === page.route
  }));
  return moduleRail("MÓDULOS DEL NÚCLEO", entries, navigate);
}
function breeding(page, navigate) {
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
  body.append(section("Secuencia del flujo", "Cuatro pantallas de Stitch agrupadas en una única página lógica.", flow), section("Validación", undefined, table("Reglas mostradas en la referencia", [
    ["Especie y compatibilidad", "Se validarían con el motor de crianza (no implementado)."],
    ["Huevos y objeto", "Sin huevos reales: esta vista es un prototipo UI."],
    ["Incubación con GP", "Economía no activa en modo local."]
  ])), section("Controles de la maqueta", undefined, toolbar(["VALIDAR PAREJA", "GENERAR HUEVO", "INCUBAR", "ENTREGAR"])));
  aside.append(railFor(page, "core", navigate), referenceOutline(page));
  return root;
}
function profile(page, navigate) {
  const { root, body, aside } = pageFrame(page, navigate);
  body.append(section("Datos locales", "El modo local no usa cuentas, contraseñas ni sincronización.", table("Ficha de entrenador", [
    ["Cuenta", "No requerida en modo local"],
    ["Notificaciones", "Solo avisos de la aplicación, sin envío externo"],
    ["Privacidad", "Los saves y datos personales permanecen en 127.0.0.1"]
  ])), section("Preferencias visibles", undefined, progress("Movimiento reducido", 0), progress("Datos locales", 100), progress("Sincronización en la nube", 0)), section("Acciones no disponibles", undefined, emptyState("No hay servidor de cuentas: no se han inventado datos de usuario."), toolbar(["CAMBIAR CONTRASEÑA", "ACTIVAR 2FA", "BORRAR CUENTA"])));
  aside.append(railFor(page, "core", navigate), referenceOutline(page));
  return root;
}
function players(page, navigate) {
  const { root, body, aside } = pageFrame(page, navigate);
  body.append(section("Guarderías compartidas (PG-08)", "Dos Pokémon por guardería: propio y visitante; anfitrión cuida, propietario recupera.", cards([
    { title: "GUARDERÍA LOCAL", text: "Funciona sin cuentas, pagos ni conexión permanente.", tag: "OPERATIVA" },
    { title: "POKÉMON VISITANTE", text: "El propietario conserva titularidad y derecho de recuperación.", tag: "PG-08" },
    { title: "MODO WEB PÚBLICA", text: "Especificación futura: no hay servidor ni usuarios remotos activos.", tag: "FUTURO" }
  ])), section("Directorio", undefined, emptyState("Sin jugadores remotos: el modo local no consulta directorios externos."), toolbar(["BUSCAR JUGADOR", "ENVIAR INVITACIÓN", "VISITAR GUARDERÍA"])));
  aside.append(railFor(page, "core", navigate), referenceOutline(page));
  return root;
}
function shop(page, navigate) {
  const { root, body, aside } = pageFrame(page, navigate);
  body.append(section("Guardipuntos", "Catálogo visual de la tienda; la economía no está implementada.", cards([
    { title: "COMIDA", text: "Acciones de cuidado reales están en Guardería, no aquí.", tag: "MAQUETA" },
    { title: "DECORACIÓN", text: "El fondo de la habitación está versionado y no se modifica desde esta vista.", tag: "ASSET PROTEGIDO" },
    { title: "BAYAS REDUCTORAS DE EV", text: "Solo Gen 3+, con límites legales; requiere save cargado.", tag: "REGLA PRD" }
  ])), section("Compra", undefined, emptyState("Saldo no simulado: no se muestran puntos ni transacciones inventadas."), toolbar(["COMPRAR", "REGALAR", "VER HISTORIAL"])));
  aside.append(railFor(page, "core", navigate), referenceOutline(page));
  return root;
}
function forensics(page, navigate) {
  const { root, body, aside } = pageFrame(page, navigate);
  const panelLinks = el("div", "pg-co-panel-links");
  const related = PAGES.filter((p) => p.domain === "forensics");
  for (const p of related) {
    const b = button(p.title.replace(/^.*—\s*/, ""), () => navigate(p.route), "pg-btn");
    if (p.route === page.route)
      b.classList.add("is-active");
    panelLinks.appendChild(b);
  }
  body.append(section("Paneles de la inspección", "Los tres paneles comparten los datos del save importado cuando existe.", panelLinks), section("Veredicto y cadenas", undefined, table("Alcance de la referencia Stitch", [
    ["Detalle PKHeX", "Legalidad, motivos y estado no verificable del Pokémon seleccionado."],
    ["Time Capsule", "Gen I ↔ Gen II; nunca Gen I/II → NDS."],
    ["Checklist Gen II", "Reglas de legalidad y límites de la generación."]
  ])), section("Datos", undefined, emptyState("Carga una partida desde la Biblioteca para ver datos reales; esta página no inventa resultados."), button("ABRIR BIBLIOTECA", () => navigate("/biblioteca"))));
  aside.append(railFor(page, "core", navigate), referenceOutline(page), code(page.route));
  return root;
}
function createCoreWorkbench(page, navigate) {
  switch (page.route) {
    case "/crianza":
      return breeding(page, navigate);
    case "/perfil":
      return profile(page, navigate);
    case "/jugadores":
      return players(page, navigate);
    case "/tienda":
      return shop(page, navigate);
    case "/forensics":
      return forensics(page, navigate);
    default:
      return pageFrame(page, navigate).root;
  }
}
// apps/web/src/pages/creator.ts
function styled(node, className) {
  node.classList.add(className);
  return node;
}
function plain(value) {
  return value.replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
function flag() {
  const box = el("div", "pg-cr-flag");
  box.append(el("span", "pg-cr-flag__tag", "MAQUETA"), el("span", "pg-cr-flag__text", "Interfaz de referencia: sin backend, sin datos de usuario y sin acciones reales."));
  return box;
}
function note(text) {
  return el("p", "pg-cr-note", text);
}
function referencePanel(page) {
  const box = el("div", "pg-cr-ref");
  const src = page.sources[0];
  const headings = (src?.headings ?? []).map(plain).filter(Boolean).slice(0, 10);
  const controls = (src?.buttons ?? []).map(plain).filter(Boolean).slice(0, 14);
  box.appendChild(el("h3", "pg-cr-ref__title", "Contenido real extraído de la referencia"));
  if (headings.length === 0 && controls.length === 0) {
    const empty = el("div", "pg-cr-ref-empty");
    empty.appendChild(emptyState("La referencia Stitch no expone encabezados ni controles extraíbles."));
    box.appendChild(empty);
    return box;
  }
  if (headings.length) {
    box.appendChild(el("h4", "pg-cr-ref__sub", "Secciones"));
    const list = el("ul", "pg-cr-ref__list");
    for (const heading of headings)
      list.appendChild(el("li", undefined, heading));
    box.appendChild(list);
  }
  if (controls.length) {
    box.appendChild(el("h4", "pg-cr-ref__sub", "Controles de la referencia (solo lectura)"));
    const chips = el("div", "pg-cr-chips");
    for (const control of controls)
      chips.appendChild(el("span", "pg-cr-chip", control));
    box.appendChild(chips);
  }
  box.appendChild(note("Etiquetas tomadas del HTML de Stitch. No son botones de esta app y no ejecutan nada."));
  return box;
}
function asMock(b) {
  b.classList.add("pg-cr-mock");
  return b;
}
function mock(label, why) {
  return asMock(mockButton(`${label} (MAQUETA)`, why));
}
function actionRow(items) {
  const row = el("div", "pg-cr-actions");
  for (const item of items)
    row.appendChild(mock(item.label, item.why));
  return row;
}
function inertToolbar(labels) {
  const bar = styled(toolbar(labels.map((label) => `${label} · MAQUETA`)), "pg-cr-toolbar");
  bar.setAttribute("aria-label", "Barra de herramientas de maqueta: ninguna acción está implementada");
  for (const b of bar.querySelectorAll("button"))
    asMock(b);
  return bar;
}
function referenceToolbar(page) {
  const pattern = /OVERVIEW|COLORS|TYPOGRAPHY|SPACING|COMPONENT|LAYOUT|PREVIEW|TOKEN|DESIGN|EXPORT|PRESET|HABITAT|COMPILE|TEST RUN|GUARDAR|VALIDAR|IMPORT/i;
  const labels = (page.sources[0]?.buttons ?? []).map(plain).filter((label) => pattern.test(label)).slice(0, 8);
  return inertToolbar(labels.length ? labels : ["CONTROLES DE REFERENCIA"]);
}
function railFor2(page, navigate, title) {
  const entries = PAGES.filter((candidate) => candidate.domain === page.domain).map((candidate) => ({
    label: candidate.title,
    route: candidate.route,
    active: candidate.route === page.route
  }));
  const rail = styled(moduleRail(title, entries, navigate), "pg-cr-rail");
  for (const b of rail.querySelectorAll("button"))
    b.classList.add("pg-cr-rail-item");
  return rail;
}
function moduleCards(page) {
  const items = PAGES.filter((candidate) => candidate.domain === page.domain).map((candidate) => ({
    title: candidate.title,
    text: candidate.notes,
    tag: "MAQUETA"
  }));
  return styled(cards(items), "pg-cr-cards");
}
function themeGallery() {
  const gallery = PAGES.find((candidate) => candidate.route === "/studio/theme");
  const names = (gallery?.sources[0]?.headings ?? []).map(plain).filter((heading) => heading === heading.toUpperCase() && !/THEME STUDIO|PREDEFINED/i.test(heading)).slice(0, 5);
  const box = el("div", "pg-cr-swatches");
  if (names.length === 0) {
    box.appendChild(emptyState("La galería de temas no expone nombres extraíbles."));
    return box;
  }
  names.forEach((name, index) => {
    const tile = el("div", `pg-cr-swatch pg-cr-swatch--${index % 5 + 1}`);
    tile.setAttribute("role", "img");
    tile.setAttribute("aria-label", `Muestra visual de maqueta: ${name}`);
    tile.append(el("span", "pg-cr-swatch__name", name), el("span", "pg-cr-swatch__hint", "MAQUETA"));
    box.appendChild(tile);
  });
  return box;
}
function themeTokens(page) {
  const rows = [
    ["Superficie", "--pg-cr-surface · panel de maqueta, no persistido"],
    ["Acento", "--pg-cr-accent · rojo de carcasa / azul de LCD (referencia visual)"],
    ["Texto", "--pg-cr-ink · alto contraste sobre panel oscuro"],
    ["Tipografía", "Monoespacio técnica · escala de encabezados de la referencia"],
    ["Densidad", "Panel compacto · rejilla de módulos"],
    ["Estado", `${page.state} · sin escritura en DESIGN.md`]
  ];
  return styled(table("Tokens visuales de la maqueta (solo referencia, no se guardan)", rows), "pg-cr-table");
}
function themeWorkbench(page, navigate) {
  const frame = pageFrame(page, navigate);
  frame.aside.append(styled(referenceOutline(page), "pg-cr-outline"), railFor2(page, navigate, "Módulos Theme Studio (10 rutas)"));
  const work = el("div", "pg-cr-workbench");
  work.append(flag(), styled(section("Panel de trabajo · Theme Studio", "Reconstrucción de la referencia: encabezados y controles extraídos del catálogo de Stitch.", referencePanel(page), referenceToolbar(page)), "pg-cr-sec"), styled(section("Galería de temas (maqueta)", themeGallery()), "pg-cr-sec"), styled(section("Módulos del Studio", moduleCards(page)), "pg-cr-sec"), styled(section("Tokens visuales", themeTokens(page), code("pg-cr-* · prefijo reservado; sin escritura en DESIGN.md"), note("No se escribe DESIGN.md ni se persisten valores.")), "pg-cr-sec"));
  frame.body.appendChild(work);
  return frame.root;
}
function shellView() {
  const wrap = el("div", "pg-cr-shell");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", "Maqueta de carcasa roja y blanca con pantalla LCD y tres teclas dibujadas, no interactivas.");
  const frame = el("div", "pg-cr-shell__frame");
  const lcd = el("div", "pg-cr-shell__lcd");
  lcd.append(el("span", undefined, "LCD 160×144"), el("span", "pg-cr-shell__lcd-sub", "REFERENCIA"));
  const keys = el("div", "pg-cr-shell__keys");
  keys.append(el("span", "pg-cr-shell__key", "A"), el("span", "pg-cr-shell__key", "B"), el("span", "pg-cr-shell__key", "C"));
  frame.append(lcd, keys);
  wrap.append(frame, el("p", "pg-cr-shell__caption", "Vista de carcasa reconstruida. Sin exportación ni archivos generados."));
  return wrap;
}
function shellExport() {
  const box = el("div", "pg-cr-export");
  box.appendChild(styled(table("Export Center · artefactos de maqueta (no se generan archivos)", [
    ["Máscara WebP", "Solo referencia visual; sin archivo"],
    ["SHELL-MANIFEST.JSON", "Solo referencia textual; sin descarga"],
    ["Validación", "No se ejecuta; sin análisis de assets"],
    ["Estado", "UI_PROTOTYPE · sin backend"]
  ]), "pg-cr-table"));
  box.appendChild(actionRow([
    { label: "EXPORTAR MÁSCARA WEBP", why: "Maqueta visual: no genera ni descarga archivos." },
    { label: "GENERAR MANIFIESTO JSON", why: "Maqueta visual: no escribe ficheros." },
    { label: "COMPILAR PAQUETE", why: "Maqueta visual: no compila ni publica." }
  ]));
  box.appendChild(note("Ningún botón de esta sección guarda, exporta ni publica contenido."));
  return box;
}
function shellWorkbench(page, navigate) {
  const frame = pageFrame(page, navigate);
  frame.aside.append(styled(referenceOutline(page), "pg-cr-outline"), railFor2(page, navigate, "Módulos Shell Studio (3 rutas)"));
  const work = el("div", "pg-cr-workbench");
  work.append(flag(), styled(section("Panel de trabajo · Shell Studio", "Editor tri-panel reconstruido a partir de la referencia; sin edición persistente.", referencePanel(page), referenceToolbar(page)), "pg-cr-sec"), styled(section("Vista de carcasa (maqueta)", shellView()), "pg-cr-sec"), styled(section("Export center inerte", shellExport()), "pg-cr-sec"));
  frame.body.appendChild(work);
  return frame.root;
}
function presetLibrary() {
  const library = PAGES.find((candidate) => candidate.route === "/studio/habitat/library");
  const names = (library?.sources[0]?.headings ?? []).map(plain).filter((heading) => !/HABITAT LIBRARY|CREATE NEW HABITAT/i.test(heading));
  const box = el("div", "pg-cr-presets");
  if (names.length === 0) {
    box.appendChild(emptyState("La biblioteca no expone presets extraíbles."));
  } else {
    box.appendChild(styled(cards(names.map((name) => ({
      title: name,
      text: "Preset de referencia visual. No se aplica al Canvas ni se guarda.",
      tag: "PRESET · MAQUETA"
    }))), "pg-cr-cards"));
  }
  box.appendChild(actionRow([
    { label: "IMPORT HABITAT", why: "Maqueta visual: no importa ni guarda hábitats." },
    { label: "NEW HABITAT", why: "Maqueta visual: no crea hábitats." }
  ]));
  return box;
}
function habitatEditor() {
  const box = el("div", "pg-cr-editor");
  const lcd = el("div", "pg-cr-lcd");
  lcd.setAttribute("role", "img");
  lcd.setAttribute("aria-label", "Maqueta de pantalla 160 por 144: rejilla de referencia, sin Canvas real ni fondo modificado.");
  lcd.append(el("span", "pg-cr-lcd__tag", "160×144"), el("span", "pg-cr-lcd__grid"), el("span", "pg-cr-lcd__msg", "SIN CANVAS · SOLO REFERENCIA"));
  const guard = el("p", "pg-cr-guard");
  guard.append(el("strong", undefined, "Protección: "), document.createTextNode("no se crea ni altera el Canvas 160×144, ni el fondo versionado "), el("code", "pg-cr-code", "/assets/room/guarderia.png"), document.createTextNode("."));
  box.append(lcd, guard);
  return box;
}
function habitatWorkbench(page, navigate) {
  const frame = pageFrame(page, navigate);
  frame.aside.append(styled(referenceOutline(page), "pg-cr-outline"), railFor2(page, navigate, "Módulos Habitat Studio (3 rutas)"));
  const work = el("div", "pg-cr-workbench");
  work.append(flag(), styled(section("Panel de trabajo · Habitat Studio", "Workspace reconstruido: presets y editor en modo maqueta.", referencePanel(page), referenceToolbar(page)), "pg-cr-sec"), styled(section("Biblioteca de presets", presetLibrary()), "pg-cr-sec"), styled(section("Editor de hábitat (maqueta)", habitatEditor()), "pg-cr-sec"));
  frame.body.appendChild(work);
  return frame.root;
}
function unsupportedWorkbench(page, navigate) {
  const frame = pageFrame(page, navigate);
  frame.aside.appendChild(styled(referenceOutline(page), "pg-cr-outline"));
  const work = el("div", "pg-cr-workbench");
  work.append(flag(), styled(section("Dominio fuera de Creator Suite", "Esta vista se gestiona en otro módulo de la app.", emptyState(`El dominio ${page.domain} no tiene workspace en Creator Suite.`)), "pg-cr-sec"));
  frame.body.appendChild(work);
  return frame.root;
}
function createCreatorWorkbench(page, navigate) {
  switch (page.domain) {
    case "theme":
      return themeWorkbench(page, navigate);
    case "creator_shell":
      return shellWorkbench(page, navigate);
    case "habitat":
      return habitatWorkbench(page, navigate);
    default:
      return unsupportedWorkbench(page, navigate);
  }
}
// apps/web/src/pages/marketing.ts
var RAIL_LABEL = {
  "/studio/marketing": "OVERVIEW",
  "/studio/marketing/brand": "BRAND KIT",
  "/studio/marketing/social": "SOCIAL MEDIA",
  "/studio/marketing/creative": "CREATIVE CANVAS",
  "/studio/marketing/press": "PRESS KIT",
  "/studio/marketing/roadmap": "ROADMAP",
  "/studio/marketing/campaigns": "CAMPAIGNS",
  "/studio/marketing/copy": "AI COPY",
  "/studio/marketing/localization": "LOCALIZATION",
  "/studio/marketing/assets": "MEDIA LIBRARY",
  "/studio/marketing/calendar": "CONTENT CALENDAR",
  "/studio/marketing/community": "COMMUNITY HUB",
  "/studio/marketing/analytics": "ANALYTICS",
  "/studio/marketing/export": "EXPORT CENTER"
};
var EXTRA_TITLE = {
  queue: "Cola de publicación",
  palette: "Paleta de ejemplo",
  channels: "Canales (inertes)",
  triPanel: "Editor tri-panel",
  timeline: "Hitos ilustrativos",
  copy: "Borradores de ejemplo",
  week: "Semana editorial",
  disclaimer: "Aviso sobre los datos",
  manifest: "Manifiesto de ejemplo"
};
var EXTRA_NOTE = {
  queue: "No hay elementos programados: la maqueta no publica nada.",
  palette: "Muestras de color para la maqueta; no se aplican al tema real.",
  channels: "Nombres representativos; no hay cuentas conectadas.",
  triPanel: "Tres paneles dibujados; el lienzo no se guarda ni se exporta.",
  timeline: "Fechas y estados ficticios, dispuestos solo para mostrar la estructura.",
  copy: "Textos de muestra generados de forma local y determinista.",
  week: "Celdas y entradas ficticias; no hay calendario persistente.",
  disclaimer: "Las cifras siguientes son ilustrativas, no telemetría real.",
  manifest: "Documento de ejemplo: no se genera ningún archivo descargable."
};
var OVERVIEW = {
  lead: "Tablero de ejemplo: proyectos, cola de publicación y accesos rápidos. " + "Los proyectos son tarjetas ilustrativas; no existe ningún proyecto real.",
  tiles: [
    { title: "Lanzamiento oficial Pokeguarde 1999", text: "Borrador de maqueta sin fecha real.", tag: "EJEMPLO" },
    { title: "Social post — Gen II Daycare Reveal", text: "Borrador ilustrativo sin publicación.", tag: "EJEMPLO" },
    { title: "Boletín de actualizaciones #04", text: "Plantilla de ejemplo sin envío.", tag: "EJEMPLO" },
    { title: "Cronograma de campañas Q4", text: "Cronograma ficticio dibujado para la maqueta.", tag: "EJEMPLO" }
  ],
  caption: "Tablero de ejemplo (Overview)",
  rows: [
    ["Proyectos", "4 tarjetas ilustrativas"],
    ["Cola de publicación", "0 elementos reales"],
    ["Dominio", "marketing · 14 rutas"],
    ["Estado", "PROTOTIPO UI · SIN BACKEND"]
  ],
  gauges: [
    { label: "Avance visual del tablero (ejemplo)", value: 100 },
    { label: "Borradores (ilustrativo)", value: 35 },
    { label: "Publicaciones reales", value: 0 }
  ],
  actions: ["Nuevo proyecto", "Publicar ahora", "Generar informe", "Guardar borrador"],
  extras: ["queue"]
};
var PANELS = {
  "/studio/marketing": OVERVIEW,
  "/studio/marketing/brand": {
    lead: "Bóveda de marca de ejemplo: logotipos, tokens y reglas de uso. " + "No se suben, guardan ni descargan archivos.",
    tiles: [
      { title: "Logo primario canónico", text: "Espacio reservado ilustrativo.", tag: "EJEMPLO" },
      { title: "Logotipo horizontal completo", text: "Espacio reservado ilustrativo.", tag: "EJEMPLO" },
      { title: "Emblema hardware / favicon", text: "Espacio reservado ilustrativo.", tag: "EJEMPLO" },
      { title: "Tipografía de marca", text: "Muestra tipográfica de ejemplo.", tag: "EJEMPLO" }
    ],
    caption: "Bóveda de marca (ejemplo)",
    rows: [
      ["Logotipos de ejemplo", "3"],
      ["Paleta de ejemplo", "5 muestras"],
      ["Uso autorizado", "Solo demostración visual"],
      ["Archivos reales", "0"]
    ],
    gauges: [
      { label: "Cobertura de tokens (ejemplo)", value: 80 },
      { label: "Bóveda verificada", value: 0 }
    ],
    actions: ["Subir logotipo", "Guardar paleta", "Aplicar a tema", "Descargar ZIP"],
    extras: ["palette"]
  },
  "/studio/marketing/social": {
    lead: "Redacción y programación simuladas: no hay publicaciones, cuentas conectadas ni envíos.",
    tiles: [
      { title: "Hilo Gen II (borrador)", text: "Texto de ejemplo sin publicar.", tag: "EJEMPLO" },
      { title: "Card social 1:1", text: "Composición ilustrativa sin subida.", tag: "EJEMPLO" },
      { title: "Anuncio de boletín", text: "Borrador de muestra sin envío.", tag: "EJEMPLO" }
    ],
    caption: "Cola social (ejemplo)",
    rows: [
      ["Borradores", "3 ilustrativos"],
      ["Cuentas conectadas", "0"],
      ["Publicaciones reales", "0"],
      ["Plataformas", "Solo maqueta"]
    ],
    gauges: [
      { label: "Borradores listos (ejemplo)", value: 60 },
      { label: "Publicado real", value: 0 }
    ],
    actions: ["Redactar publicación", "Programar", "Publicar ahora", "Adjuntar asset"],
    extras: ["channels", "queue"]
  },
  "/studio/marketing/creative": {
    lead: "Editor tri-panel ilustrativo: capas, lienzo y propiedades. " + "El lienzo mostrado no se guarda ni se exporta.",
    tiles: [
      { title: "Capa · fondo", text: "Bloque visual de ejemplo.", tag: "EJEMPLO" },
      { title: "Capa · titular", text: "Bloque visual de ejemplo.", tag: "EJEMPLO" },
      { title: "Capa · marcador", text: "Sin sprite de terceros.", tag: "MAQUETA" }
    ],
    caption: "Composición (ejemplo)",
    rows: [
      ["Lienzo", "160×144 · marcador"],
      ["Capas", "3 ilustrativas"],
      ["Exportaciones reales", "0"],
      ["Formato", "MAQUETA"]
    ],
    gauges: [
      { label: "Composición (ejemplo)", value: 45 },
      { label: "Alias resueltos (ejemplo)", value: 70 }
    ],
    actions: ["Nueva capa", "Exportar PNG", "Guardar plantilla", "Compartir vista"],
    extras: ["triPanel"]
  },
  "/studio/marketing/press": {
    lead: "Dossier de prensa de muestra: ficha técnica, boilerplates, Q&A y aviso legal. " + "Sin descargas reales.",
    tiles: [
      { title: "01 · Ficha técnica", text: "Factsheet ilustrativo.", tag: "EJEMPLO" },
      { title: "02 · Boilerplates", text: "Textos editoriales de ejemplo.", tag: "EJEMPLO" },
      { title: "03 · Q&A editorial", text: "Preguntas ficticias.", tag: "EJEMPLO" },
      { title: "04 · Aviso legal", text: "Cláusula de muestra, no asesoramiento.", tag: "EJEMPLO" }
    ],
    caption: "Dossier de prensa (ejemplo)",
    rows: [
      ["Secciones", "4 ilustrativas"],
      ["Assets listados", "3 de ejemplo"],
      ["Descargas reales", "0"],
      ["Estado", "MAQUETA"]
    ],
    gauges: [
      { label: "Dossier (ejemplo)", value: 90 },
      { label: "Licencias verificadas", value: 0 }
    ],
    actions: ["Descargar dossier", "Editar boilerplate", "Publicar nota", "Añadir asset"]
  },
  "/studio/marketing/roadmap": {
    lead: "Roadmap y comunicados de ejemplo: hitos ficticios, sin anuncios publicados.",
    tiles: [
      { title: "v2.45 · Johto Daycare", text: "Hito ilustrativo.", tag: "EJEMPLO" },
      { title: "v2.46 · DAM local", text: "Hito ilustrativo.", tag: "EJEMPLO" },
      { title: "v2.47 · i18n", text: "Hito ilustrativo.", tag: "EJEMPLO" }
    ],
    caption: "Roadmap (ejemplo)",
    rows: [
      ["Hitos", "3 ilustrativos"],
      ["Comunicados publicados", "0"],
      ["Fechas", "Ficticias"],
      ["Estado", "MAQUETA"]
    ],
    gauges: [
      { label: "Hito v2.45 (ejemplo)", value: 65 },
      { label: "Comunicados reales", value: 0 }
    ],
    actions: ["Nuevo hito", "Publicar comunicado", "Guardar borrador", "Archivar"],
    extras: ["timeline"]
  },
  "/studio/marketing/campaigns": {
    lead: "Campañas y boletines ilustrativos: no se envían correos ni se activan campañas.",
    tiles: [
      { title: "Lanzamiento v2.45 · Johto Daycare", text: "Campaña de ejemplo.", tag: "EJEMPLO" },
      { title: "Eclosión del huevo Manaphy", text: "Evento comunitario ilustrativo.", tag: "EJEMPLO" },
      { title: "Retro Archaeology #04", text: "Boletín de muestra.", tag: "EJEMPLO" },
      { title: "Dry-run SRAM Audit", text: "Campaña de muestra.", tag: "EJEMPLO" }
    ],
    caption: "Campañas (ejemplo)",
    rows: [
      ["Campañas", "4 ilustrativas"],
      ["Boletines enviados", "0"],
      ["Suscriptores reales", "0"],
      ["Estado", "MAQUETA"]
    ],
    gauges: [
      { label: "Redacción (ejemplo)", value: 75 },
      { label: "Envío real", value: 0 }
    ],
    actions: ["Crear campaña", "Enviar boletín", "Duplicar", "Guardar"],
    extras: ["queue"]
  },
  "/studio/marketing/copy": {
    lead: "Borradores deterministas y locales: sin LLM en bucle, sin llamadas externas y sin texto publicado.",
    tiles: [
      { title: "Tono archivo 1999", text: "Variante ilustrativa.", tag: "EJEMPLO" },
      { title: "Tono divulgativo", text: "Variante ilustrativa.", tag: "EJEMPLO" },
      { title: "Tono comunidad", text: "Variante ilustrativa.", tag: "EJEMPLO" }
    ],
    caption: "Redacción (ejemplo)",
    rows: [
      ["Borradores", "3 ilustrativos"],
      ["Modelos externos", "0"],
      ["Textos publicados", "0"],
      ["Modo", "LOCAL · MAQUETA"]
    ],
    gauges: [
      { label: "Borrador (ejemplo)", value: 50 },
      { label: "Revisión humana (ejemplo)", value: 20 }
    ],
    actions: ["Generar borrador", "Aplicar tono", "Copiar texto", "Guardar"],
    extras: ["copy"]
  },
  "/studio/marketing/localization": {
    lead: "Glosario protegido de ejemplo: términos canónicos ES/EN. " + "No se aplica a la interfaz ni se guarda.",
    tiles: [
      { title: "Español (base)", text: "Idioma de referencia ilustrativo.", tag: "EJEMPLO" },
      { title: "English (fallback)", text: "Retorno de ejemplo.", tag: "EJEMPLO" },
      { title: "Glosario PG", text: "Términos de muestra.", tag: "EJEMPLO" }
    ],
    caption: "Glosario (ejemplo)",
    rows: [
      ["Términos", "12 ilustrativos"],
      ["Idiomas", "2 de ejemplo"],
      ["Cambios aplicados", "0"],
      ["Estado", "MAQUETA"]
    ],
    gauges: [
      { label: "Glosario revisado (ejemplo)", value: 40 },
      { label: "Traducciones aplicadas", value: 0 }
    ],
    actions: ["Añadir término", "Exportar glosario", "Aplicar fallback", "Marcar revisado"]
  },
  "/studio/marketing/assets": {
    lead: "Biblioteca de recursos ilustrativa: fichas de ejemplo sin subidas ni almacenamiento real.",
    tiles: [
      { title: "Pokeguarde Shell Master", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Banner campaña 16:9", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Habitación Guardería GBC", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Chikorita Overworld Sheet", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Manaphy Overworld Sheet", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Social Card 1:1", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Boletín Header 16:9", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" },
      { title: "Electrodo Overworld Tier 40", text: "Ficha de ejemplo sin archivo.", tag: "EJEMPLO" }
    ],
    caption: "Media Library (ejemplo)",
    rows: [
      ["Activos", "8 fichas ilustrativas"],
      ["Archivos subidos", "0"],
      ["Etiquetas", "4 de ejemplo"],
      ["Estado", "DAM MAQUETA"]
    ],
    gauges: [
      { label: "Metadatos (ejemplo)", value: 55 },
      { label: "Archivos reales", value: 0 }
    ],
    actions: ["Subir archivo", "Nueva carpeta", "Descargar original", "Sincronizar DAM"]
  },
  "/studio/marketing/calendar": {
    lead: "Calendario editorial de ejemplo: celdas y entradas ficticias, sin programación real.",
    tiles: [
      { title: "Semana 01", text: "Bloques ilustrativos.", tag: "EJEMPLO" },
      { title: "Semana 02", text: "Bloques ilustrativos.", tag: "EJEMPLO" },
      { title: "Semana 03", text: "Bloques ilustrativos.", tag: "EJEMPLO" }
    ],
    caption: "Calendario (ejemplo)",
    rows: [
      ["Entradas", "5 ilustrativas"],
      ["Publicadas", "0"],
      ["Semana activa", "Ficticia"],
      ["Estado", "MAQUETA"]
    ],
    gauges: [
      { label: "Celdas con contenido (ejemplo)", value: 30 },
      { label: "Publicaciones reales", value: 0 }
    ],
    actions: ["Nueva entrada", "Mover a publicada", "Exportar .ics", "Guardar"],
    extras: ["week"]
  },
  "/studio/marketing/community": {
    lead: "Centro de comunidad de muestra: anuncios y enlaces inertes. " + "No se conecta a Discord ni se publica mensaje alguno.",
    tiles: [
      { title: "Community Hub & Discord Resource Center", text: "Panel ilustrativo.", tag: "EJEMPLO" },
      { title: "Torneo de crianza Johto", text: "Anuncio de muestra.", tag: "EJEMPLO" },
      { title: "Guardería Johto v2.45 disponible", text: "Anuncio de muestra.", tag: "EJEMPLO" }
    ],
    caption: "Comunidad (ejemplo)",
    rows: [
      ["Anuncios", "2 ilustrativos"],
      ["Enlaces externos", "0 · inertes"],
      ["Mensajes enviados", "0"],
      ["Estado", "MAQUETA"]
    ],
    gauges: [
      { label: "Recursos (ejemplo)", value: 60 },
      { label: "Actividad real", value: 0 }
    ],
    actions: ["Redactar anuncio", "Copiar enlace", "Publicar en Discord", "Archivar"]
  },
  "/studio/marketing/analytics": {
    lead: "VALORES ILUSTRATIVOS: cifras, tendencias y embudos dibujados para la maqueta. " + "No son telemetría real de Pokeguarde ni datos de ningún usuario.",
    tiles: [
      { title: "Tráfico (ejemplo)", text: "1.200 visitas ilustrativas.", tag: "ILUSTRATIVO" },
      { title: "Adopción (ejemplo)", text: "48 adoptiones ilustrativas.", tag: "ILUSTRATIVO" },
      { title: "Auditoría (ejemplo)", text: "12 eventos ilustrativos.", tag: "ILUSTRATIVO" }
    ],
    caption: "Valores ilustrativos — no son métricas reales",
    rows: [
      ["Visitas", "1.200 · ejemplo"],
      ["Adopciones", "48 · ejemplo"],
      ["Embudo", "4 pasos ilustrativos"],
      ["Datos reales", "NINGUNO"]
    ],
    gauges: [
      { label: "Tráfico (ilustrativo)", value: 68 },
      { label: "Embudo (ilustrativo)", value: 42 },
      { label: "Adopción (ilustrativa)", value: 25 },
      { label: "Privacidad (ilustrativo)", value: 100 }
    ],
    actions: ["Exportar CSV", "Actualizar (maqueta)", "Configurar embudo", "Compartir informe"],
    extras: ["disclaimer"]
  },
  "/studio/marketing/export": {
    lead: "Empaquetado de muestra: bundles y manifiesto ilustrativos. " + "No se generan descargas, archivos ni firmas reales.",
    tiles: [
      { title: "Social Media Launch Pack", text: "Bundle ilustrativo, sin archivos.", tag: "EJEMPLO" },
      { title: "Press Kit & Media Outlets", text: "Bundle ilustrativo, sin archivos.", tag: "EJEMPLO" },
      { title: "Brand & Asset Vault", text: "Bundle ilustrativo, sin archivos.", tag: "EJEMPLO" },
      { title: "Community & Discord", text: "Bundle ilustrativo, sin archivos.", tag: "EJEMPLO" }
    ],
    caption: "Export Center (ejemplo)",
    rows: [
      ["Bundles", "4 ilustrativos"],
      ["Descargas reales", "0"],
      ["Manifiesto", "EJEMPLO"],
      ["Estado", "MAQUETA"]
    ],
    gauges: [
      { label: "Paquetes listos (ejemplo)", value: 80 },
      { label: "Firma real", value: 0 }
    ],
    actions: ["Empaquetar", "Descargar ZIP", "Generar manifiesto", "Firmar paquete"],
    extras: ["manifest"]
  }
};
function banner() {
  const box = el("div", "pg-mk-banner");
  box.setAttribute("role", "note");
  box.setAttribute("aria-label", "Aviso de maqueta");
  box.append(el("span", "pg-mk-badge", "MAQUETA"), el("p", "pg-mk-banner__text", "Marketing Studio de demostración: no publica, envía, sube ni exporta nada. " + "Proyectos, campañas, publicaciones y cifras son ejemplos ilustrativos."));
  return box;
}
function renderExtra(kind) {
  const box = el("div", `pg-mk-${kind}`);
  switch (kind) {
    case "palette": {
      const swatches = [
        ["#ff5a5f", "Rojo"],
        ["#4fc3f7", "Azul"],
        ["#ffc857", "Ámbar"],
        ["#6ee7a8", "Verde"],
        ["#0c1626", "Fondo"]
      ];
      for (const [hex, name] of swatches) {
        const item = el("div", "pg-mk-swatch");
        const chip = el("span", "pg-mk-swatch__chip");
        chip.style.backgroundColor = hex;
        chip.setAttribute("aria-hidden", "true");
        item.append(chip, el("span", "pg-mk-swatch__label", `${name} · ${hex} (ejemplo)`));
        box.appendChild(item);
      }
      break;
    }
    case "channels": {
      const chips = el("div", "pg-mk-chips");
      for (const label of ["DISCORD (inerte)", "BOLETÍN (inerte)", "SOCIAL (inerte)"]) {
        chips.appendChild(el("span", "pg-mk-chip", label));
      }
      box.appendChild(chips);
      break;
    }
    case "triPanel": {
      const columns = [
        ["CAPAS (EJEMPLO)", "Fondo / Titular / Marcador"],
        ["LIENZO (EJEMPLO)", "160×144 · sin guardar"],
        ["PROPIEDADES (EJEMPLO)", "Opacidad ilustrativa"]
      ];
      for (const [title, body] of columns) {
        const col = el("div", "pg-mk-col");
        col.append(el("h3", "pg-mk-col__title", title), code(body));
        box.appendChild(col);
      }
      break;
    }
    case "timeline": {
      const steps = [
        "v2.44 · revisado (ejemplo)",
        "v2.45 · en maqueta",
        "v2.46 · planificado",
        "v2.47 · idea"
      ];
      for (const [index, label] of steps.entries()) {
        const item = el("div", "pg-mk-step");
        item.append(el("span", "pg-mk-step__n", String(index + 1).padStart(2, "0")), el("span", undefined, label));
        box.appendChild(item);
      }
      break;
    }
    case "copy": {
      box.append(code("EJEMPLO A · Guarda, cría y entrena tus Pokémon clásicos."), code("EJEMPLO B · Una guardería portátil para las generaciones I a V."));
      break;
    }
    case "week": {
      const days = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
      for (const [index, day] of days.entries()) {
        const cell = el("div", "pg-mk-day");
        cell.append(el("span", "pg-mk-day__name", day), el("span", "pg-mk-day__slot", index < 2 ? "Ejemplo" : "—"));
        box.appendChild(cell);
      }
      break;
    }
    case "disclaimer": {
      box.setAttribute("role", "note");
      box.appendChild(el("p", "pg-mk-disclaimer", "VALORES ILUSTRATIVOS: las cifras de esta pantalla son ejemplos visuales. " + "No representan visitas, usuarios, adopciones ni ninguna medición real."));
      break;
    }
    case "manifest": {
      box.appendChild(code(`{
  "bundle": "MAQUETA",
  "files": [],
  "download": false
}`));
      break;
    }
    case "queue": {
      box.appendChild(emptyState("Cola vacía: la maqueta no tiene publicaciones programadas reales."));
      break;
    }
  }
  return box;
}
function renderPanel(spec) {
  const wrap = el("div", "pg-mk-panel");
  const split = el("div", "pg-mk-split");
  const main = el("div", "pg-mk-split__main");
  const side = el("div", "pg-mk-split__side");
  main.appendChild(section("Vista previa", spec.lead, cards(spec.tiles)));
  for (const kind of spec.extras ?? []) {
    main.appendChild(section(`Detalle · ${EXTRA_TITLE[kind]}`, EXTRA_NOTE[kind], renderExtra(kind)));
  }
  const gauges = el("div", "pg-mk-gauges");
  for (const gauge of spec.gauges)
    gauges.appendChild(progress(gauge.label, gauge.value));
  side.appendChild(section("Indicadores ilustrativos", "Barras de ejemplo: no miden actividad real.", gauges));
  side.appendChild(section("Estructura de ejemplo", "Filas ficticias dibujadas para la maqueta.", table(spec.caption, spec.rows)));
  side.appendChild(section("Acciones de maqueta", "Todos los controles están desactivados a propósito: no ejecutan acciones.", toolbar(spec.actions)));
  split.append(main, side);
  wrap.appendChild(split);
  return wrap;
}
function createMarketingWorkbench(page, navigate) {
  const frame = pageFrame(page, navigate);
  const rail = PAGES.filter((candidate) => candidate.domain === "marketing").map((candidate) => ({
    label: RAIL_LABEL[candidate.route] ?? candidate.title,
    route: candidate.route,
    active: candidate.route === page.route
  }));
  frame.aside.append(moduleRail("Marketing Studio", rail, navigate), referenceOutline(page));
  const spec = PANELS[page.route] ?? OVERVIEW;
  frame.body.append(banner(), renderPanel(spec));
  return frame.root;
}
// apps/web/src/pages/emulation.ts
var LINK_DISCLAIMER = "No hay emulación, streaming, Cable Link, combates ni intercambios reales. Protocolo futuro: Cable Link emulado.";
var RAIL_GROUPS = [
  {
    title: "Descubrimiento · explorador y flujos",
    entries: [
      { label: "01 · Room Explorer / Live Wall", route: "/emulation" },
      { label: "02 · Mapa de flujos 01–06", route: "/emulation/flows" },
      { label: "03 · Crear sala (9 pasos)", route: "/emulation/create" }
    ]
  },
  {
    title: "Salas 01–05",
    entries: [
      { label: "04 · Sala 01 · un jugador", route: "/emulation/rooms/01" },
      { label: "05 · Sala 02 · dos jugadores", route: "/emulation/rooms/02" },
      { label: "06 · Sala 03 · dual viewport", route: "/emulation/rooms/03" },
      { label: "07 · Sala 04 · espectador", route: "/emulation/rooms/04" },
      { label: "08 · Sala 05 · pantalla completa", route: "/emulation/rooms/05" }
    ]
  },
  {
    title: "Enlace · protocolo futuro",
    entries: [
      { label: "09 · Battle Room", route: "/emulation/battle" },
      { label: "10 · Trade Room", route: "/emulation/trade" }
    ]
  },
  {
    title: "Room Suite Studio · overview + 7 secciones",
    entries: [
      { label: "11 · Studio · overview", route: "/emulation/studio" },
      { label: "12 · Studio · room manager", route: "/emulation/studio/manager" },
      { label: "13 · Studio · live monitor", route: "/emulation/studio/monitor" },
      { label: "14 · Studio · link manager", route: "/emulation/studio/link" },
      { label: "15 · Studio · permisos", route: "/emulation/studio/permissions" },
      { label: "16 · Studio · session logs", route: "/emulation/studio/logs" },
      { label: "17 · Studio · analytics", route: "/emulation/studio/analytics" },
      { label: "18 · Studio · emulator adapters", route: "/emulation/studio/adapters" }
    ]
  }
];
var CREATE_STEPS = [
  {
    label: "01 · Modalidad de sala",
    detail: "PG CREATE ROOM — ASISTENTE DE CONFIGURACIÓN V2.4. Selección visual; no crea ninguna sala."
  },
  {
    label: "02 · Generación y formato",
    detail: "Gen I–II (GBC), Gen III (GBA), Gen IV (DS) y Gen V (DS-2). Solo etiquetas de referencia, sin ROM."
  },
  {
    label: "03 · Adaptador",
    detail: "Paso 04: ADAPTADOR. Especificación futura aislada; no se carga ni se registra ningún adaptador."
  },
  {
    label: "04 · ROM / SAV",
    detail: "IGNORAR (SRAM SOLO LECTURA). No se importan, leen, copian ni transmiten partidas."
  },
  {
    label: "05 · Sincronización",
    detail: "APLICAR PARCHE DE SINCRONIZACIÓN. Acción inerte: no escribe buffers ni saves."
  },
  {
    label: "06 · Participantes",
    detail: "Sin cuentas, identidades ni invitaciones. Los nombres del mockup no son datos de sesión."
  },
  {
    label: "07 · Permisos",
    detail: "Matriz de permisos ilustrativa; no concede ni revoca acceso a nada."
  },
  {
    label: "08 · Parámetros LINK",
    detail: "Cable Link emulado como protocolo futuro. No hay transporte, paquetes ni ACK reales."
  },
  {
    label: "09 · Validación tri-estado",
    detail: "MATRIZ DE VALIDACIÓN TRI-ESTADO. Documento visual: no emite veredicto de legalidad."
  }
];
var FLOW_LABELS = [
  "OBSERVAR PARTIDA",
  "CREAR BATALLA",
  "UNIRSE A BATALLA",
  "INTERCAMBIAR",
  "ADMINISTRAR SALA",
  "CONFIGURAR EMULADOR"
];
var CONTROL_RE = /(CREAR|CONECTAR|UNIR|STREAM|TRANSMISI|SYNC|REINICIAR|SALIR|CONFIGURAR|VIEWPORT|AUDIO|APLICAR|GUARDAR|ABORTAR|LUCHAR|HUIR|LISTO|PAUSAR|PURGAR|EXPORTAR|FORZAR|DESCONECTAR|BUSCADOR|FILTROS|ACK)/i;
var PLAYER_RE = /(P1|P2|JUGADOR|TRAINER|ANFITRI|HUÉSPED|ESPECTADOR|CHASSIS|HW:)/i;
var wizardSeq = 0;
function decodeEntities(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function sourceOf(page) {
  return page.sources[0];
}
function sourceStrip(page) {
  const src = sourceOf(page);
  const wrap = el("div", "pg-em-source");
  wrap.appendChild(el("h3", "pg-em-source__title", `Referencia Stitch · ${src ? decodeEntities(src.title) : "sin fuente"}`));
  if (!src) {
    wrap.appendChild(emptyState("La entrada del catálogo no expone una pantalla Stitch asociada."));
    return wrap;
  }
  const headings = el("ul", "pg-em-source__list");
  for (const heading of src.headings)
    headings.appendChild(el("li", undefined, decodeEntities(heading)));
  wrap.appendChild(headings);
  const chips = el("div", "pg-em-source__chips");
  for (const label of src.buttons)
    chips.appendChild(el("span", "pg-em-source__chip", decodeEntities(label)));
  wrap.appendChild(chips);
  return wrap;
}
function realMockControls(page, limit = 8) {
  const labels = (sourceOf(page)?.buttons ?? []).map(decodeEntities).filter((label) => CONTROL_RE.test(label));
  const chosen = (labels.length ? labels : ["CONECTAR", "UNIRSE", "INICIAR STREAMING"]).slice(0, limit);
  const bar = toolbar(chosen.map((label) => `${label} · INERTE`));
  bar.classList.add("pg-em-toolbar");
  return bar;
}
function viewport(label) {
  const wrap = el("div", "pg-em-viewport");
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", `${label}: pantalla LCD de referencia 160×144 sin señal real`);
  const screen = el("div", "pg-em-viewport__screen");
  screen.append(el("span", "pg-em-viewport__label", "LCD 160×144 · 10:9"), el("span", "pg-em-viewport__signal", "SIN SEÑAL"), el("span", "pg-em-viewport__note", label));
  wrap.appendChild(screen);
  return wrap;
}
function connectionPanel(page) {
  const src = sourceOf(page);
  const box = el("div", "pg-em-connection");
  box.append(table("Estado de conexión (maqueta, sin datos de sesión)", [
    ["Enlace", "NO ACTIVO · prototipo UI"],
    ["Cable Link", "NO IMPLEMENTADO"],
    ["Streaming", "NO IMPLEMENTADO"],
    ["Sesión / jugadores", "SIN DATOS REALES"],
    ["Referencia Stitch", src ? `${src.id.slice(0, 8)} · ${src.resolution}` : "—"]
  ]), progress("Datos de sesión reales disponibles", 0), el("p", "pg-em-hint", "El 0 % es una etiqueta del prototipo, no una medición de red."));
  return box;
}
function playerCards(page) {
  const labels = (sourceOf(page)?.buttons ?? []).map(decodeEntities).filter((label) => PLAYER_RE.test(label)).slice(0, 4);
  if (labels.length === 0) {
    return cards([
      { title: "JUGADOR 1 · MAQUETA", text: "Sin identidad, save ni datos de sesión.", tag: "SIN SESIÓN" },
      { title: "JUGADOR 2 · MAQUETA", text: "Sin identidad, save ni datos de sesión.", tag: "SIN SESIÓN" }
    ]);
  }
  return cards(labels.map((label, index) => ({
    title: label,
    text: "Texto impreso en la maqueta Stitch; no identifica a una persona ni a una partida.",
    tag: index === 0 ? "P1 · MAQUETA" : index === 1 ? "P2 · MAQUETA" : "REFERENCIA"
  })));
}
function roomView(page) {
  const wrap = el("div", "pg-em-view pg-em-view--room");
  const grid = el("div", "pg-em-grid pg-em-grid--room");
  grid.append(section("Panel de jugadores", "Participantes de maqueta. No hay sesión, cuentas ni identidades reales.", playerCards(page)), section("Estado de conexión", "Estados representados visualmente; ninguno es una medición.", connectionPanel(page)), section("Viewport", "Panel de referencia 160×144; no se dibuja ninguna partida.", viewport("Sala de referencia")));
  wrap.append(grid, section("Referencia de la sala", "Encabezados y controles literales de page.sources[0].", sourceStrip(page)), realMockControls(page));
  return wrap;
}
function warningBox() {
  const box = el("div", "pg-em-warning");
  box.setAttribute("role", "note");
  box.setAttribute("aria-label", "Aviso obligatorio: prototipo sin enlace real");
  box.dataset.pgEmDisclaimer = "1";
  box.append(el("strong", undefined, "AVISO OBLIGATORIO · PROTOTIPO VISUAL"), el("span", "pg-em-warning__text", LINK_DISCLAIMER));
  return box;
}
function linkRoomView(page) {
  const isBattle = page.route === "/emulation/battle";
  const headings = (sourceOf(page)?.headings ?? []).map(decodeEntities);
  const panels = headings.length ? headings : [isBattle ? "TRAINER RED [SIMULADO]" : "PROTOCOLO [SIMULADO]"];
  const wrap = el("div", "pg-em-view pg-em-view--link");
  wrap.appendChild(warningBox());
  const grid = el("div", "pg-em-grid pg-em-grid--link");
  grid.append(section(isBattle ? "Entrenadores de maqueta" : "Motor de reglas de maqueta", "Etiquetas literales de la referencia Stitch. No se muestra ningún resultado.", cards(panels.map((label) => ({
    title: label,
    text: "Referencia visual: no se ejecuta ninguna acción ni se calcula un resultado.",
    tag: "SIMULADO"
  }))), viewport(isBattle ? "Combate no simulado" : "Intercambio no simulado")), section("Estado del enlace", "Sin transporte, sin sesión y sin intercambio.", connectionPanel(page), code("Protocolo futuro: Cable Link emulado · sin implementación")));
  wrap.append(grid, section("Referencia del enlace", "Headings y botones reales del HTML de Stitch.", sourceStrip(page)), realMockControls(page, 6));
  return wrap;
}
function explorerView(page) {
  const headings = (sourceOf(page)?.headings ?? []).map(decodeEntities);
  const rooms = headings.filter((heading) => /Torneo|Intercambio|Sala Abierta|Hoenn|Bóveda/i.test(heading)).slice(0, 6);
  const cells = rooms.length ? rooms : headings.slice(2, 8);
  const wrap = el("div", "pg-em-view pg-em-view--explorer");
  wrap.append(section("Mural en vivo · 6 celdas de monitorización", "Celdas de referencia. Ninguna muestra una partida, un jugador ni una señal real.", cards(cells.length ? cells.map((label, index) => ({
    title: label,
    text: "Celda del mural Stitch. Sin streaming ni datos de sesión.",
    tag: `CELL ${String(index + 1).padStart(2, "0")} · SIN SEÑAL`
  })) : [{ title: "Sin celdas extraíbles", text: "La referencia no expone títulos de sala.", tag: "MAQUETA" }])), section("Filtros y acciones del mural", "Todos los controles están desactivados en el prototipo.", realMockControls(page)), section("Referencia del explorador", "Headings y botones reales del HTML de Stitch.", sourceStrip(page)));
  return wrap;
}
function flowsView(page) {
  const wrap = el("div", "pg-em-view pg-em-view--flows");
  wrap.append(section("Mapa maestro de flujos 01–06", "Documentación visual dentro de la app: no hay transiciones ni máquina de estados activa.", cards(FLOW_LABELS.map((label, index) => ({
    title: `${String(index + 1).padStart(2, "0")} · ${label}`,
    text: "Flujo documental de la referencia Stitch; no se dispara ningún evento.",
    tag: "SOLO LECTURA"
  })))), section("Matriz de estados (documental)", "Tabla de referencia: no representa el estado de una sesión real.", table("Flujos del mapa maestro", FLOW_LABELS.map((label, index) => [`F${String(index + 1).padStart(2, "0")}`, `${label} · sin transición real`]))), section("Referencia de flujos", "Headings y botones reales del HTML de Stitch.", sourceStrip(page)), realMockControls(page, 6));
  return wrap;
}
function createWizard(page) {
  const seq = ++wizardSeq;
  let active = 0;
  const stepButtons = [];
  const wrap = el("div", "pg-em-view pg-em-view--wizard");
  wrap.appendChild(section("Asistente de 9 pasos · maqueta", "Recorrido visual de navegación. Ningún paso guarda configuración ni crea una sala."));
  const wizard = el("div", "pg-em-wizard");
  const steps = el("nav", "pg-em-wizard__steps");
  steps.setAttribute("aria-label", "Pasos del asistente (solo interfaz)");
  const panel = el("div", "pg-em-wizard__panel");
  panel.setAttribute("aria-live", "polite");
  const render = () => {
    stepButtons.forEach((buttonEl, index) => {
      const current = index === active;
      buttonEl.setAttribute("aria-pressed", String(current));
      if (current) {
        buttonEl.classList.add("is-current");
        buttonEl.setAttribute("aria-current", "step");
      } else {
        buttonEl.classList.remove("is-current");
        buttonEl.removeAttribute("aria-current");
      }
    });
    const step = CREATE_STEPS[active] ?? CREATE_STEPS[0];
    const title = el("h3", "pg-em-wizard__title", step.label);
    title.id = `pg-em-wizard-title-${seq}`;
    panel.replaceChildren(title, el("p", "pg-em-wizard__detail", step.detail), emptyState("Paso inerte: no escribe datos, no abre enlaces y no inicia emulación."));
    panel.setAttribute("aria-labelledby", title.id);
  };
  const setStep = (index) => {
    active = Math.max(0, Math.min(CREATE_STEPS.length - 1, index));
    render();
  };
  CREATE_STEPS.forEach((step, index) => {
    const stepButton = button(step.label, () => setStep(index), "pg-em-wizard__step-btn");
    stepButton.setAttribute("aria-label", `${step.label} — mostrar paso (maqueta)`);
    stepButtons.push(stepButton);
    steps.appendChild(stepButton);
  });
  const nav = el("div", "pg-em-wizard__nav");
  nav.append(button("◀ PASO ANTERIOR", () => setStep(active - 1)), button("PASO SIGUIENTE ▶", () => setStep(active + 1)), mockButton("CREAR SALA · INERTE", "Maqueta visual: no se crea ninguna sala."), mockButton("GUARDAR BORRADOR EN LOCAL · INERTE", "Maqueta visual: no se guarda ningún borrador."));
  wizard.append(steps, panel, nav);
  wrap.appendChild(wizard);
  wrap.appendChild(section("Referencia del asistente", "Controles y encabezados reales del HTML de Stitch.", sourceStrip(page), realMockControls(page, 5)));
  render();
  return wrap;
}
function studioView(page) {
  const src = sourceOf(page);
  const headings = (src?.headings ?? []).map(decodeEntities);
  const buttons = (src?.buttons ?? []).map(decodeEntities);
  const modules = buttons.filter((label) => /^(\d{2}\s|>\s?|OVERVIEW|ROOM|MONITOR|LINK|PERMISSION|LOG|ANALYTIC|ADAPTER)/i.test(label)).slice(0, 10);
  const moduleCards2 = modules.length ? modules.map((label, index) => ({
    title: label,
    text: "Módulo de referencia: no consulta ni modifica salas, enlaces ni telemetría.",
    tag: `M${String(index + 1).padStart(2, "0")}`
  })) : [{ title: "Sin submódulos extraíbles", text: "La pantalla Stitch no expone entradas de rail.", tag: "MAQUETA" }];
  const wrap = el("div", "pg-em-view pg-em-view--studio");
  wrap.append(section(page.title, page.notes, cards(moduleCards2), realMockControls(page, 6)), section("Ficha de la pantalla", "Metadatos del mockup Stitch; no son datos de una sesión de emulación.", table("Referencia", [
    ["Fuente Stitch", src ? `${src.id.slice(0, 8)} · ${decodeEntities(src.title).slice(0, 52)}` : "—"],
    ["Clasificación", src?.classification ?? "—"],
    ["Resolución", src?.resolution ?? "—"],
    ["Estado del catálogo", page.state]
  ]), headings.length ? table("Secciones del mockup", headings.map((heading, index) => [`H${String(index + 1).padStart(2, "0")}`, heading])) : emptyState("Esta pantalla Stitch no expone encabezados extraíbles.")), section("Referencia del estudio", "Headings y botones reales del HTML de Stitch.", sourceStrip(page)), el("p", "pg-em-note", "Analíticas, registros y monitores de esta suite son ilustrativos: no proceden de ejecución real."));
  return wrap;
}
function viewFor(page) {
  const route = page.route;
  if (route === "/emulation")
    return explorerView(page);
  if (route === "/emulation/flows")
    return flowsView(page);
  if (route === "/emulation/create")
    return createWizard(page);
  if (route.startsWith("/emulation/rooms/"))
    return roomView(page);
  if (route === "/emulation/battle" || route === "/emulation/trade")
    return linkRoomView(page);
  if (route.startsWith("/emulation/studio"))
    return studioView(page);
  return emptyState("Ruta no reconocida dentro del catálogo de emulación.");
}
function createEmulationWorkbench(page, navigate) {
  const frame = pageFrame(page, navigate);
  frame.root.classList.add("pg-em-root");
  frame.root.dataset.pgEmRoute = page.route;
  frame.root.dataset.pgEmRouteCount = String(RAIL_GROUPS.reduce((total, group) => total + group.entries.length, 0));
  for (const group of RAIL_GROUPS) {
    frame.aside.appendChild(moduleRail(group.title, group.entries.map((entry) => ({ ...entry, active: entry.route === page.route })), navigate));
  }
  frame.aside.appendChild(referenceOutline(page));
  frame.body.appendChild(viewFor(page));
  return frame.root;
}
export {
  pagesForDomain,
  pageForRoute,
  destinationsOfDomain,
  destinationForPath,
  createMarketingWorkbench,
  createEmulationWorkbench,
  createCreatorWorkbench,
  createCoreWorkbench,
  PAGES,
  DESTINATIONS
};
