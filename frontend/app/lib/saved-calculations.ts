import { API_BASE_URL, getFastApiErrorDetail } from "~/lib/api";

export type SavedCalcType = "derivative-steps" | "integrate-steps" | "orbital-transfers";

export type OrbitalStartData = {
  sat_mass?: number;
  i1: number;
  h1: number;
  i2: number;
  h2: number;
  force: number;
  impulse: number;
};

export type OrbitalAnswer = {
  Mrst: number;
  dV1: number;
  dV2: number;
  dV3: number;
  Mt1: number;
  Mt2: number;
  Mt3: number;
  t1: number;
  t2: number;
  t3: number;
};

export type SavedCalculationEntry = {
  type: SavedCalcType;
  start_date: string | OrbitalStartData;
  result: string | OrbitalAnswer;
  date: string;
};

export type SavedCalculationRestoreState = {
  saved: SavedCalculationEntry;
  savedIndex: number;
};

export type PersistCalculationOptions = {
  /** When false, calculation requests do not write to the user profile (e.g. restore view). */
  persistToProfile?: boolean;
  /** Replace an existing profile entry instead of prepending a new one (expects backend support). */
  replaceIndex?: number;
};

export class SaveAuthError extends Error {
  constructor() {
    super("AUTH_REQUIRED");
    this.name = "SaveAuthError";
  }
}

/** Backend endpoint not implemented yet (404/405). */
export class SavedCalcApiNotReadyError extends Error {
  constructor(message = "API для истории расчётов ещё не подключена на сервере.") {
    super(message);
    this.name = "SavedCalcApiNotReadyError";
  }
}

export function getCalculatorPath(type: SavedCalcType): string {
  switch (type) {
    case "derivative-steps":
      return "/calculators/derivative";
    case "integrate-steps":
      return "/calculators/integral";
    case "orbital-transfers":
      return "/space/orbits";
  }
}

export function getTypeTitle(type: SavedCalcType): string {
  switch (type) {
    case "derivative-steps":
      return "Производная";
    case "integrate-steps":
      return "Интеграл";
    case "orbital-transfers":
      return "Орбитальный переход";
  }
}

export function isSavedCalculationEntry(value: unknown): value is SavedCalculationEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as SavedCalculationEntry;
  return (
    entry.type === "derivative-steps" ||
    entry.type === "integrate-steps" ||
    entry.type === "orbital-transfers"
  );
}

export function formatEntryPreview(entry: SavedCalculationEntry): string {
  if (entry.type === "orbital-transfers" && typeof entry.start_date === "object") {
    const s = entry.start_date;
    return `Орбита 1: ${s.i1}°, ${s.h1} км → Орбита 2: ${s.i2}°, ${s.h2} км`;
  }
  if (typeof entry.start_date === "string") {
    const text = entry.start_date.trim();
    return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  }
  return "Сохранённый расчёт";
}

export function readSavedRestoreState(
  state: unknown,
): { entry: SavedCalculationEntry; index: number } | null {
  if (!state || typeof state !== "object") return null;
  const restore = state as SavedCalculationRestoreState;
  if (!isSavedCalculationEntry(restore.saved)) return null;
  if (typeof restore.savedIndex !== "number" || restore.savedIndex < 0) return null;
  return { entry: restore.saved, index: restore.savedIndex };
}

export function serializeOrbitsForm(
  orbits: { eccentricity: string; h: string }[],
  engine: { sat_mass: string; force: string; impulse: string },
): string {
  return JSON.stringify({ orbits, engine });
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function assertSaveResponse(response: Response): Promise<void> {
  const payload = await parseResponsePayload(response);
  if (response.status === 401) {
    throw new SaveAuthError();
  }
  if (!response.ok) {
    throw new Error(getFastApiErrorDetail(payload) || "Не удалось сохранить расчёт.");
  }
}

function isApiNotReadyStatus(status: number): boolean {
  return status === 404 || status === 405 || status === 501;
}

/**
 * Expected backend: DELETE /me/last_calc/{index}
 */
export async function deleteSavedCalculation(index: number): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/me/last_calc/${index}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (isApiNotReadyStatus(response.status)) {
    return false;
  }

  if (response.status === 401) {
    throw new SaveAuthError();
  }

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(getFastApiErrorDetail(payload) || "Не удалось удалить расчёт.");
  }

  return true;
}

/**
 * Expected backend: PUT /me/last_calc/{index} with SavedCalculationEntry body.
 */
