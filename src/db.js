const ENTRY_COLUMNS = `id, name, slug, aliases, definition, notes,
  controls_schema, templates, tier, has_example, catalogue_no, updated_at`;

function safeParse(value, fallback) {
  if (value == null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function hydrate(row) {
  if (!row) return null;
  return {
    ...row,
    aliases: safeParse(row.aliases, []),
    controls_schema: safeParse(row.controls_schema, []),
    templates: safeParse(row.templates, {}),
  };
}

export async function listCategories(db) {
  const { results } = await db.prepare(
    `SELECT c.id, c.name, c.slug, c.code, c.sort_order,
            -- COUNT(e.id), not COUNT(ec.entry_id): the tier filter lives on the
            -- entries join, so counting join-table rows would still include
            -- soft-deleted entries whose entries-row never matched.
            COUNT(e.id) AS entry_count
     FROM categories c
     LEFT JOIN entry_categories ec ON ec.category_id = c.id AND ec.is_primary = 1
     LEFT JOIN entries e ON e.id = ec.entry_id AND e.tier <> 'deleted'
     GROUP BY c.id
     ORDER BY c.sort_order`
  ).all();
  return results;
}

export async function getEntryBySlug(db, slug) {
  const row = await db.prepare(
    `SELECT ${ENTRY_COLUMNS} FROM entries WHERE slug = ?`
  ).bind(slug).first();
  if (!row) return null;
  const entry = hydrate(row);
  const { results } = await db.prepare(
    `SELECT c.id, c.name, c.slug, c.code, ec.is_primary
     FROM entry_categories ec JOIN categories c ON c.id = ec.category_id
     WHERE ec.entry_id = ? ORDER BY ec.is_primary DESC, c.sort_order`
  ).bind(entry.id).all();
  entry.categories = results;
  return entry;
}

export async function listEntries(db, opts = {}) {
  const { categorySlug, tiers, definitionOnly, q, limit = 100, offset = 0 } = opts;
  const where = ["e.tier <> 'deleted'"];
  const binds = [];

  if (categorySlug) {
    where.push("c.slug = ?");
    binds.push(categorySlug);
  }
  // A search spans every tier: the tier filter is a browsing aid, not a
  // search constraint (spec section 6).
  if (q) {
    // Three positional binds, NOT `?1` repeated. SQLite gives a bare `?` the
    // next free index, so a leading `c.slug = ?` claims index 1 and `?1`
    // silently aliases onto it — leaving 3 parameters for 4 bound values.
    // That crashes the /c/:slug?q=... path specifically.
    where.push("(e.name LIKE ? OR e.aliases LIKE ? OR e.definition LIKE ?)");
    const like = `%${q}%`;
    binds.push(like, like, like);
  } else if (tiers?.length) {
    where.push(`e.tier IN (${tiers.map(() => "?").join(",")})`);
    binds.push(...tiers);
  }
  if (definitionOnly) where.push("e.has_example = 0");

  const sql = `
    SELECT ${ENTRY_COLUMNS.split(",").map((c) => "e." + c.trim()).join(", ")},
           c.name AS category_name, c.slug AS category_slug, c.code AS category_code
    FROM entries e
    JOIN entry_categories ec ON ec.entry_id = e.id AND ec.is_primary = 1
    JOIN categories c ON c.id = ec.category_id
    WHERE ${where.join(" AND ")}
    ORDER BY e.name
    LIMIT ? OFFSET ?`;
  const { results } = await db.prepare(sql).bind(...binds, limit, offset).all();
  return results.map(hydrate);
}

// Export needs every live entry with its full category list, in the same
// shape getEntryBySlug returns (hydrated JSON columns plus a `categories`
// array ordered is_primary DESC). Looping getEntryBySlug per entry would
// issue 2 queries per row — 1,838 round trips for 918 entries, on every
// export AND every nightly cron backup. This does it in exactly two queries
// and assembles the join in JS instead.
export async function exportRows(db) {
  const { results: entryRows } = await db.prepare(
    `SELECT ${ENTRY_COLUMNS} FROM entries WHERE tier <> 'deleted' ORDER BY name`
  ).all();
  const { results: catRows } = await db.prepare(
    `SELECT ec.entry_id AS entry_id, c.id, c.name, c.slug, c.code, ec.is_primary
     FROM entry_categories ec JOIN categories c ON c.id = ec.category_id
     ORDER BY ec.is_primary DESC, c.sort_order`
  ).all();

  const byEntry = new Map();
  for (const row of catRows) {
    if (!byEntry.has(row.entry_id)) byEntry.set(row.entry_id, []);
    byEntry.get(row.entry_id).push({
      id: row.id, name: row.name, slug: row.slug, code: row.code, is_primary: row.is_primary,
    });
  }

  return entryRows.map((row) => {
    const entry = hydrate(row);
    entry.categories = byEntry.get(entry.id) ?? [];
    return entry;
  });
}

export async function searchIndexRows(db) {
  const { results } = await db.prepare(
    `SELECT e.id, e.name, e.slug, e.aliases, e.definition, e.tier, e.has_example,
            c.code AS category_code, c.name AS category_name
     FROM entries e
     JOIN entry_categories ec ON ec.entry_id = e.id AND ec.is_primary = 1
     JOIN categories c ON c.id = ec.category_id
     WHERE e.tier <> 'deleted'
     ORDER BY e.name`
  ).all();
  return results;
}

export async function getIndexVersion(db) {
  const row = await db.prepare("SELECT value FROM meta WHERE key='index_version'").first();
  return row?.value ?? "1";
}

export async function bumpIndexVersion(db) {
  await db.prepare(
    "UPDATE meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key='index_version'"
  ).run();
}

// The ONLY way to write an entry. The revision snapshot happens here, inside
// the same function as the update, so no caller can bypass it.
export async function saveEntry(db, slug, patch) {
  const current = await getEntryBySlug(db, slug);
  if (!current) throw new Error(`no entry with slug ${slug}`);

  await db.prepare(
    "INSERT INTO revisions (entry_id, snapshot, changed_at) VALUES (?,?,?)"
  ).bind(current.id, JSON.stringify(current), new Date().toISOString()).run();

  const next = {
    name: patch.name ?? current.name,
    aliases: patch.aliases ?? current.aliases,
    definition: patch.definition ?? current.definition,
    notes: patch.notes ?? current.notes,
    controls_schema: patch.controls_schema ?? current.controls_schema,
    templates: patch.templates ?? current.templates,
    tier: patch.tier ?? current.tier,
  };
  const hasExample = next.templates?.html?.trim() ? 1 : 0;

  // slug is deliberately absent from the SET clause: URLs must not rot.
  await db.prepare(
    `UPDATE entries SET name=?, aliases=?, definition=?, notes=?,
       controls_schema=?, templates=?, tier=?, has_example=?, updated_at=?
     WHERE id=?`
  ).bind(
    next.name, JSON.stringify(next.aliases), next.definition, next.notes,
    JSON.stringify(next.controls_schema), JSON.stringify(next.templates),
    next.tier, hasExample, new Date().toISOString(), current.id
  ).run();

  await bumpIndexVersion(db);
  return getEntryBySlug(db, slug);
}

export async function createEntry(db, { name, categoryId }) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  let slug = base;
  for (let n = 2; await db.prepare("SELECT 1 FROM entries WHERE slug=?").bind(slug).first(); n++) {
    slug = `${base}-${n}`;
  }
  const row = await db.prepare(
    "SELECT COALESCE(MAX(e.catalogue_no), 0) + 1 AS next FROM entries e JOIN entry_categories ec ON ec.entry_id = e.id AND ec.is_primary = 1 WHERE ec.category_id = ?"
  ).bind(categoryId).first();

  const now = new Date().toISOString();
  const res = await db.prepare(
    `INSERT INTO entries (name, slug, aliases, definition, notes, controls_schema, templates, tier, has_example, catalogue_no, updated_at)
     VALUES (?,?,'[]','','',  '[]','{}','useful',0,?,?)`
  ).bind(name, slug, row.next, now).run();

  await db.prepare(
    "INSERT INTO entry_categories (entry_id, category_id, is_primary) VALUES (?,?,1)"
  ).bind(res.meta.last_row_id, categoryId).run();

  await bumpIndexVersion(db);
  return getEntryBySlug(db, slug);
}

export async function listRevisions(db, entryId) {
  const { results } = await db.prepare(
    "SELECT id, entry_id, snapshot, changed_at FROM revisions WHERE entry_id = ? ORDER BY changed_at DESC, id DESC"
  ).bind(entryId).all();
  return results.map((r) => {
    const snap = JSON.parse(r.snapshot);
    return {
      id: r.id,
      entry_id: r.entry_id,
      changed_at: r.changed_at,
      summary: `${snap.name} — ${String(snap.definition).slice(0, 80)}`,
      snapshot: snap,
    };
  });
}

// A restore is itself a write, so saveEntry snapshots the current state
// first — restores are therefore undoable too.
export async function restoreRevision(db, revisionId) {
  const row = await db.prepare(
    "SELECT entry_id, snapshot FROM revisions WHERE id = ?"
  ).bind(revisionId).first();
  if (!row) throw new Error(`no revision ${revisionId}`);
  const snap = JSON.parse(row.snapshot);
  return saveEntry(db, snap.slug, {
    name: snap.name, aliases: snap.aliases, definition: snap.definition,
    notes: snap.notes, controls_schema: snap.controls_schema,
    templates: snap.templates, tier: snap.tier,
  });
}
