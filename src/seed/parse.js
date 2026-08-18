// Pure functions: markdown in, structured data out. No I/O, no D1.

export function slugify(name) {
  return String(name)
    .replace(/`/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SECTION_RE = /^#\s+(\d+)\.\s+(.+?)\s*$/;
const SEPARATOR_RE = /^\|\s*-{3,}\s*\|\s*-{3,}\s*\|\s*$/;
const ROW_RE = /^\|(.+)\|(.+)\|\s*$/;

// A section becomes a category only if it contains a term table. The header
// row is whatever line precedes the |---|---| separator — matching on header
// TEXT would break, because two tables are headed "State" and "Pattern",
// which are also real term names elsewhere in the glossary.
export function parseGlossary(markdown) {
  const lines = markdown.split(/\r?\n/);
  const categories = [];
  let current = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const section = SECTION_RE.exec(line);
    if (section) {
      current = {
        name: section[2],
        sectionNumber: Number(section[1]),
        sortOrder: 0,
        rows: [],
      };
      inTable = false;
      continue;
    }

    if (!current) continue;

    if (SEPARATOR_RE.test(line)) {
      inTable = true;
      continue;
    }

    if (!line.startsWith("|")) {
      inTable = false;
      continue;
    }

    if (!inTable) continue;

    const row = ROW_RE.exec(line);
    if (!row) continue;
    const term = cell(row[1]);
    const definition = cell(row[2]);
    if (!term || !definition) continue;

    if (current.rows.length === 0 && !categories.includes(current)) {
      current.sortOrder = categories.length + 1;
      categories.push(current);
    }
    current.rows.push({ term, definition });
  }

  return { categories };
}

function cell(raw) {
  // A backslash-escaped pipe is how the markdown export protects a pipe
  // inside a cell; unescaping here is what keeps that round trip lossless.
  return raw.trim().replace(/`/g, "").replace(/\\\|/g, "|").trim();
}

// Merges rows sharing a name into one entry. The first occurrence in source
// order wins the definition and the primary category; later ones append to
// notes and add a secondary category.
export function mergeEntries(parsed) {
  const byName = new Map();
  const order = [];

  for (const category of parsed.categories) {
    for (const row of category.rows) {
      const existing = byName.get(row.term);
      if (existing) {
        if (!existing.categories.includes(category.sortOrder)) {
          existing.categories.push(category.sortOrder);
        }
        const note = `**${category.name}:** ${row.definition}`;
        existing.notes = existing.notes ? `${existing.notes}\n\n${note}` : note;
        continue;
      }
      const entry = {
        name: row.term,
        slug: slugify(row.term),
        definition: row.definition,
        notes: "",
        aliases: [],
        primaryCategory: category.sortOrder,
        categories: [category.sortOrder],
        catalogueNo: 0,
      };
      byName.set(row.term, entry);
      order.push(entry);
    }
  }

  const entries = order;
  assignSlugs(entries);
  assignCatalogueNumbers(entries);
  return { categories: parsed.categories, entries };
}

function assignSlugs(entries) {
  const seen = new Map();
  const collisions = [];
  for (const e of entries) {
    const base = e.slug || "entry";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    if (count > 1) {
      e.slug = `${base}-${count}`;
      collisions.push(`${e.name} -> ${e.slug}`);
    } else {
      e.slug = base;
    }
  }
  if (collisions.length) {
    console.warn(`slug collisions resolved: ${collisions.join(", ")}`);
  }
}

function assignCatalogueNumbers(entries) {
  const counters = new Map();
  for (const e of entries) {
    const n = (counters.get(e.primaryCategory) ?? 0) + 1;
    counters.set(e.primaryCategory, n);
    e.catalogueNo = n;
  }
}
