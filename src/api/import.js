import { requireWrite } from "../auth.js";

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
  if (typeof e.name !== "string" || !e.name.trim()) return `entries[${i}] needs a name`;
  // D1's bind() throws on undefined, so a missing definition would crash the
  // whole batch (and the entries updated before it in the same .batch() call
  // along with it) rather than failing this one row cleanly.
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
  if (e.controls_schema != null && !Array.isArray(e.controls_schema)) {
    return `entries[${i}].controls_schema must be an array`;
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

  // Snapshot everything currently present before replacing it.
  const now = new Date().toISOString();
  const { results: current } = await env.DB.prepare("SELECT id, slug FROM entries").all();
  const snapshots = current.map((row) =>
    env.DB.prepare("INSERT INTO revisions (entry_id, snapshot, changed_at) VALUES (?, (SELECT json_object('slug', slug, 'name', name, 'definition', definition, 'notes', notes, 'aliases', aliases, 'templates', templates, 'controls_schema', controls_schema, 'tier', tier) FROM entries WHERE id = ?), ?)")
      .bind(row.id, row.id, now));
  if (snapshots.length) await env.DB.batch(snapshots);

  const statements = payload.entries.map((e) =>
    env.DB.prepare(
      `UPDATE entries SET name=?, aliases=?, definition=?, notes=?,
         controls_schema=?, templates=?, tier=?, has_example=?, updated_at=?
       WHERE slug=?`
    ).bind(
      e.name, JSON.stringify(e.aliases ?? []), e.definition, e.notes ?? null,
      JSON.stringify(e.controls_schema ?? []), JSON.stringify(e.templates ?? {}),
      e.tier ?? "reference", e.templates?.html?.trim() ? 1 : 0, now, e.slug
    ));
  await env.DB.batch(statements);
  await env.DB.prepare(
    "UPDATE meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key='index_version'"
  ).run();
  return Response.json({ imported: payload.entries.length });
}