export async function updateSavedCalculationAtIndex(
  index: number,
  entry: SavedCalculationEntry,
): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/me/last_calc/${index}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(entry),
  });

  if (isApiNotReadyStatus(response.status)) {
    return false;
  }

  if (response.status === 401) {
    throw new SaveAuthError();
  }

  if (!response.ok) {
    const payload = await parseResponsePayload(response);
    throw new Error(getFastApiErrorDetail(payload) || "Не удалось обновить расчёт.");
  }

  return true;
}

async function replaceThenSave(
  replaceIndex: number,
  save: () => Promise<void>,
): Promise<"replaced" | "saved-new"> {
  const deleted = await deleteSavedCalculation(replaceIndex);
  if (deleted) {
    await save();
    return "saved-new";
  }
  await save();
  return "saved-new";
}

export function shouldPersistToProfile(
  authenticated: boolean,
  options?: PersistCalculationOptions,
): boolean {
  if (!authenticated) return false;
  return options?.persistToProfile !== false;
}

/** Use "omit" when viewing a saved calc so cookies are not sent and the backend does not append history. */
export function getCalculationCredentials(persist: boolean): RequestCredentials {
  return persist ? "include" : "omit";
}

export function getRestoreSessionKey(entry: SavedCalculationEntry, index: number): string {
  return `${entry.type}:${index}:${entry.date}`;
}

const RESTORE_DEBOUNCE_MS = 2500;
const restoredSessionTimestamps = new Map<string, number>();

/** Prevents duplicate restore runs (e.g. React Strict Mode) within a short window. */
export function shouldRunRestoreSession(key: string): boolean {
  const now = Date.now();
  const last = restoredSessionTimestamps.get(key);
  if (last !== undefined && now - last < RESTORE_DEBOUNCE_MS) {
    return false;
  }
  restoredSessionTimestamps.set(key, now);
  return true;
}

export async function saveDerivativeCalculation(
  expr: string,
  options?: PersistCalculationOptions,
): Promise<void> {
  const save = async () => {
    const response = await fetch(`${API_BASE_URL}/calculate/derivative-steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ expr, var: "x" }),
    });
    await assertSaveResponse(response);
  };

  if (options?.replaceIndex !== undefined) {
    await replaceThenSave(options.replaceIndex, save);
    return;
  }

  await save();
}

export async function saveIntegralCalculation(
  expr: string,
  options?: PersistCalculationOptions,
): Promise<void> {
  const save = async () => {
    const response = await fetch(`${API_BASE_URL}/calculate/integrate-steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ expr, var: "x" }),
    });
    await assertSaveResponse(response);
  };

  if (options?.replaceIndex !== undefined) {
    await replaceThenSave(options.replaceIndex, save);
    return;
  }

  await save();
}

export type OrbitalTransferPayload = {
  sat_mass: number;
  inclination_1: number;
  inclination_2: number;
  h1: number;
  h2: number;
  force: number;
  impulse: number;
};

export async function saveOrbitalTransfers(
  payloads: OrbitalTransferPayload[],
  options?: PersistCalculationOptions,
): Promise<void> {
  const saveAll = async () => {
    for (const payload of payloads) {
      const response = await fetch(`${API_BASE_URL}/calculate/orbital-transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      await assertSaveResponse(response);
    }
  };

  if (options?.replaceIndex !== undefined) {
    await replaceThenSave(options.replaceIndex, saveAll);
    return;
  }

  await saveAll();
}

export function orbitalStartDataToForm(start: OrbitalStartData): {
  orbits: { eccentricity: string; h: string }[];
  engine: { sat_mass: string; force: string; impulse: string };
} {
  return {
    orbits: [
      { eccentricity: String(start.i1), h: String(start.h1) },
      { eccentricity: String(start.i2), h: String(start.h2) },
    ],
    engine: {
      sat_mass: start.sat_mass != null ? String(start.sat_mass) : "",
      force: String(start.force),
      impulse: String(start.impulse),
    },
  };
}

export function hasOrbitalStoredResult(
  entry: SavedCalculationEntry,
): entry is SavedCalculationEntry & { start_date: OrbitalStartData; result: OrbitalAnswer } {
  return (
    entry.type === "orbital-transfers" &&
    typeof entry.start_date === "object" &&
    entry.start_date !== null &&
    typeof entry.result === "object" &&
    entry.result !== null
  );
}
