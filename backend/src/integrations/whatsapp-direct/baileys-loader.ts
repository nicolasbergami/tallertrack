/**
 * Baileys ESM loader for a CommonJS backend.
 *
 * Problem: Baileys is "type":"module" (pure ESM). TypeScript compiles
 * dynamic import() to require() in CommonJS mode, which can't load ESM.
 * The previous workaround — new Function('return import("pkg")')() — fails
 * in production because eval'd code has no module-resolution context.
 *
 * Solution: resolve the Baileys entry-point path via createRequire(__filename),
 * convert it to a file:// URL, then import that URL via new Function.
 * Node.js can always import a file:// URL regardless of context.
 */
import { createRequire } from "module";
import { pathToFileURL }  from "url";

export type BaileysModule = typeof import("@whiskeysockets/baileys");

let _cached: BaileysModule | null = null;

export async function loadBaileys(): Promise<BaileysModule> {
  if (_cached) return _cached;

  const _require   = createRequire(__filename);
  const baileysPath = _require.resolve("@whiskeysockets/baileys");
  const baileysUrl  = pathToFileURL(baileysPath).href;

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  _cached = (await (new Function("u", "return import(u)")(baileysUrl))) as BaileysModule;
  return _cached;
}

/** Convenience: bundled version shipped with the installed Baileys package */
export async function getBaileysVersion(): Promise<[number, number, number]> {
  const m = await loadBaileys();
  return (m.DEFAULT_CONNECTION_CONFIG?.version as [number, number, number]) ?? [2, 3000, 1015920];
}
