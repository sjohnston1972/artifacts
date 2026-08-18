import { requireWrite } from "../auth.js";
import { importEntries } from "../db.js";
import { validateControlsSchema } from "./controlSchema.js";
import { slugify } from "../seed/parse.js";

const FORMATS = new Set(["html", "tailwind", "react"]);
const TIERS = new Set(["core", "useful", "reference", "deleted"]);

// The same shape rules saveEntryRoute enforces on a single entry, applied to
// every entry in an import batch. Without this, an import payload could
// smuggle an arbitrary template "format" key into the database — one that
// exportEntryHtml later interpolates into `<h2>${format}</h2>` when a
// standalone HTML page is downloaded. That page is opened unsandboxed, so an
// unvalidated format key there is a stored-XSS path, not just bad data.
function validateEntry(e, i) {
  if (typeof e.slug !== "string" || !e.slug) return `entries[${i}] needs a slug`;
  // db.js runs every imported slug through slugify() before writing it, so
  // a slug that is non-empty but ALL symbols (e.g. "???") would otherwise
  // silently normalise to an empty string and produce an unreachable entry.
  if (!slugify(e.slug)) return `entries[${i}] slug "${e.slug}" has no usable characters`;
  if (typeof e.name !== "string" || !e.name.trim()) return `entries[${i}] needs a name`;
  // D1's bind() throws on undefined, so a missing definition would crash the
  // whole batch rather than failing this one row cleanly.
  if (typeof e.definition !== "string") return `entries[${i}] needs a definition string`;
  if (e.tier != null && !TIERS.has(e.tier)) return `entries[${i}] has unknown tier "${e.tier}"`;
  if (e.templates != null) {
    if (typeof e.templates !== "object" || Array.isArray(e.templates)) {
      return `entries[${i}].templates must be a JSON object keyed by format`;
    }
    for (const key of Object.keys(e.templates)) {
      if (!FORMATS.has(key)) return `entries[${i}] has unknown template format "${key}"`;
      if (typeof e.templates[key] !== "string") return `entries[${i}] template "${key}" must be a string`;
    }
  }
  if (e.aliases != null && !Array.isArray(e.aliases)) return `entries[${i}].aliases must be an array`;
  if (e.controls_schema != null) {
    const error = validateControlsSchema(e.controls_schema);
    if (error) return `entries[${i}].controls_schema: ${error}`;
  }
  // categories is optional (an entry can arrive with no membership and get
  // it rebuilt later), but if present it must be well-formed — otherwise
  // db.js's importEntries would either silently skip membership rebuild or,
  // worse, write bogus category_id rows. A category-less entry is also the
  // shape that used to 500 its own page and /api/export.md; the render-side
  // guards in entry.js/export.js handle THAT once the entry is written, but
  // rejecting a malformed (not absent) categories array here is cheaper and
  // clearer than writing garbage and relying on those guards downstream.
  if (e.categories != null) {
    if (!Array.isArray(e.categories)) return `entries[${i}].categories must be an array`;
    for (const c of e.categories) {
      if (!c || typeof c !== "object" || !Number.isInteger(c.id)) {
        return `entries[${i}].categories entries need an integer id`;
      }
    }
  }
  return null;
}

export async function importJson(request, env) {
  const locked = requireWrite(request, env);
  if (locked) return locked;
  let payload;
  try { payload = await request.json(); } catch { return Response.json({ error: "body must be JSON" }, { status: 400 }); }
  if (!Array.isArray(payload.entries) || !Array.isArray(payload.categories)) {
    return Response.json({ error: "payload needs categories and entries arrays" }, { status: 400 });
  }
  for (let i = 0; i < payload.entries.length; i++) {
    const error = validateEntry(payload.entries[i], i);
    if (error) return Response.json({ error }, { status: 400 });
  }

  const result = await importEntries(env.DB, payload);
  return Response.json(result);
}
