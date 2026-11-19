import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  db,
  EXPORTS_DIR,
  getExportById,
  getPetById,
  getSaveById,
  getSaveBySha,
  listExports,
  listPets,
  SAVES_DIR,
  type ExportRow,
  type PetRow,
  type SaveRow,
} from "./db";
import { exportPlan, inventory, sidecarVersion, type ExportReport } from "./sidecar";
import {
  ACTION_INFO,
  TRAIN_GAMES,
  advance,
  applyAction,
  createState,
  evTotals,
  moodOf,
  traitsOf,
  train,
  type ActionId,
  type PetProfile,
  type PetState,
  type StatIndex,
} from "../../web/src/pet-engine.ts";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = "127.0.0.1";
const WEB_DIR = join(import.meta.dir, "..", "..", "web");
const ts = new Bun.Transpiler({ loader: "ts" });
const ALLOWED_SIZES = new Set([32768, 65536, 131072, 262144, 524288]);

type Inventory = {
  detected: boolean;
  saveType: string | null;
  generation: number | null;
  version: number | null;
  versionName: string | null;
  trainer: {
    ot: string | null;
    tid: number | null;
    money: number | null;
    playTime: string | null;
  } | null;
  party: any[];
  boxes: { index: number; name: string; slots: any[] }[];
  roundTrip: { identical: boolean } | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function safeExt(filename: string): string {
  const m = /\.(srm|sav|dsv|bin)$/i.exec(filename);
  return m ? m[1].toLowerCase() : "srm";
}

function persist(sha: string, filename: string, bytes: Uint8Array): string {
  const path = join(SAVES_DIR, `${sha}.${safeExt(filename)}`);
  writeFileSync(path, bytes);
  return path;
}

function indexPokemon(saveId: number, inv: Inventory) {
  const insert = db.query(
    `INSERT INTO pokemon (save_id, location, box_index, box_name, slot, species, species_name,
      nickname, level, exp, nature, ability, held_item, friendship, shiny, gender, is_egg,
      legal, verdict, issues_json, legality_report, iv_json, ev_json, moves_json, stats_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );

  const rows: [string, number | null, string | null, any][] = [];
  for (const p of inv.party ?? []) rows.push(["party", null, null, p]);
  for (const box of inv.boxes ?? []) {
    for (const p of box.slots ?? []) rows.push(["box", box.index, box.name, p]);
  }

  db.transaction(() => {
    for (const [location, boxIndex, boxName, p] of rows) {
      insert.run(
        saveId,
        location,
        boxIndex,
        boxName,
        p.slot ?? 0,
        p.species ?? 0,
        p.speciesName ?? null,
        p.nickname ?? null,
        p.level ?? null,
        p.exp ?? null,
        p.nature ?? null,
        p.ability ?? null,
        p.heldItem ?? null,
        p.friendship ?? null,
        p.shiny ? 1 : 0,
        p.gender ?? null,
        p.isEgg ? 1 : 0,
        p.legal ? 1 : 0,
        p.verdict ?? (p.legal ? "legal" : "illegal"),
        JSON.stringify(p.issues ?? []),
        p.legalityReport ?? null,
        JSON.stringify(p.ivs ?? []),
        JSON.stringify(p.evs ?? []),
        JSON.stringify(p.moves ?? []),
        JSON.stringify(p.stats ?? {}),
      );
    }
  })();
}

async function ingest(filename: string, bytes: Uint8Array) {
  // Solo el nombre: nunca guardar rutas del usuario en la base.
  filename = filename.split(/[\\/]/).pop() || "save.srm";
  if (!ALLOWED_SIZES.has(bytes.length)) {
    return json(
      { error: `tamaño no soportado: ${bytes.length} B`, allowed: [...ALLOWED_SIZES] },
      400,
    );
  }

  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  const sha = hasher.digest("hex");

  const existing = getSaveBySha(sha);
  if (existing) {
    return json({ duplicate: true, save: summarize(existing) }, 200);
  }

  const storedPath = persist(sha, filename, bytes);
  const result = await inventory(storedPath);
  if (!result.ok) {
    return json({ error: "el sidecar no pudo leer el save", detail: result.error, sha }, 422);
  }

  const inv = result.data as Inventory;
  if (!inv.detected) {
    return json(
      {
        error: "save no reconocido por PKHeX",
        sha,
        hint: "puede ser un hack con estructura propia o un archivo que no es de Gen 1-5",
      },
      422,
    );
  }

  const total =
    inv.counts?.total ??
    (inv.party?.length ?? 0) + (inv.boxes ?? []).reduce((n, b) => n + b.slots.length, 0);
  const legal = inv.counts?.legal ?? 0;
  const unverified = inv.counts?.unverified ?? 0;

  const info = db
    .query(
      `INSERT INTO saves (sha256, filename, stored_path, size, generation, save_type, version,
        version_name, trainer_ot, trainer_tid, money, play_time, party_count, box_count,
        pokemon_total, legal_count, unverified_count, illegal_count, round_trip_identical, imported_at, inventory_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      sha,
      filename,
      storedPath,
      bytes.length,
      inv.generation,
      inv.saveType,
      inv.version,
      inv.versionName,
      inv.trainer?.ot ?? null,
      inv.trainer?.tid ?? null,
      inv.trainer?.money ?? null,
      inv.trainer?.playTime ?? null,
      inv.party?.length ?? 0,
      inv.boxes?.length ?? 0,
      total,
      legal,
      unverified,
      total - legal - unverified,
      inv.roundTrip?.identical ? 1 : 0,
      new Date().toISOString(),
      JSON.stringify(inv),
    );

  indexPokemon(Number(info.lastInsertRowid), inv);
  const row = getSaveBySha(sha)!;
  return json({ save: summarize(row) }, 201);
}

async function refresh(row: SaveRow) {
  const result = await inventory(row.stored_path);
  if (!result.ok) return { ok: false as const, error: result.error };
  const inv = result.data as Inventory;
  if (!inv.detected) return { ok: false as const, error: "save no reconocido por PKHeX" };

  const total =
    inv.counts?.total ??
    (inv.party?.length ?? 0) + (inv.boxes ?? []).reduce((n, b) => n + b.slots.length, 0);
  const legal = inv.counts?.legal ?? 0;
  const unverified = inv.counts?.unverified ?? 0;

  db.query(
    `UPDATE saves SET generation=?, save_type=?, version=?, version_name=?, trainer_ot=?,
      trainer_tid=?, money=?, play_time=?, party_count=?, box_count=?, pokemon_total=?,
      legal_count=?, unverified_count=?, illegal_count=?, round_trip_identical=?, inventory_json=? WHERE id=?`,
  ).run(
    inv.generation,
    inv.saveType,
    inv.version,
    inv.versionName,
    inv.trainer?.ot ?? null,
    inv.trainer?.tid ?? null,
    inv.trainer?.money ?? null,
    inv.trainer?.playTime ?? null,
    inv.party?.length ?? 0,
    inv.boxes?.length ?? 0,
    total,
    legal,
    unverified,
    total - legal - unverified,
    inv.roundTrip?.identical ? 1 : 0,
    JSON.stringify(inv),
    row.id,
  );

  db.query("DELETE FROM pokemon WHERE save_id = ?").run(row.id);
  indexPokemon(row.id, inv);
  return { ok: true as const, save: summarize(getSaveById(row.id)!) };
}

function summarize(row: SaveRow) {
  return {
    id: row.id,
    sha256: row.sha256,
    filename: String(row.filename).split(/[\\/]/).pop(),
    size: row.size,
    generation: row.generation,
    saveType: row.save_type,
    version: row.version,
    versionName: row.version_name,
    trainer: row.trainer_ot,
    tid: row.trainer_tid,
    money: row.money,
    playTime: row.play_time,
    party: row.party_count,
    boxes: row.box_count,
    pokemon: row.pokemon_total,
    legal: row.legal_count,
    unverified: row.unverified_count,
    illegal: row.illegal_count,
    roundTripIdentical: !!row.round_trip_identical,
    importedAt: row.imported_at,
  };
}

/* ------------------------------------------------------------------ */
/* Guardería                                                          */
/* ------------------------------------------------------------------ */

type PkmLite = {
  pid: number;
  species: number;
  speciesName: string;
  nickname?: string | null;
  level: number;
  nature?: string | number | null;
  ivs?: number[];
  evs?: number[];
  shiny?: boolean;
  gender?: number | null;
  verdict?: string | null;
  ot?: string | null;
  metLocationName?: string | null;
};

type MonSlot = { p: PkmLite; location: "party" | "box"; box: number | null; slot: number };

/**
 * Recorre el inventario conservando de dónde sale cada Pokémon. Hace falta porque
 * en Gen 1 y 2 todos los `pid` valen 0: la única identidad estable es la ranura.
 */
function allMonsWithSlot(inv: any): MonSlot[] {
  const out: MonSlot[] = [];
  for (const p of (inv.party ?? []) as PkmLite[]) {
    out.push({ p, location: "party", box: null, slot: Number(p.slot ?? 0) });
  }
  for (const b of (inv.boxes ?? []) as { index: number; slots: PkmLite[] }[]) {
    for (const p of b.slots ?? []) {
      out.push({ p, location: "box", box: Number(b.index), slot: Number(p.slot ?? 0) });
    }
  }
  return out;
}

function allMons(inv: any): PkmLite[] {
  return allMonsWithSlot(inv).map((m) => m.p);
}

/** Ranura 1-based; en Gen 1/2 sin PID es la única identidad válida. */
function findMon(inv: any, pid: number, location?: string, box?: number, slot?: number): MonSlot | undefined {
  const mons = allMonsWithSlot(inv);
  if (Number.isFinite(pid) && pid !== 0) {
    const byPid = mons.find((m) => Number(m.p.pid) === pid);
    if (byPid) return byPid;
  }
  if ((location === "party" || location === "box") && Number(slot) > 0) {
    return mons.find(
      (m) => m.location === location && m.slot === Number(slot) && (location === "party" || m.box === Number(box)),
    );
  }
  return undefined;
}

function profileOf(p: PkmLite, generation: number): PetProfile {
  return {
    species: p.species,
    speciesName: p.speciesName,
    nickname: String(p.nickname ?? "").trim() || p.speciesName,
    level: p.level,
    nature: typeof p.nature === "string" ? p.nature : null,
    ivs: p.ivs ?? [0, 0, 0, 0, 0, 0],
    baseEvs: p.evs ?? [0, 0, 0, 0, 0, 0],
    generation,
    pid: p.pid,
    ot: p.ot ?? null,
    shiny: !!p.shiny,
    gender: p.gender ?? null,
    metLocationName: p.metLocationName ?? null,
    traits: traitsOf(p.species),
  };
}

function loadPet(row: PetRow) {
  const profile = JSON.parse(row.profile_json) as PetProfile;
  // Los rasgos son función pura de la especie: se recalculan al cargar.
  profile.traits = traitsOf(profile.species);
  const state = JSON.parse(row.state_json) as PetState;
  return { profile, state };
}

function savePet(row: PetRow, state: PetState, profile?: PetProfile) {
  if (profile) {
    db.query("UPDATE pets SET state_json = ?, profile_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify(state),
      JSON.stringify(profile),
      new Date(state.updatedAt).toISOString(),
      row.id,
    );
    return;
  }
  db.query("UPDATE pets SET state_json = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(state),
    new Date(state.updatedAt).toISOString(),
    row.id,
  );
}

/** Pone la mascota al día y devuelve la vista que consume la web. */
function petView(row: PetRow, now = Date.now()) {
  const { profile, state } = loadPet(row);
  const fresh = advance(state, profile, now);
  if (fresh.updatedAt !== state.updatedAt) savePet(row, fresh);
  const ev = evTotals(profile, fresh);
  return {
    id: row.id,
    save: row.sha256,
    active: !!row.active,
    createdAt: row.created_at,
    profile,
    state: fresh,
    mood: moodOf(fresh),
    ageDays: Math.round(((now - fresh.bornAt) / 86_400_000) * 10) / 10,
    evs: ev.current,
    totalEvs: ev.total,
    caps: ev.caps,
  };
}

/** Listado de exportaciones sin el informe completo (que va en el detalle). */
function briefExport(row: ExportRow) {
  const { report_json: _drop, ...rest } = row;
  return rest;
}

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  idleTimeout: 60,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/api/health") {
      return json({ ok: true, service: "pokeguarde", sidecar: "PKHeX.Core", dotnet: await sidecarVersion() });
    }

    if (path === "/api/saves" && req.method === "GET") {
      const rows = db.query<SaveRow, []>("SELECT * FROM saves ORDER BY imported_at DESC").all();
      return json({ saves: rows.map(summarize) });
    }

    if (path === "/api/saves/import" && req.method === "POST") {
      let body: { path?: string };
      try {
        body = (await req.json()) as { path?: string };
      } catch {
        return json({ error: "se esperaba JSON con { path }" }, 400);
      }
      if (!body.path) return json({ error: "falta path" }, 400);
      const file = Bun.file(body.path);
      if (!(await file.exists())) return json({ error: `no existe: ${body.path}` }, 404);
      const bytes = new Uint8Array(await file.arrayBuffer());
      return ingest(file.name ?? "save.srm", bytes);
    }

    if (path === "/api/saves/upload" && req.method === "POST") {
      const bytes = new Uint8Array(await req.arrayBuffer());
      if (bytes.length === 0) return json({ error: "cuerpo vacío" }, 400);
      const filename = url.searchParams.get("filename") ?? req.headers.get("x-filename") ?? "save.srm";
      return ingest(filename, bytes);
    }

    const detail = /^\/api\/saves\/([0-9a-f]{64})$/.exec(path);
    if (detail && req.method === "GET") {
      const row = getSaveBySha(detail[1]);
      if (!row) return json({ error: "no encontrado" }, 404);
      return json({ save: summarize(row), inventory: JSON.parse(row.inventory_json) });
    }

    const reparseOne = /^\/api\/saves\/([0-9a-f]{64})\/reparse$/.exec(path);
    if (reparseOne && req.method === "POST") {
      const row = getSaveBySha(reparseOne[1]);
      if (!row) return json({ error: "no encontrado" }, 404);
      const out = await refresh(row);
      return out.ok ? json({ save: out.save }) : json({ error: out.error }, 422);
    }

    if (path === "/api/saves/reparse" && req.method === "POST") {
      const rows = db.query<SaveRow, []>("SELECT * FROM saves ORDER BY id").all();
      const results: Array<Record<string, unknown>> = [];
      for (const row of rows) {
        const out = await refresh(row);
        results.push(out.ok ? { sha256: row.sha256, ok: true, save: out.save } : { sha256: row.sha256, ok: false, error: out.error });
      }
      return json({ count: results.length, results });
    }

    const mons = /^\/api\/saves\/([0-9a-f]{64})\/pokemon$/.exec(path);
    if (mons && req.method === "GET") {
      const row = getSaveBySha(mons[1]);
      if (!row) return json({ error: "no encontrado" }, 404);
      const legal = url.searchParams.get("legal");
      const q = url.searchParams.get("q");
      const clauses = ["save_id = ?"];
      const params: (string | number)[] = [row.id];
      if (legal === "true") clauses.push("legal = 1");
      if (legal === "false") clauses.push("legal = 0");
      if (q) {
        clauses.push("(species_name LIKE ? OR nickname LIKE ?)");
        params.push(`%${q}%`, `%${q}%`);
      }
      const rows = db
        .query(`SELECT * FROM pokemon WHERE ${clauses.join(" AND ")} ORDER BY species, level`)
        .all(...params);
      return json({ count: rows.length, pokemon: rows });
    }

    /* ---------------------- Guardería ---------------------- */

    if (path === "/api/pets" && req.method === "GET") {
      return json({ pets: listPets().map((r) => petView(r)) });
    }

    if (path === "/api/pets" && req.method === "POST") {
      type AdoptBody = { sha256?: string; pid?: number; location?: string; box?: number; slot?: number };
      let body: AdoptBody;
      try {
        body = (await req.json()) as AdoptBody;
      } catch {
        return json({ error: "se esperaba JSON con { sha256, pid } o { sha256, location, box, slot }" }, 400);
      }
      const pid = Number(body.pid ?? 0);
      const slot = Number(body.slot ?? 0);
      if (!body.sha256 || (!Number.isFinite(pid) && !Number.isFinite(slot))) {
        return json({ error: "faltan sha256 y la identidad (pid, o location+box+slot)" }, 400);
      }

      const row = getSaveBySha(body.sha256);
      if (!row) return json({ error: "partida no encontrada" }, 404);

      const inv = JSON.parse(row.inventory_json);
      const found = findMon(inv, pid, body.location, Number(body.box), slot);
      if (!found) return json({ error: "ese Pokémon no está en la partida" }, 404);
      const pkm = found.p;
      if (pkm.verdict === "illegal") {
        return json({ error: "No se puede adoptar un Pokémon marcado como ilegal." }, 422);
      }

      // Con PID se deduplica por PID (estable aunque el Pokémon cambie de caja);
      // sin PID (Gen 1/2) la ranura es lo único que lo identifica.
      const dup =
        Number(pkm.pid) !== 0
          ? db
              .query<{ id: number }, [string, number]>("SELECT id FROM pets WHERE sha256 = ? AND pid = ?")
              .get(body.sha256, Number(pkm.pid))
          : db
              .query<{ id: number }, [string, string, number, number]>(
                "SELECT id FROM pets WHERE sha256 = ? AND location = ? AND slot = ? AND COALESCE(box_index, -1) = ?",
              )
              .get(body.sha256, found.location, found.slot, found.box ?? -1);
      if (dup) return json({ error: "Ese Pokémon ya vive en la Guardería.", petId: dup.id }, 409);

      const generation = row.generation ?? inv.generation ?? 0;
      const profile = profileOf(pkm, generation);
      const now = Date.now();
      const state = createState(profile, now);
      const first = listPets().length === 0;

      const info = db
        .query(
          `INSERT INTO pets (save_id, sha256, species, species_name, nickname, level, generation, nature, pid,
            location, box_index, slot, profile_json, state_json, created_at, updated_at, active)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          row.id,
          row.sha256,
          profile.species,
          profile.speciesName,
          profile.nickname,
          profile.level,
          profile.generation,
          profile.nature,
          profile.pid,
          found.location,
          found.box,
          found.slot,
          JSON.stringify(profile),
          JSON.stringify(state),
          new Date(now).toISOString(),
          new Date(now).toISOString(),
          first ? 1 : 0,
        );

      const created = getPetById(Number(info.lastInsertRowid));
      return created ? json({ pet: petView(created) }, 201) : json({ error: "no se pudo crear" }, 500);
    }

    const petOne = /^\/api\/pets\/(\d+)$/.exec(path);
    if (petOne) {
      const row = getPetById(Number(petOne[1]));
      if (!row) return json({ error: "mascota no encontrada" }, 404);

      if (req.method === "GET") return json({ pet: petView(row) });

      if (req.method === "DELETE") {
        let body: { confirm?: boolean } = {};
        try {
          body = (await req.json()) as { confirm?: boolean };
        } catch {
          /* cuerpo opcional */
        }
        if (!body.confirm) return json({ error: "hace falta { confirm: true } para liberar" }, 400);
        db.query("DELETE FROM pets WHERE id = ?").run(row.id);
        return json({ ok: true, released: row.id });
      }
    }

    const petAction = /^\/api\/pets\/(\d+)\/action$/.exec(path);
    if (petAction && req.method === "POST") {
      const row = getPetById(Number(petAction[1]));
      if (!row) return json({ error: "mascota no encontrada" }, 404);
      let body: { action?: string };
      try {
        body = (await req.json()) as { action?: string };
      } catch {
        return json({ error: "se esperaba JSON con { action }" }, 400);
      }
      const action = body.action as ActionId;
      if (!action || !(action in ACTION_INFO)) {
        return json({ error: `acción no válida: ${body.action}`, valid: Object.keys(ACTION_INFO) }, 400);
      }
      const { profile, state } = loadPet(row);
      const now = Date.now();
      const out = applyAction(state, profile, action, now);
      if (out.ok) savePet(row, out.state);
      // La fila en memoria queda obsoleta tras guardar: hay que releerla.
      const after = getPetById(row.id) ?? row;
      const pet = petView(after, now);
      return json({ ok: out.ok, error: out.ok ? undefined : out.message, message: out.message, pet, state: pet.state }, out.ok ? 200 : 409);
    }

    const petTrain = /^\/api\/pets\/(\d+)\/train$/.exec(path);
    if (petTrain && req.method === "POST") {
      const row = getPetById(Number(petTrain[1]));
      if (!row) return json({ error: "mascota no encontrada" }, 404);
      let body: { stat?: number; score?: number };
      try {
        body = (await req.json()) as { stat?: number; score?: number };
      } catch {
        return json({ error: "se esperaba JSON con { stat, score }" }, 400);
      }
      const stat = Number(body.stat);
      const score = Number(body.score);
      if (!Number.isInteger(stat) || stat < 0 || stat > 5) {
        return json({ error: "stat debe ser 0..5", games: TRAIN_GAMES }, 400);
      }
      if (!Number.isFinite(score)) return json({ error: "score debe ser un número 0..1" }, 400);

      const { profile, state } = loadPet(row);
      const out = train(state, profile, stat as StatIndex, score, Date.now());
      if (out.ok) savePet(row, out.state);
      const after = getPetById(row.id) ?? row;
      return json(
        { ok: out.ok, error: out.ok ? undefined : out.message, message: out.message, granted: out.granted, capped: out.capped, pet: petView(after) },
        out.ok ? 200 : 409,
      );
    }

    // Exportación: por defecto SOLO simula (dry-run). Escribir exige { write: true }.
    const petExport = /^\/api\/pets\/(\d+)\/export$/.exec(path);
    if (petExport && req.method === "POST") {
      const row = getPetById(Number(petExport[1]));
      if (!row) return json({ error: "mascota no encontrada" }, 404);

      let body: { write?: boolean; reason?: string } = {};
      try {
        body = (await req.json()) as { write?: boolean; reason?: string };
      } catch {
        /* cuerpo opcional: sin él se simula */
      }
      const write = body.write === true;

      const saveRow = row.sha256 ? getSaveBySha(row.sha256) : null;
      if (!saveRow) return json({ error: "la partida de origen ya no está en la biblioteca" }, 409);

      // Pone al día la mascota (y persiste el avance) antes de leer los pendientes.
      const view = petView(row);
      const pending = view.state.pendingEvs.map((n) => Math.max(0, Math.round(Number(n) || 0)));
      if (pending.every((n) => n === 0)) {
        return json({ error: "No hay EV pendientes: entrena a la mascota antes de exportar.", pending }, 400);
      }

      const gen = Number(view.profile.generation ?? saveRow.generation ?? 0);
      const delta = [...pending];
      if (gen <= 2) {
        // En Gen 1/2 el índice 3 ES el stat exp de Especial y el 4 siempre lee 0.
        delta[3] = pending[3] + pending[4];
        delta[4] = 0;
      }

      const identity: Record<string, number | string> = {};
      if (Number(row.pid) !== 0) {
        identity.pid = Number(row.pid);
      } else if (row.location && row.slot) {
        identity.location = row.location;
        identity.box = row.box_index ?? 0;
        identity.slot = row.slot;
      } else {
        return json({ error: "la mascota no recuerda de qué ranura salió; vuelve a adoptarla desde la ficha" }, 409);
      }

      const reason =
        typeof body.reason === "string" && body.reason.trim()
          ? body.reason.trim().slice(0, 300)
          : `Entrenamiento de la Guardería (mascota #${row.id})`;
      const plan = {
        reason,
        changes: [{ ...identity, species: row.species, mode: "add", evs: delta }],
      };

      const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
      const planPath = join(EXPORTS_DIR, `plan-pet${row.id}-${stamp}.json`);
      writeFileSync(planPath, JSON.stringify(plan, null, 2));
      const ext = saveRow.filename.split(".").pop() || "srm";
      const base = saveRow.filename.replace(/\.[^.]+$/, "");
      const outPath = join(EXPORTS_DIR, `${base}.pet${row.id}-${stamp}.entrenado.${ext}`);

      const result = await exportPlan(saveRow.stored_path, planPath, { out: outPath, dry: !write });
      if (!result.ok) {
        return json({ error: `el sidecar falló: ${result.error}`, stderr: result.stderr }, 502);
      }

      const report = result.data;
      const change = report.changes?.[0];
      const before = change?.before ?? [];
      const after = change?.after ?? [];
      const applied = [0, 1, 2, 3, 4, 5].map((i) => Math.max(0, (after[i] ?? 0) - (before[i] ?? 0)));
      const written = report.written === true && !report.error;

      const info = db
        .query(
          `INSERT INTO exports (pet_id, save_id, source_sha256, source_path, output_sha256, output_path,
            output_size, generation, dry_run, written, verdict_before, verdict_after, applied_json,
            withheld_json, changed_bytes, normalization_bytes, reason, report_json, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          row.id,
          saveRow.id,
          report.inputSha256 ?? row.sha256 ?? "",
          report.path ?? saveRow.stored_path,
          report.outputSha256 ?? null,
          written ? report.outputPath ?? outPath : null,
          report.outputSize ?? null,
          gen,
          write ? 0 : 1,
          written ? 1 : 0,
          change?.verdictBefore ?? null,
          change?.verdictAfter ?? null,
          JSON.stringify(applied),
          JSON.stringify(change?.withheld ?? []),
          report.diff?.changedBytes ?? null,
          report.normalization?.changedBytes ?? null,
          reason,
          JSON.stringify(report),
          new Date().toISOString(),
        );
      const exportRow = getExportById(Number(info.lastInsertRowid));

      if (written) {
        // Se descuenta del pendiente EXACTAMENTE lo que el sidecar dice que aplicó.
        const next: PetState = {
          ...view.state,
          pendingEvs: [...view.state.pendingEvs],
          log: [...view.state.log],
        };
        for (let i = 0; i < 6; i++) {
          let left = applied[i] ?? 0;
          if (left <= 0) continue;
          const take = Math.min(left, Math.max(0, next.pendingEvs[i]));
          next.pendingEvs[i] = Math.max(0, next.pendingEvs[i] - take);
          left -= take;
          if (gen <= 2 && i === 3 && left > 0) {
            const take2 = Math.min(left, Math.max(0, next.pendingEvs[4]));
            next.pendingEvs[4] = Math.max(0, next.pendingEvs[4] - take2);
          }
        }
        const total = applied.reduce((a, b) => a + b, 0);
        next.log.push({
          at: Date.now(),
          kind: "export",
          text: `Exportado al save: ${total} punto${total === 1 ? "" : "s"} de ${
            gen <= 2 ? "stat exp" : "EV"
          }${change?.capped ? " (recortado a lo legal)" : ""}. Archivo: ${report.outputPath ?? outPath}.`,
        });
        next.log = next.log.slice(-40);
        next.updatedAt = Date.now();
        // Lo escrito ya está en el save: pasa de "pendiente" a "base" para que los
        // totales que muestra la app sigan coincidiendo con el archivo real.
        const nextProfile: PetProfile = {
          ...view.profile,
          baseEvs: view.profile.baseEvs.map((v, i) => (v ?? 0) + (applied[i] ?? 0)),
        };
        savePet(row, next, nextProfile);
      }

      const afterRow = getPetById(row.id) ?? row;
      const failed = !!report.error;
      return json(
        {
          ok: !failed,
          written,
          dryRun: !write,
          note: report.note,
          error: report.error,
          applied,
          withheld: change?.withheld ?? [],
          report,
          export: exportRow,
          pet: petView(afterRow, Date.now()),
        },
        failed ? 409 : 200,
      );
    }

    const petExports = /^\/api\/pets\/(\d+)\/exports$/.exec(path);
    if (petExports && req.method === "GET") {
      const id = Number(petExports[1]);
      if (!getPetById(id)) return json({ error: "mascota no encontrada" }, 404);
      return json({ exports: listExports(id).map(briefExport) });
    }

    if (path === "/api/exports" && req.method === "GET") {
      return json({ exports: listExports().map(briefExport) });
    }

    const petActive = /^\/api\/pets\/(\d+)\/active$/.exec(path);
    if (petActive && req.method === "POST") {
      const row = getPetById(Number(petActive[1]));
      if (!row) return json({ error: "mascota no encontrada" }, 404);
      db.transaction(() => {
        db.query("UPDATE pets SET active = 0").run();
        db.query("UPDATE pets SET active = 1 WHERE id = ?").run(row.id);
      })();
      return json({ pets: listPets().map((r) => petView(r)) });
    }

    if (path === "/api/pets/games") {
      return json({ games: TRAIN_GAMES, actions: ACTION_INFO });
    }

    if (path === "/" || path === "/index.html") {
      return new Response(Bun.file(join(WEB_DIR, "index.html")), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (path === "/style.css") {
      return new Response(Bun.file(join(WEB_DIR, "src", "style.css")), {
        headers: { "content-type": "text/css; charset=utf-8" },
      });
    }

    // Assets estáticos (imágenes del fondo, sprites…). Solo dentro de apps/web/assets.
    if (path.startsWith("/assets/")) {
      const rel = decodeURIComponent(path.slice("/assets/".length));
      if (!rel || rel.includes("..") || rel.includes("\\") || rel.startsWith("/")) {
        return json({ error: "ruta no válida", path }, 400);
      }
      const file = Bun.file(join(WEB_DIR, "assets", rel));
      if (await file.exists()) {
        return new Response(file, { headers: { "cache-control": "no-cache" } });
      }
      return json({ error: "asset no encontrado", path }, 404);
    }

    const modules: Record<string, string> = {
      "/app.js": "main.ts",
      "/nursery.js": "nursery.ts",
      "/pet-engine.js": "pet-engine.ts",
      // Módulos compartidos: el navegador resuelve `./i18n.ts` desde /pet-engine.js
      // como `/i18n.ts`; se admiten las dos extensiones para no romper imports.
      "/i18n.ts": "i18n.ts",
      "/i18n.js": "i18n.ts",
      "/daynight.ts": "daynight.ts",
      "/daynight.js": "daynight.ts",
    };
    const moduleFile = modules[path];
    if (moduleFile) {
      const source = await Bun.file(join(WEB_DIR, "src", moduleFile)).text();
      return new Response(ts.transformSync(source), {
        headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "no-store" },
      });
    }

    return json({ error: "ruta no encontrada", path }, 404);
  },
});

mkdirSync(SAVES_DIR, { recursive: true });
console.log(`Pokeguarde API en http://${HOST}:${server.port}`);
