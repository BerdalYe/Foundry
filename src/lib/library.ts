"use client";

/**
 * On-device storage for finished sites.
 *
 * IndexedDB rather than localStorage: a single site is 8-30 KB of HTML and a
 * project keeps every version, so a library passes localStorage's ~5 MB ceiling
 * quickly — and localStorage is synchronous, which would stall the UI on a
 * page this size. Nothing here leaves the browser.
 */

const DB_NAME = "foundry";
const STORE = "projects";

export type SavedVersion = {
  id: string;
  title: string;
  prompt: string;
  mode: "create" | "refine";
  model: string;
  html: string;
  createdAt: number;
  partial?: boolean;
};

export type SavedProject = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  activeVersionId: string;
  versions: SavedVersion[];
};

export class LibraryError extends Error {}

export function libraryAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined";
  } catch {
    return false;
  }
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new LibraryError("Storage request failed."));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openAt(version?: number): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request =
      version === undefined
        ? indexedDB.open(DB_NAME)
        : indexedDB.open(DB_NAME, version);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new LibraryError("Could not open storage."));
    request.onblocked = () =>
      reject(
        new LibraryError("Another Foundry tab is upgrading storage. Close it."),
      );
  });
}

/**
 * Opens the database, repairing it if the store is missing.
 *
 * A database can exist at the current version without its object store — an
 * upgrade that was interrupted, or another tool having created the name first.
 * Opening at the same version fires no upgrade event, so every read and write
 * would then fail forever with "object stores was not found". Bumping the
 * version forces the upgrade that creates it.
 */
function openDb(): Promise<IDBDatabase> {
  if (!libraryAvailable()) {
    return Promise.reject(
      new LibraryError(
        "This browser will not let Foundry store anything on the device. Private browsing usually causes this.",
      ),
    );
  }

  dbPromise ??= (async () => {
    // No version: adopt whatever exists rather than fighting a higher one.
    let db = await openAt();
    if (db.objectStoreNames.contains(STORE)) return db;

    const next = db.version + 1;
    db.close();
    db = await openAt(next);

    if (!db.objectStoreNames.contains(STORE)) {
      db.close();
      throw new LibraryError(
        "Foundry's storage could not be repaired. Clearing this site's data in your browser will fix it.",
      );
    }
    return db;
  })();

  // A failed open must not be cached, or every later call fails too.
  return dbPromise.catch((error) => {
    dbPromise = null;
    throw error;
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  const transaction = db.transaction(STORE, mode);
  const result = await run(transaction.objectStore(STORE));
  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () =>
      reject(transaction.error ?? new LibraryError("Storage write failed."));
  });
  return result;
}

/** Newest first — the order the library shows them in. */
export async function listProjects(): Promise<SavedProject[]> {
  const all = await tx("readonly", (store) =>
    promisify(store.getAll() as IDBRequest<SavedProject[]>),
  );
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<SavedProject | null> {
  const found = await tx("readonly", (store) =>
    promisify(store.get(id) as IDBRequest<SavedProject | undefined>),
  );
  return found ?? null;
}

export async function putProject(project: SavedProject): Promise<void> {
  try {
    await tx("readwrite", (store) => promisify(store.put(project)));
  } catch (error) {
    if ((error as DOMException)?.name === "QuotaExceededError") {
      throw new LibraryError(
        "The device is out of storage for Foundry. Delete a saved site and try again.",
      );
    }
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  await tx("readwrite", (store) => promisify(store.delete(id)));
}

export async function renameProject(
  id: string,
  title: string,
): Promise<SavedProject | null> {
  const project = await getProject(id);
  if (!project) return null;
  const updated = { ...project, title: title.trim().slice(0, 80) || "Untitled" };
  await putProject(updated);
  return updated;
}

export function newProjectId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
