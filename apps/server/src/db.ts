import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..", "..");
export const DATA_DIR = join(ROOT, "data");
export const SAVES_DIR = join(DATA_DIR, "saves");
export const EXPORTS_DIR = join(DATA_DIR, "exports");

mkdirSync(SAVES_DIR, { recursive: true });
mkdirSync(EXPORTS_DIR, { recursive: true });

export const db = new Database(join(DATA_DIR, "pokegotchi.db"), { create: true });

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS saves (
  id INTEGER PRIMARY KEY,
  sha256 TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  size INTEGER NOT NULL,
  generation INTEGER,
  save_type TEXT,
  version INTEGER,
  version_name TEXT,
  trainer_ot TEXT,
  trainer_tid INTEGER,
  money INTEGER,
  play_time TEXT,
  party_count INTEGER,
  box_count INTEGER,
  pokemon_total INTEGER,
  legal_count INTEGER,
  illegal_count INTEGER,
  round_trip_identical INTEGER,
  imported_at TEXT NOT NULL,
  inventory_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pokemon (
  id INTEGER PRIMARY KEY,
  save_id INTEGER NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  location TEXT NOT NULL,          -- party | box
  box_index INTEGER,
  box_name TEXT,
  slot INTEGER NOT NULL,
  species INTEGER,
  species_name TEXT,
  nickname TEXT,
  level INTEGER,
  exp INTEGER,
  nature TEXT,
  ability TEXT,
  held_item TEXT,
  friendship INTEGER,
  shiny INTEGER,
  gender INTEGER,
  is_egg INTEGER,
  legal INTEGER,
  legality_report TEXT,
  iv_json TEXT,
  ev_json TEXT,
  moves_json TEXT,
  stats_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_pokemon_save ON pokemon(save_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_species ON pokemon(species);

-- Mascotas de la Guardería. El estado vive en JSON porque lo calcula el motor
-- compartido (apps/web/src/pet-engine.ts), no SQL.
CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY,
  save_id INTEGER REFERENCES saves(id) ON DELETE SET NULL,
  sha256 TEXT,
  species INTEGER NOT NULL,
  species_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  level INTEGER NOT NULL,
  generation INTEGER,
  nature TEXT,
  pid INTEGER,
  profile_json TEXT NOT NULL,
  state_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pets_save ON pets(save_id);

-- Registro de exportaciones (fase 4). Guarda hashes de entrada/salida, el diff
-- resumido y el informe completo del sidecar, para poder auditar cada escritura.
CREATE TABLE IF NOT EXISTS exports (
  id INTEGER PRIMARY KEY,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  save_id INTEGER REFERENCES saves(id) ON DELETE SET NULL,
  source_sha256 TEXT NOT NULL,
  source_path TEXT,
  output_sha256 TEXT,
  output_path TEXT,
  output_size INTEGER,
  generation INTEGER,
  dry_run INTEGER NOT NULL DEFAULT 1,
  written INTEGER NOT NULL DEFAULT 0,
  verdict_before TEXT,
  verdict_after TEXT,
  applied_json TEXT,
  withheld_json TEXT,
  changed_bytes INTEGER,
  normalization_bytes INTEGER,
  reason TEXT,
  report_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exports_pet ON exports(pet_id);
CREATE INDEX IF NOT EXISTS idx_exports_save ON exports(save_id);
`);

// Migraciones para bases creadas antes de la clasificación triple.
{
  const cols = (table: string) =>
    new Set(
      (db.query(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((r) => r.name),
    );
  if (!cols("saves").has("unverified_count")) db.exec("ALTER TABLE saves ADD COLUMN unverified_count INTEGER");
  if (!cols("pokemon").has("verdict")) db.exec("ALTER TABLE pokemon ADD COLUMN verdict TEXT");
  if (!cols("pokemon").has("issues_json")) db.exec("ALTER TABLE pokemon ADD COLUMN issues_json TEXT");
  // Identidad por ranura: Gen 1/2 no tienen PID (todos 0), así que la mascota
  // tiene que recordar de qué ranura salió para poder devolverla al save.
  if (!cols("pets").has("location")) db.exec("ALTER TABLE pets ADD COLUMN location TEXT");
  if (!cols("pets").has("box_index")) db.exec("ALTER TABLE pets ADD COLUMN box_index INTEGER");
  if (!cols("pets").has("slot")) db.exec("ALTER TABLE pets ADD COLUMN slot INTEGER");
}

export type SaveRow = {
  id: number;
  sha256: string;
  filename: string;
  stored_path: string;
  size: number;
  generation: number | null;
  save_type: string | null;
  version: number | null;
  version_name: string | null;
  trainer_ot: string | null;
  trainer_tid: number | null;
  money: number | null;
  play_time: string | null;
  party_count: number | null;
  box_count: number | null;
  pokemon_total: number | null;
  legal_count: number | null;
  unverified_count: number | null;
  illegal_count: number | null;
  round_trip_identical: number | null;
  imported_at: string;
  inventory_json: string;
};

export function getSaveBySha(sha: string): SaveRow | null {
  return db.query<SaveRow, [string]>("SELECT * FROM saves WHERE sha256 = ?").get(sha);
}

export function getSaveById(id: number): SaveRow | null {
  return db.query<SaveRow, [number]>("SELECT * FROM saves WHERE id = ?").get(id);
}

export type PetRow = {
  id: number;
  save_id: number | null;
  sha256: string | null;
  species: number;
  species_name: string;
  nickname: string;
  level: number;
  generation: number | null;
  nature: string | null;
  pid: number | null;
  location: string | null;
  box_index: number | null;
  slot: number | null;
  profile_json: string;
  state_json: string;
  created_at: string;
  updated_at: string;
  active: number;
};

export function getPetById(id: number): PetRow | null {
  return db.query<PetRow, [number]>("SELECT * FROM pets WHERE id = ?").get(id);
}

export function listPets(): PetRow[] {
  return db.query<PetRow, []>("SELECT * FROM pets ORDER BY active DESC, created_at ASC").all();
}

export type ExportRow = {
  id: number;
  pet_id: number | null;
  save_id: number | null;
  source_sha256: string;
  source_path: string | null;
  output_sha256: string | null;
  output_path: string | null;
  output_size: number | null;
  generation: number | null;
  dry_run: number;
  written: number;
  verdict_before: string | null;
  verdict_after: string | null;
  applied_json: string | null;
  withheld_json: string | null;
  changed_bytes: number | null;
  normalization_bytes: number | null;
  reason: string | null;
  report_json: string;
  created_at: string;
};

export function getExportById(id: number): ExportRow | null {
  return db.query<ExportRow, [number]>("SELECT * FROM exports WHERE id = ?").get(id);
}

export function listExports(petId?: number): ExportRow[] {
  if (petId === undefined) {
    return db.query<ExportRow, []>("SELECT * FROM exports ORDER BY id DESC").all();
  }
  return db.query<ExportRow, [number]>("SELECT * FROM exports WHERE pet_id = ? ORDER BY id DESC").all(petId);
}
