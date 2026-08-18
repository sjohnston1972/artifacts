import { parseGlossary, mergeEntries } from "./parse.js";
import { CATEGORY_CODES, ALIASES, CORE_NAMES } from "./tables.js";

export async function seed(db, markdown) {
  const existing = await db.prepare("SELECT COUNT(*) AS n FROM entries").first();
  if (existing.n > 0) throw new Error("already seeded");

  const parsed = parseGlossary(markdown);
  const { entries, slugCollisions } = mergeEntries(parsed);
  if (slugCollisions.length) {
    throw new Error(`unresolved slug collisions: ${slugCollisions.join(", ")}`);
  }

  // Fail loudly rather than seeding a half-correct catalogue.
  const missingCodes = parsed.categories
    .map((c) => c.name)
    .filter((name) => !CATEGORY_CODES[name]);
  if (missingCodes.length) {
    throw new Error(`no catalogue code for: ${missingCodes.join(", ")}`);
  }

  const byName = new Map(entries.map((e) => [e.name, e]));
  const missingCore = CORE_NAMES.filter((n) => !byName.has(n));
  if (missingCore.length) {
    throw new Error(`core names not found in glossary: ${missingCore.join(", ")}`);
  }

  const now = new Date().toISOString();
  const statements = [];
  const categoryIdBySortOrder = new Map();

  for (const c of parsed.categories) {
    categoryIdBySortOrder.set(c.sortOrder, c.sortOrder);
    statements.push(
      db.prepare(
        "INSERT INTO categories (id, name, slug, code, sort_order) VALUES (?,?,?,?,?)"
      ).bind(c.sortOrder, c.name, slugForCategory(c.name), CATEGORY_CODES[c.name], c.sortOrder)
    );
  }

  const core = new Set(CORE_NAMES);
  entries.forEach((e, i) => {
    const id = i + 1;
    statements.push(
      db.prepare(
        `INSERT INTO entries
         (id, name, slug, aliases, definition, notes, controls_schema, templates, tier, has_example, catalogue_no, updated_at)
         VALUES (?,?,?,?,?,?,'[]','{}',?,0,?,?)`
      ).bind(
        id, e.name, e.slug,
        JSON.stringify(ALIASES[e.name] ?? []),
        e.definition,
        e.notes || null,
        core.has(e.name) ? "core" : "reference",
        e.catalogueNo, now
      )
    );
    for (const sortOrder of e.categories) {
      statements.push(
        db.prepare(
          "INSERT INTO entry_categories (entry_id, category_id, is_primary) VALUES (?,?,?)"
        ).bind(id, categoryIdBySortOrder.get(sortOrder), sortOrder === e.primaryCategory ? 1 : 0)
      );
    }
  });

  await db.batch(statements);
  return { categories: parsed.categories.length, entries: entries.length, core: core.size };
}

function slugForCategory(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
