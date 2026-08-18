# UI Element Compendium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build artifacts.clydeford.net — a searchable glossary of 918 UI elements where each entry pairs a definition with a live, tweakable example and copyable code in three formats.

**Architecture:** One Cloudflare Worker renders HTML server-side from D1 and serves `/api/*`. No build pipeline, no framework, no bundler. Five small client-side ES modules ("islands") add the command palette, tweak panel, theme toggle, copy button and edit-form help. The live example is the entry's HTML+CSS template rendered into a sandboxed iframe, so the example and the code tab cannot disagree — they are the same string.

**Tech Stack:** Cloudflare Workers, D1 (SQLite), R2 (backups), Cron Triggers, wrangler 4.x, vanilla ES modules, vitest 4 with `@cloudflare/vitest-pool-workers`, Playwright for acceptance checks.

**Spec:** `docs/superpowers/specs/2026-08-18-ui-element-compendium-design.md` — read it alongside this plan. The source brief it resolves is `artifacts-clydeford-spec.md`.

## Global Constraints

These apply to every task. They are not repeated per-task.

- **No dependencies in the runtime bundle.** `package.json` `dependencies` must stay empty. Everything in `devDependencies` only (wrangler, vitest, playwright). No framework, no CSS library, no templating library, no markdown library.
- **No build step.** Files in `public/` are served as authored. No transpilation, no bundling, no minification.
- **Node 24, wrangler 4.123.0, vitest 4.1.10, @cloudflare/vitest-pool-workers 0.21.3.** These versions are known-compatible (the pool requires vitest `^4.1.0`).
- **British spelling in all user-facing copy** ("Colour", "Customise", "Organisation"), matching the source glossary. Code identifiers stay US-spelled where they mirror CSS or the DOM (`color`, `backgroundColor`).
- **Every write to `entries` creates a revision first.** There must be no code path that updates an entry without snapshotting it. This is enforced by putting both operations inside `saveEntry()`.
- **All CSS transitions and animations live inside `@media (prefers-reduced-motion: no-preference)`.** Never write a bare `transition:` or `animation:` property outside that block.
- **All motion is under 250ms.**
- **The iframe sandbox is exactly `sandbox="allow-scripts"`.** Never add `allow-same-origin` — the combination would let example code reach the parent document.
- **No cookies, no analytics, no third-party requests.** Fonts are self-hosted.
- **Secrets live only in `.env`,** which is gitignored. Never commit a token, never inline one in `wrangler.toml`.
- **Commit and push after every task.** `git push` failing is not a blocker — note it and continue.

## Reference Data (verified against the source glossary)

Any task asserting these numbers can rely on them; they were measured, not estimated.

| Fact | Value |
|---|---|
| Sections in `web-development-ui-glossary-complete.md` | 54 |
| Sections containing a two-column term table | 45 (sections 1-38, 43, 49-54) |
| Sections with no table (skipped) | 9 (sections 39, 40, 41, 42, 44, 45, 46, 47, 48) |
| Term rows across all tables | 1,001 |
| Unique term names after merging | 918 |
| Names appearing in more than one section | 74 (accounting for 83 extra rows) |
| Table separator rows | 45, all exactly `\|---\|---\|` |
| Distinct table header labels | 4: `Term` (42), `Element / Term`, `Pattern`, `State` |
| Rows whose term is backticked | 32 (all in section 2) |
| Rows containing a slash | 8, none of them synonym pairs |
| Core-tier names in the brief | 61, of which 59 match a term exactly |

---

## File Structure

**Worker (`src/`)**
- `worker.js` — `fetch` and `scheduled` handlers; wires router to handlers. Nothing else.
- `router.js` — path pattern matching. No knowledge of the domain.
- `db.js` — every D1 query. One exported function per operation. The only file containing SQL.
- `auth.js` — `requireWrite()`, the single seam for a future edit key.
- `seed/parse.js` — pure markdown → structured data. No D1, no I/O, so it is trivially testable.
- `seed/tables.js` — the hand-maintained data: 45 category codes, the alias map, the core-tier name list.
- `seed/run.js` — writes parsed data into D1.
- `render/layout.js` — HTML shell, `<head>`, the inline anti-flash theme script.
- `render/components.js` — shared fragments: specimen plate, entry card, tier badge, catalogue reference.
- `render/browse.js`, `render/entry.js`, `render/edit.js`, `render/history.js` — one page each.
- `api/index.js` — search index JSON.
- `api/export.js`, `api/import.js` — export formats and JSON import.
- `api/entries.js` — write routes.

**Client (`public/`)**
- `css/tokens.css` — palette, type scale, spacing, light/dark. Custom properties only, no rules.
- `css/app.css` — every actual rule.
- `js/template.js` — the placeholder engine. **Lives here, not in `src/`**: the browser fetches it as a static asset and the Worker imports the very same file, so there is exactly one copy and no build step or raw-import trick is needed.
- `js/generate.js` — turns templates plus values into the iframe document and the code tabs.
- `js/theme.js`, `js/palette.js`, `js/copy.js`, `js/tweak.js`, `js/edit.js` — the five islands.
- `fonts/` — self-hosted woff2 subsets.

**Content**
- `examples/*.json` — the 10 authored core examples, loadable by the seeder so they survive a rebuild.

Files split by responsibility rather than by layer: a page's renderer sits next to the other renderers, but its data access goes through `db.js` and its markup helpers through `render/components.js`, so no page file needs to know SQL or HTML-escaping rules.

---

## Task 1: Project scaffold and a deployable Worker

**Files:**
- Create: `package.json`, `wrangler.toml`, `vitest.config.js`, `src/worker.js`, `src/router.js`
- Test: `tests/router.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `route(routes, method, pathname)` → `{handler, params}` or `null`, where `routes` is an array of `{method, pattern, handler}` and `pattern` is a string like `/e/:slug`. Every later task registers routes through this.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "ui-element-compendium",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "test": "vitest run",
    "test:watch": "vitest",
    "deploy": "wrangler deploy",
    "db:local": "wrangler d1 execute compendium --local --file=schema.sql",
    "db:remote": "wrangler d1 execute compendium --remote --file=schema.sql"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "0.21.3",
    "vitest": "4.1.10",
    "wrangler": "4.123.0"
  }
}
```

Run `npm install`.

- [ ] **Step 2: Create `wrangler.toml`**

Leave `database_id` as the empty string for now; Task 2 fills it in after creating the database.

```toml
name = "ui-element-compendium"
main = "src/worker.js"
compatibility_date = "2026-08-01"
compatibility_flags = ["nodejs_compat"]

assets = { directory = "public", binding = "ASSETS" }

[[d1_databases]]
binding = "DB"
database_name = "compendium"
database_id = ""

[observability]
enabled = true
```

- [ ] **Step 3: Create `vitest.config.js`**

`@cloudflare/vitest-pool-workers` 0.21.3 has **no `./config` subpath** — the old `defineWorkersConfig` helper was removed when Vitest 4 support landed, and replaced by a `cloudflareTest()` Vite plugin. Confirmed against the installed package's `exports` map; the package also ships a `vitest-v3-to-v4` codemod that rewrites to this shape.

```js
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: { compatibilityDate: "2026-08-01" },
    }),
  ],
});
```

Note for later tasks: `@cloudflare/vitest-pool-workers` isolates storage per test file and rolls back each individual test's writes, while writes made in `beforeAll` persist for the whole file. Every test file below therefore seeds once in `beforeAll` and may mutate freely inside a test without affecting its neighbours.

- [ ] **Step 4: Write the failing router test**

Create `tests/router.test.js`:

```js
import { describe, it, expect } from "vitest";
import { route } from "../src/router.js";

const routes = [
  { method: "GET", pattern: "/", handler: "browse" },
  { method: "GET", pattern: "/e/:slug", handler: "entry" },
  { method: "GET", pattern: "/e/:slug/history", handler: "history" },
  { method: "POST", pattern: "/api/entries/:slug", handler: "save" },
];

describe("route", () => {
  it("matches a static path", () => {
    expect(route(routes, "GET", "/")).toEqual({ handler: "browse", params: {} });
  });

  it("extracts a named parameter", () => {
    expect(route(routes, "GET", "/e/toast")).toEqual({
      handler: "entry",
      params: { slug: "toast" },
    });
  });

  it("prefers the longer pattern over the shorter prefix", () => {
    expect(route(routes, "GET", "/e/toast/history").handler).toBe("history");
  });

  it("distinguishes methods on the same path", () => {
    expect(route(routes, "GET", "/api/entries/toast")).toBeNull();
    expect(route(routes, "POST", "/api/entries/toast").handler).toBe("save");
  });

  it("returns null for an unknown path", () => {
    expect(route(routes, "GET", "/nope")).toBeNull();
  });

  it("decodes percent-encoded parameters", () => {
    expect(route(routes, "GET", "/e/data%20grid").params.slug).toBe("data grid");
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run tests/router.test.js`
Expected: FAIL — cannot resolve `../src/router.js`.

- [ ] **Step 6: Implement `src/router.js`**

```js
// Matches a request against a route table. Patterns are literal path
// segments plus `:name` captures. No regex in callers, no dependencies.
export function route(routes, method, pathname) {
  const parts = split(pathname);
  for (const r of routes) {
    if (r.method !== method) continue;
    const pattern = split(r.pattern);
    if (pattern.length !== parts.length) continue;
    const params = {};
    let matched = true;
    for (let i = 0; i < pattern.length; i++) {
      const seg = pattern[i];
      if (seg.startsWith(":")) {
        params[seg.slice(1)] = safeDecode(parts[i]);
      } else if (seg !== parts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: r.handler, params };
  }
  return null;
}

function split(path) {
  return path.split("/").filter((s) => s.length > 0);
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/router.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 8: Implement `src/worker.js`**

```js
import { route } from "./router.js";

const routes = [
  { method: "GET", pattern: "/healthz", handler: healthz },
];

async function healthz() {
  return new Response("ok", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const match = route(routes, request.method, url.pathname);
    if (!match) return env.ASSETS.fetch(request);
    try {
      return await match.handler(request, env, ctx, match.params);
    } catch (err) {
      console.error(err);
      return new Response("Internal error", { status: 500 });
    }
  },
};
```

- [ ] **Step 9: Verify the Worker parses**

`wrangler dev` cannot start yet: `wrangler.toml` carries an empty `database_id`, which wrangler rejects as falsy. Task 2 creates the database and fills it in, and Task 2 step 6 is where the dev server is first booted.

Run: `node --check src/worker.js && node --check src/router.js`
Expected: no output, exit 0. The vitest run in step 7 is this task's load-bearing verification.

- [ ] **Step 10: Commit and push**

```bash
git add package.json package-lock.json wrangler.toml vitest.config.js src/ tests/
git commit -m "feat: worker scaffold with dependency-free router"
git remote add origin https://github.com/sjohnston1972/artifacts.git
git push -u origin master
```

---

## Task 2: Database schema

**Files:**
- Create: `schema.sql`
- Modify: `wrangler.toml` (fill in `database_id`)
- Test: `tests/schema.test.js`

**Interfaces:**
- Consumes: `wrangler.toml` from Task 1.
- Produces: the four tables described in spec section 2.1. Later tasks assume these exact column names.

- [ ] **Step 1: Create the D1 database**

```bash
npx wrangler d1 create compendium
```

Copy the printed `database_id` into `wrangler.toml`.

- [ ] **Step 2: Create `schema.sql`**

Copy the SQL verbatim from spec section 2.1 (four `CREATE TABLE` statements and four `CREATE INDEX` statements). Add at the top:

```sql
PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS revisions;
DROP TABLE IF EXISTS entry_categories;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS meta;
```

All five tables are dropped, `meta` included. Omitting it makes the second
`npm run db:local` fail with `table meta already exists`, which defeats the
point of the drops.

Add at the end a one-row settings table used by Task 8 to invalidate the search index cache:

```sql
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO meta (key, value) VALUES ('index_version', '1');
```

Add a test that re-applying the schema is safe, since that is the property
the drops exist to provide:

```js
  it("can be applied twice without error", async () => {
    await applySchema(env.DB);
    await applySchema(env.DB);
    const row = await env.DB.prepare("SELECT value FROM meta WHERE key='index_version'").first();
    expect(row.value).toBe("1");
  });
```

- [ ] **Step 3: Write the failing schema test**

Create `tests/schema.test.js`:

```js
import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";

beforeAll(async () => { await applySchema(env.DB); });

describe("schema", () => {
  it("creates all five tables", async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();
    const names = results.map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining(["categories", "entries", "entry_categories", "meta", "revisions"])
    );
  });

  it("rejects an invalid tier", async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO entries (name, slug, definition, tier, catalogue_no, updated_at) VALUES (?,?,?,?,?,?)"
      ).bind("X", "x", "d", "bogus", 1, "2026-08-18").run()
    ).rejects.toThrow();
  });

  it("enforces unique slugs", async () => {
    const ins = (slug) => env.DB.prepare(
      "INSERT INTO entries (name, slug, definition, catalogue_no, updated_at) VALUES (?,?,?,?,?)"
    ).bind("Dup", slug, "d", 1, "2026-08-18").run();
    await ins("dup-slug");
    await expect(ins("dup-slug")).rejects.toThrow();
  });

  it("seeds index_version", async () => {
    const row = await env.DB.prepare("SELECT value FROM meta WHERE key='index_version'").first();
    expect(row.value).toBe("1");
  });
});
```

- [ ] **Step 4: Write the test helper**

Create `tests/helpers/db.js`. It reads `schema.sql` and runs each statement, because D1's `exec` does not reliably handle a multi-statement file with comments.

```js
import schema from "../../schema.sql?raw";

export async function applySchema(db) {
  const statements = schema
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const s of statements) {
    await db.prepare(s).run();
  }
}
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run tests/schema.test.js`
Expected: FAIL — `schema.sql` missing or tables absent.

- [ ] **Step 6: Apply the schema locally, re-run, and boot the Worker**

Run: `npm run db:local && npx vitest run tests/schema.test.js`
Expected: PASS, 5 tests.

Now that `database_id` is populated, the dev server can start for the first time. Run `npx wrangler dev --port 8787` in one shell, then `curl -s http://127.0.0.1:8787/healthz`
Expected: `ok`. Stop the dev server.

- [ ] **Step 7: Commit and push**

```bash
git add schema.sql wrangler.toml tests/
git commit -m "feat: D1 schema with revisions and category join table"
git push
```

---

## Task 3: Glossary parser

This is the highest-risk task in the plan: everything downstream depends on the seed being faithful. It is pure functions over a string, with no D1 involvement, so it can be tested exhaustively.

**Files:**
- Create: `src/seed/parse.js`
- Test: `tests/parse.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `slugify(name: string) → string`
  - `parseGlossary(markdown: string) → { categories: Category[] }` where
    `Category = { name: string, sortOrder: number, sectionNumber: number, rows: { term: string, definition: string }[] }`
  - `mergeEntries(parsed) → { categories: Category[], entries: Entry[] }` where
    `Entry = { name, slug, definition, notes, aliases: string[], primaryCategory: number, categories: number[], catalogueNo: number }`
    and `primaryCategory` / `categories` hold `sortOrder` values. It also
    returns `slugCollisions: string[]`, which must come back empty.

- [ ] **Step 1: Write the failing parser tests**

Create `tests/parse.test.js`. These assert against the real glossary file, not a fixture, so a change to the source is caught immediately.

```js
import { describe, it, expect } from "vitest";
import { parseGlossary, mergeEntries, slugify } from "../src/seed/parse.js";
import source from "../web-development-ui-glossary-complete.md?raw";

const parsed = parseGlossary(source);
const merged = mergeEntries(parsed);

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Toggle Button")).toBe("toggle-button");
  });
  it("strips backticks from semantic HTML terms", () => {
    expect(slugify("`html`")).toBe("html");
  });
  it("collapses runs of punctuation to one hyphen", () => {
    expect(slugify("Master/Detail")).toBe("master-detail");
    expect(slugify("Internationalisation (i18n)")).toBe("internationalisation-i18n");
  });
  it("trims leading and trailing hyphens", () => {
    expect(slugify("  Tab Bar  ")).toBe("tab-bar");
  });
});

describe("parseGlossary", () => {
  it("finds exactly the 45 sections that contain a term table", () => {
    expect(parsed.categories).toHaveLength(45);
  });

  it("skips the nine guidance sections", () => {
    const numbers = parsed.categories.map((c) => c.sectionNumber);
    for (const skipped of [39, 40, 41, 42, 44, 45, 46, 47, 48]) {
      expect(numbers).not.toContain(skipped);
    }
  });

  it("keeps source order", () => {
    expect(parsed.categories[0].name).toBe("UI Fundamentals");
    expect(parsed.categories[3].name).toBe("Navigation");
    expect(parsed.categories.at(-1).name).toBe("Internationalisation & Localisation");
  });

  it("reads 1,001 term rows in total", () => {
    const total = parsed.categories.reduce((n, c) => n + c.rows.length, 0);
    expect(total).toBe(1001);
  });

  it("treats the row before the separator as a header, whatever it is called", () => {
    // Section 30 is headed `| State | Definition |` and section 38 `| Pattern | Definition |`.
    // Neither header may appear as a term, but both words ARE real terms elsewhere.
    const states = parsed.categories.find((c) => c.name === "Interaction States");
    expect(states.rows.find((r) => r.definition === "Definition")).toBeUndefined();
    const allTerms = parsed.categories.flatMap((c) => c.rows.map((r) => r.term));
    expect(allTerms).toContain("State");
    expect(allTerms).toContain("Pattern");
  });

  it("strips backticks from term names", () => {
    const semantic = parsed.categories.find((c) => c.name === "Semantic HTML Elements");
    expect(semantic.rows.map((r) => r.term)).toContain("html");
    expect(semantic.rows.every((r) => !r.term.includes("`"))).toBe(true);
  });

  it("never splits a term on a slash", () => {
    const allTerms = parsed.categories.flatMap((c) => c.rows.map((r) => r.term));
    expect(allTerms).toContain("Master/Detail");
    expect(allTerms).toContain("Min/Max Width");
    expect(allTerms).not.toContain("Detail");
    expect(allTerms).not.toContain("Max Width");
  });
});

describe("mergeEntries", () => {
  it("produces 918 unique entries from 1,001 rows", () => {
    expect(merged.entries).toHaveLength(918);
  });

  it("gives every entry a unique slug", () => {
    const slugs = merged.entries.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("merges the four senses of State into one entry", () => {
    const state = merged.entries.find((e) => e.name === "State");
    expect(state.categories).toHaveLength(4);
    expect(state.categories).toContain(state.primaryCategory);
    // The first occurrence (Workflow UI) supplies the definition; the other
    // three go to notes.
    expect(state.definition).toBe("Current workflow condition.");
    expect(state.notes).toContain("**Design System Terminology:**");
    expect(state.notes).toContain("**Component Architecture:**");
    expect(state.notes).toContain("**Application State Terminology:**");
    expect(state.notes.match(/\*\*/g)).toHaveLength(6);
    // The "State" row in the Interaction States table is that table's HEADER.
    // If header detection regresses to matching on text, that row becomes a
    // fifth category here — so this negative assertion is the real test.
    expect(state.notes).not.toContain("**Interaction States:**");
  });

  it("marks exactly one primary category per entry", () => {
    for (const e of merged.entries) {
      expect(e.categories).toContain(e.primaryCategory);
    }
  });

  it("numbers entries from 1 within each primary category", () => {
    const nav = merged.entries.filter((e) => e.primaryCategory === 4);
    const numbers = nav.map((e) => e.catalogueNo).sort((a, b) => a - b);
    expect(numbers[0]).toBe(1);
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it("gives the UI components the clean slugs, not the HTML tags", () => {
    // Source order alone would hand /e/button to the <button> tag from
    // section 2 and bury the core-tier Button component at /e/button-2.
    const bySlug = (s) => merged.entries.find((e) => e.slug === s);
    expect(bySlug("button").name).toBe("Button");
    expect(bySlug("select").name).toBe("Select");
    expect(bySlug("textarea").name).toBe("Textarea");
    expect(bySlug("dialog").name).toBe("Dialog");
    expect(bySlug("button-element").name).toBe("button");
    expect(bySlug("select-element").name).toBe("select");
  });

  it("needs no numeric suffix to make slugs unique", () => {
    expect(merged.slugCollisions).toEqual([]);
    expect(merged.entries.filter((e) => /-\d+$/.test(e.slug))).toEqual([]);
  });

  it("preserves the definition of the first occurrence", () => {
    const pattern = merged.entries.find((e) => e.name === "Pattern");
    expect(pattern.definition).toBe(
      "Reusable solution to a recurring interaction or layout problem."
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/parse.test.js`
Expected: FAIL — cannot resolve `../src/seed/parse.js`.

- [ ] **Step 3: Implement `src/seed/parse.js`**

```js
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
        slug: baseSlug(row.term, category),
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
  const slugCollisions = assignSlugs(entries);
  assignCatalogueNumbers(entries);
  return { categories: parsed.categories, entries, slugCollisions };
}

const HTML_ELEMENT_CATEGORY = "Semantic HTML Elements";

// Section 2 lists raw HTML tags whose names collide with the UI components
// that are this catalogue's actual subjects: <button> vs Button, <select> vs
// Select, <dialog> vs Dialog, <textarea> vs Textarea. Source order would hand
// the clean slug to the tag, burying the core-tier component at /e/button-2.
// The components win the clean slug; the tags are namespaced instead.
function baseSlug(term, category) {
  const base = slugify(term);
  return category.name === HTML_ELEMENT_CATEGORY ? `${base}-element` : base;
}

// Returns the collisions rather than logging them: this module must stay
// pure, and the seeder is the layer that decides what to do about them.
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
  return collisions;
}

function assignCatalogueNumbers(entries) {
  const counters = new Map();
  for (const e of entries) {
    const n = (counters.get(e.primaryCategory) ?? 0) + 1;
    counters.set(e.primaryCategory, n);
    e.catalogueNo = n;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/parse.test.js`
Expected: PASS, 19 tests. If the 1,001 or 918 counts are off, the parser is wrong — do not adjust the expected numbers, they were measured from the source.

- [ ] **Step 5: Commit and push**

```bash
git add src/seed/parse.js tests/parse.test.js
git commit -m "feat: glossary parser producing 45 categories and 918 merged entries"
git push
```

---

## Task 4: Seed reference tables and the seed runner

**Files:**
- Create: `src/seed/tables.js`, `src/seed/run.js`
- Test: `tests/seed.test.js`

**Interfaces:**
- Consumes: `parseGlossary`, `mergeEntries`, `slugify` from Task 3; the schema from Task 2.
- Produces:
  - `CATEGORY_CODES: Record<string, string>` — category name → 3-letter code, 45 entries.
  - `ALIASES: Record<string, string[]>` — entry name → alias list.
  - `CORE_NAMES: string[]` — 61 names, already remapped.
  - `seed(db, markdown) → { categories: number, entries: number, core: number }`

- [ ] **Step 1: Create `src/seed/tables.js`**

Codes must be unique and stable. Assign one per category in source order:

```js
// Category name -> catalogue code. Hand-assigned so references like NAV-014
// never shift when categories are reordered. All 45 must be unique.
export const CATEGORY_CODES = {
  "UI Fundamentals": "UIF",
  "Semantic HTML Elements": "SEM",
  "Page & Layout": "LAY",
  "Navigation": "NAV",
  "Buttons & Actions": "BTN",
  "Forms": "FRM",
  "Selection Controls": "SEL",
  "Feedback & Status": "FBK",
  "Overlays & Temporary UI": "OVL",
  "Data Display": "DAT",
  "Advanced Data Grid": "GRD",
  "Search, Filter & Query UI": "SRC",
  "Charts & Data Visualisation": "CHT",
  "Dashboard UI": "DSH",
  "Cards": "CRD",
  "Lists": "LST",
  "Project Management & Kanban": "KAN",
  "Workflow UI": "WFL",
  "Calendar & Scheduling": "CAL",
  "People, Teams & Organisations": "PPL",
  "Enterprise Application UI": "ENT",
  "Collaboration UI": "CLB",
  "Files & Documents": "FIL",
  "Notifications": "NTF",
  "Authentication & Security UI": "AUT",
  "Responsive & Mobile UI": "RSP",
  "Interaction Patterns": "INT",
  "Loading & Asynchronous States": "LOD",
  "Accessibility": "A11",
  "Interaction States": "STA",
  "Design System Terminology": "DSY",
  "Visual Design": "VIS",
  "CSS & Layout Vocabulary": "CSS",
  "Component Architecture": "ARC",
  "Application State Terminology": "APP",
  "AI & Agent UI": "AIU",
  "Performance & Rendering Concepts": "PRF",
  "Common Application Patterns": "PAT",
  "UI Anti-Patterns": "ANT",
  "Marketing & Content Site Patterns": "MKT",
  "Media & Rich Content": "MED",
  "Content Editing & Authoring": "EDT",
  "Onboarding & Help": "HLP",
  "Motion & Animation": "MOT",
  "Internationalisation & Localisation": "I18",
};

// Hand-curated. The source has no "Name / Synonym" rows, so aliases cannot
// be derived — see spec section 3.1 rule 5.
export const ALIASES = {
  "Switch": ["Toggle", "Toggle Switch"],
  "Text Input": ["Textbox", "Text Field"],
  "Combobox": ["Autocomplete", "Typeahead"],
  "Modal": ["Modal Dialog"],
  "Drawer": ["Off-canvas Panel", "Side Sheet"],
  "Toast": ["Snackbar", "Flash Message"],
  "Spinner": ["Loader", "Loading Indicator"],
  "Skeleton": ["Skeleton Screen", "Shimmer"],
  "Tab Bar": ["Tabs", "Tab Set"],
  "Topbar": ["Navbar", "Header Bar", "App Bar"],
  "Sidebar": ["Side Navigation", "Nav Rail"],
  "Breadcrumb": ["Breadcrumbs"],
  "Dropdown Menu": ["Menu", "Popup Menu"],
  "Context Menu": ["Right-click Menu"],
  "Command Palette": ["Quick Open", "Omnibox"],
  "Data Grid": ["Datagrid", "Advanced Table"],
  "Chip": ["Pill"],
  "Badge": ["Counter Badge", "Status Badge"],
  "Avatar": ["Profile Picture", "User Image"],
  "Empty State": ["Blank Slate", "Zero State"],
  "Accordion": ["Disclosure Group"],
  "Popover": ["Flyout"],
  "Tooltip": ["Hint"],
  "Carousel": ["Slider", "Slideshow"],
  "Lightbox": ["Image Viewer"],
  "Progress Bar": ["Progress Indicator"],
  "File Upload": ["File Picker", "Dropzone"],
  "Date Picker": ["Calendar Picker"],
  "Validation Message": ["Error Message", "Field Error"],
  "Kanban Board": ["Board View"],
};

// Spec section 9's curated list, with the two names that do not exist in the
// source remapped: "Tabs" -> "Tab Bar", "Chart" -> "Bar Chart".
export const CORE_NAMES = [
  "Button", "Icon Button", "Button Group", "Text Input", "Textarea", "Select",
  "Combobox", "Checkbox", "Radio Group", "Switch", "Slider", "Date Picker",
  "File Upload", "Form Group", "Validation Message", "Card", "Badge", "Chip",
  "Tag", "Avatar", "Alert", "Banner", "Toast", "Progress Bar", "Spinner",
  "Skeleton", "Empty State", "Modal", "Dialog", "Drawer", "Popover", "Tooltip",
  "Dropdown Menu", "Context Menu", "Command Palette", "Tab Bar", "Breadcrumb",
  "Pagination", "Sidebar", "Topbar", "Table", "Data Grid", "List", "Accordion",
  "Kanban Board", "Timeline", "KPI Card", "Bar Chart", "Hero Section",
  "Pricing Table", "Testimonial", "FAQ Accordion", "Feature Grid",
  "Newsletter Signup", "Contact Section", "Cookie Consent Banner", "Carousel",
  "Image Gallery", "Lightbox", "Video Player", "Map Embed",
];
```

- [ ] **Step 2: Write the failing seed tests**

Create `tests/seed.test.js`:

```js
import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import { CATEGORY_CODES, CORE_NAMES } from "../src/seed/tables.js";
import source from "../web-development-ui-glossary-complete.md?raw";

let result;
beforeAll(async () => {
  await applySchema(env.DB);
  result = await seed(env.DB, source);
});

describe("category codes table", () => {
  it("has one code per category", () => {
    expect(Object.keys(CATEGORY_CODES)).toHaveLength(45);
  });
  it("has no duplicate codes", () => {
    const codes = Object.values(CATEGORY_CODES);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("seed", () => {
  it("inserts 45 categories and 918 entries", () => {
    expect(result).toMatchObject({ categories: 45, entries: 918 });
  });

  it("marks every core name as core tier", async () => {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM entries WHERE tier='core'"
    ).first();
    expect(row.n).toBe(CORE_NAMES.length);
  });

  it("resolves every core name to exactly one entry", async () => {
    for (const name of CORE_NAMES) {
      const row = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM entries WHERE name = ?"
      ).bind(name).first();
      expect({ name, n: row.n }).toEqual({ name, n: 1 });
    }
  });

  it("starts every entry as definition-only", async () => {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM entries WHERE has_example = 1"
    ).first();
    expect(row.n).toBe(0);
  });

  it("gives every entry exactly one primary category", async () => {
    const { results } = await env.DB.prepare(
      "SELECT entry_id, SUM(is_primary) AS p FROM entry_categories GROUP BY entry_id HAVING p <> 1"
    ).all();
    expect(results).toEqual([]);
  });

  it("records secondary categories for merged terms", async () => {
    // State is defined in four sections: Workflow UI (primary), Design System
    // Terminology, Component Architecture, Application State Terminology. The
    // "State" row in the Interaction States table is that table's HEADER and
    // must not produce a fifth row here.
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM entry_categories ec JOIN entries e ON e.id = ec.entry_id WHERE e.name = 'State'"
    ).first();
    expect(row.n).toBe(4);
  });

  it("gives core components the clean slug, not the HTML tag", async () => {
    const button = await env.DB.prepare(
      "SELECT name, tier FROM entries WHERE slug = 'button'"
    ).first();
    expect(button).toEqual({ name: "Button", tier: "core" });
    const tag = await env.DB.prepare(
      "SELECT name FROM entries WHERE slug = 'button-element'"
    ).first();
    expect(tag.name).toBe("button");
  });

  it("applies curated aliases", async () => {
    const row = await env.DB.prepare(
      "SELECT aliases FROM entries WHERE name = 'Switch'"
    ).first();
    expect(JSON.parse(row.aliases)).toContain("Toggle");
  });

  it("refuses to run twice", async () => {
    await expect(seed(env.DB, source)).rejects.toThrow(/already seeded/i);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/seed.test.js`
Expected: FAIL — cannot resolve `../src/seed/run.js`.

- [ ] **Step 4: Implement `src/seed/run.js`**

```js
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/seed.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 6: Seed the local database**

Add to `src/worker.js` a guarded route (it throws if already seeded, so it is safe to leave in place):

```js
{ method: "POST", pattern: "/api/seed", handler: seedRoute },
```

The markdown arrives in the request body rather than being bundled into the Worker. That keeps a 66KB file out of the deployed bundle and avoids needing a wrangler `Text` rule — which would also have to work under vitest, where the Worker is loaded through vite.

```js
import { seed } from "./seed/run.js";

async function seedRoute(request, env) {
  const markdown = await request.text();
  if (!markdown.trim()) {
    return Response.json({ error: "POST the glossary markdown as the body" }, { status: 400 });
  }
  const result = await seed(env.DB, markdown);
  return Response.json(result);
}
```

Task 14 extends this handler to load the authored examples too, so its final
response shape is `{categories, entries, core, examples}`:

```js
async function seedRoute(request, env) {
  const markdown = await request.text();
  const result = await seed(env.DB, markdown);
  result.examples = await loadExamples(env.DB);
  return Response.json(result);
}
```

Run: `npx wrangler dev` then
`curl -s -X POST --data-binary @web-development-ui-glossary-complete.md http://127.0.0.1:8787/api/seed`
Expected: `{"categories":45,"entries":918,"core":61}`

- [ ] **Step 7: Commit and push**

```bash
git add src/seed/ src/worker.js wrangler.toml tests/seed.test.js
git commit -m "feat: seed 918 entries and 45 categories from the glossary"
git push
```

---

## Task 5: Data access layer

**Files:**
- Create: `src/db.js`
- Test: `tests/db.test.js`

**Interfaces:**
- Consumes: the schema from Task 2; seeded data from Task 4.
- Produces (every later task uses these and no raw SQL):
  - `listCategories(db) → {id, name, slug, code, sort_order, entry_count}[]`
  - `getEntryBySlug(db, slug) → Entry | null`, where `Entry` has parsed `aliases`, `controls_schema`, `templates`, plus `categories: {id,name,slug,code,is_primary}[]`
  - `listEntries(db, {categorySlug, tiers, definitionOnly, q, limit, offset}) → Entry[]` (summary shape: id, name, slug, tier, has_example, definition, category)
  - `searchIndexRows(db) → array rows for the JSON index`
  - `createEntry(db, {name, categoryId}) → Entry`
  - `saveEntry(db, slug, patch) → Entry` — snapshots first, always
  - `listRevisions(db, entryId) → {id, changed_at, summary}[]`
  - `restoreRevision(db, revisionId) → Entry`
  - `bumpIndexVersion(db) → void`
  - `getIndexVersion(db) → string`

- [ ] **Step 1: Write the failing db tests**

Create `tests/db.test.js`:

```js
import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import * as db from "../src/db.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

describe("listCategories", () => {
  it("returns 45 categories in sort order with counts", async () => {
    const cats = await db.listCategories(env.DB);
    expect(cats).toHaveLength(45);
    expect(cats[0].name).toBe("UI Fundamentals");
    expect(cats[0].entry_count).toBeGreaterThan(0);
  });
});

describe("getEntryBySlug", () => {
  it("parses JSON columns", async () => {
    const e = await db.getEntryBySlug(env.DB, "switch");
    expect(Array.isArray(e.aliases)).toBe(true);
    expect(Array.isArray(e.controls_schema)).toBe(true);
    expect(typeof e.templates).toBe("object");
  });
  it("includes categories with the primary flagged", async () => {
    const e = await db.getEntryBySlug(env.DB, "state");
    // State is defined in four sections. The "State" row in the Interaction
    // States table is that table's HEADER and yields no entry, so there is no
    // fifth category here.
    expect(e.categories.map((c) => c.name)).toEqual([
      "Workflow UI",
      "Design System Terminology",
      "Component Architecture",
      "Application State Terminology",
    ]);
    expect(e.categories.filter((c) => c.is_primary)).toHaveLength(1);
    expect(e.categories[0].name).toBe("Workflow UI");
  });
  it("returns null for an unknown slug", async () => {
    expect(await db.getEntryBySlug(env.DB, "no-such-thing")).toBeNull();
  });
});

describe("listEntries", () => {
  it("filters by tier", async () => {
    const rows = await db.listEntries(env.DB, { tiers: ["core"], limit: 500 });
    expect(rows).toHaveLength(61);
  });
  it("filters by category", async () => {
    const rows = await db.listEntries(env.DB, { categorySlug: "navigation", limit: 500 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.name.length > 0)).toBe(true);
  });
  it("searches name, alias and definition regardless of tier", async () => {
    const rows = await db.listEntries(env.DB, { q: "toast", tiers: ["core"], limit: 50 });
    expect(rows.some((r) => r.name === "Toast")).toBe(true);
    const byAlias = await db.listEntries(env.DB, { q: "snackbar", limit: 50 });
    expect(byAlias.some((r) => r.name === "Toast")).toBe(true);
  });
  it("filters to definition-only entries", async () => {
    const rows = await db.listEntries(env.DB, { definitionOnly: true, limit: 5 });
    expect(rows.every((r) => r.has_example === 0)).toBe(true);
  });
});

describe("saveEntry", () => {
  it("creates a revision before writing", async () => {
    const before = await db.getEntryBySlug(env.DB, "button");
    await db.saveEntry(env.DB, "button", { definition: "Changed definition." });
    const revs = await db.listRevisions(env.DB, before.id);
    expect(revs).toHaveLength(1);
    const after = await db.getEntryBySlug(env.DB, "button");
    expect(after.definition).toBe("Changed definition.");
  });

  it("recomputes has_example from templates.html", async () => {
    await db.saveEntry(env.DB, "button", { templates: { html: "<button>Hi</button>" } });
    expect((await db.getEntryBySlug(env.DB, "button")).has_example).toBe(1);
    await db.saveEntry(env.DB, "button", { templates: {} });
    expect((await db.getEntryBySlug(env.DB, "button")).has_example).toBe(0);
  });

  it("never changes the slug, even on rename", async () => {
    await db.saveEntry(env.DB, "button", { name: "Push Button" });
    const e = await db.getEntryBySlug(env.DB, "button");
    expect(e.name).toBe("Push Button");
    expect(e.slug).toBe("button");
  });

  it("bumps the index version", async () => {
    const before = await db.getIndexVersion(env.DB);
    await db.saveEntry(env.DB, "button", { notes: "note" });
    expect(await db.getIndexVersion(env.DB)).not.toBe(before);
  });
});

describe("restoreRevision", () => {
  it("returns the previous text and is itself undoable", async () => {
    const original = await db.getEntryBySlug(env.DB, "card");
    await db.saveEntry(env.DB, "card", { definition: "Temporarily wrong." });
    const revs = await db.listRevisions(env.DB, original.id);
    await db.restoreRevision(env.DB, revs[0].id);
    const restored = await db.getEntryBySlug(env.DB, "card");
    expect(restored.definition).toBe(original.definition);
    const after = await db.listRevisions(env.DB, original.id);
    expect(after.length).toBe(revs.length + 1);
  });
});

describe("createEntry", () => {
  it("assigns the next catalogue number in the category", async () => {
    const cats = await db.listCategories(env.DB);
    const nav = cats.find((c) => c.slug === "navigation");
    const created = await db.createEntry(env.DB, { name: "Mega Menu Test", categoryId: nav.id });
    const peers = await db.listEntries(env.DB, { categorySlug: "navigation", limit: 500 });
    const max = Math.max(...peers.map((p) => p.catalogue_no));
    expect(created.catalogue_no).toBe(max);
    expect(created.slug).toBe("mega-menu-test");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/db.test.js`
Expected: FAIL — cannot resolve `../src/db.js`.

- [ ] **Step 3: Implement `src/db.js`**

The whole file is the only place SQL appears. Key points: `saveEntry` snapshots inside itself so no caller can skip it; `has_example` is derived; `slug` is never in the update set.

```js
const ENTRY_COLUMNS = `id, name, slug, aliases, definition, notes,
  controls_schema, templates, tier, has_example, catalogue_no, updated_at`;

function hydrate(row) {
  if (!row) return null;
  return {
    ...row,
    aliases: JSON.parse(row.aliases || "[]"),
    controls_schema: JSON.parse(row.controls_schema || "[]"),
    templates: JSON.parse(row.templates || "{}"),
  };
}

export async function listCategories(db) {
  const { results } = await db.prepare(
    `SELECT c.id, c.name, c.slug, c.code, c.sort_order,
            COUNT(ec.entry_id) AS entry_count
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
    where.push("c.slug = ? AND ec.is_primary = 1");
    binds.push(categorySlug);
  }
  // A search spans every tier: the tier filter is a browsing aid, not a
  // search constraint (spec section 6).
  if (q) {
    where.push("(e.name LIKE ?1 OR e.aliases LIKE ?1 OR e.definition LIKE ?1)");
    binds.push(`%${q}%`);
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/db.test.js`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit and push**

```bash
git add src/db.js tests/db.test.js
git commit -m "feat: data access layer with revision-on-every-write guarantee"
git push
```

---

## Task 6: Template engine

**Files:**
- Create: `public/js/template.js`
- Test: `tests/template.test.js`

**Interfaces:**
- Consumes: nothing. Must stay dependency-free and side-effect-free — it is imported by both the Worker and the browser.
- Produces:
  - `render(template: string, values: object) → { output: string, warnings: string[] }`
  - `defaultsFor(controlsSchema: array) → object`

- [ ] **Step 1: Write the failing template tests**

Create `tests/template.test.js`:

```js
import { describe, it, expect } from "vitest";
import { render, defaultsFor } from "../public/js/template.js";

describe("render", () => {
  it("substitutes a simple placeholder", () => {
    expect(render("<b>{{label}}</b>", { label: "Save" }).output).toBe("<b>Save</b>");
  });

  it("escapes text content", () => {
    expect(render("<b>{{label}}</b>", { label: "<script>x</script>" }).output)
      .toBe("<b>&lt;script&gt;x&lt;/script&gt;</b>");
  });

  it("escapes attribute context differently from text", () => {
    const out = render('<a title="{{t}}">{{t}}</a>', { t: 'a"b' }).output;
    expect(out).toBe('<a title="a&quot;b">a"b</a>');
  });

  it("passes triple-brace values through raw", () => {
    expect(render("{{{markup}}}", { markup: "<i>x</i>" }).output).toBe("<i>x</i>");
  });

  it("renders numbers and booleans", () => {
    expect(render("{{r}}px", { r: 12 }).output).toBe("12px");
    expect(render("{{d}}", { d: false }).output).toBe("false");
  });

  it("includes an if block when the value is truthy", () => {
    expect(render("{{#if on}}YES{{/if}}", { on: true }).output).toBe("YES");
    expect(render("{{#if on}}YES{{/if}}", { on: false }).output).toBe("");
  });

  it("includes an unless block when the value is falsy", () => {
    expect(render("{{#unless on}}NO{{/unless}}", { on: false }).output).toBe("NO");
    expect(render("{{#unless on}}NO{{/unless}}", { on: true }).output).toBe("");
  });

  it("substitutes inside an if block", () => {
    expect(render("{{#if on}}<b>{{label}}</b>{{/if}}", { on: true, label: "Hi" }).output)
      .toBe("<b>Hi</b>");
  });

  it("renders an unknown id as empty and warns", () => {
    const r = render("<b>{{nope}}</b>", { label: "x" });
    expect(r.output).toBe("<b></b>");
    expect(r.warnings).toEqual(['unknown placeholder "nope"']);
  });

  it("does not warn twice for the same id", () => {
    expect(render("{{a}}{{a}}", {}).warnings).toHaveLength(1);
  });

  it("leaves a template with no placeholders untouched", () => {
    expect(render("<hr>", {}).output).toBe("<hr>");
  });
});

describe("defaultsFor", () => {
  it("builds a value object from a controls schema", () => {
    const schema = [
      { id: "label", type: "text", default: "Click me" },
      { id: "radius", type: "number", default: 8 },
      { id: "disabled", type: "toggle", default: false },
    ];
    expect(defaultsFor(schema)).toEqual({ label: "Click me", radius: 8, disabled: false });
  });

  it("falls back sensibly when a default is missing", () => {
    expect(defaultsFor([
      { id: "a", type: "text" },
      { id: "b", type: "number" },
      { id: "c", type: "toggle" },
      { id: "d", type: "select", options: ["x", "y"] },
      { id: "e", type: "color" },
    ])).toEqual({ a: "", b: 0, c: false, d: "x", e: "#000000" });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/template.test.js`
Expected: FAIL — cannot resolve `../public/js/template.js`.

- [ ] **Step 3: Implement `public/js/template.js`**

```js
// Tiny placeholder engine shared by the Worker and the browser. Deliberately
// not a general templating language: {{id}}, {{{id}}}, and if/unless blocks
// are the whole surface.

const BLOCK_RE = /\{\{#(if|unless)\s+([\w.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const RAW_RE = /\{\{\{\s*([\w.-]+)\s*\}\}\}/g;
const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function render(template, values) {
  const warnings = [];
  const warned = new Set();

  const note = (id) => {
    if (!warned.has(id)) {
      warned.add(id);
      warnings.push(`unknown placeholder "${id}"`);
    }
  };

  let out = String(template);

  // Blocks first, so placeholders inside a removed block never resolve.
  let previous;
  do {
    previous = out;
    out = out.replace(BLOCK_RE, (_, kind, id, body) => {
      const truthy = Boolean(values[id]);
      const keep = kind === "if" ? truthy : !truthy;
      return keep ? body : "";
    });
  } while (out !== previous);

  out = out.replace(RAW_RE, (_, id) => {
    if (!(id in values)) { note(id); return ""; }
    return String(values[id]);
  });

  out = out.replace(VAR_RE, (match, id, offset, whole) => {
    if (!(id in values)) { note(id); return ""; }
    const value = String(values[id]);
    return inAttribute(whole, offset) ? escapeAttr(value) : escapeText(value);
  });

  return { output: out, warnings };
}

// A placeholder is in attribute context if the nearest unclosed `<` before it
// is followed by an odd number of quotes — i.e. we are inside a quoted
// attribute value within a tag.
function inAttribute(source, offset) {
  const open = source.lastIndexOf("<", offset);
  if (open === -1) return false;
  const close = source.lastIndexOf(">", offset);
  if (close > open) return false;
  const between = source.slice(open, offset);
  const quotes = (between.match(/"/g) || []).length;
  return quotes % 2 === 1;
}

function escapeText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}

export function defaultsFor(schema) {
  const values = {};
  for (const control of schema || []) {
    if ("default" in control) {
      values[control.id] = control.default;
      continue;
    }
    switch (control.type) {
      case "number": values[control.id] = 0; break;
      case "toggle": values[control.id] = false; break;
      case "select": values[control.id] = control.options?.[0] ?? ""; break;
      case "color": values[control.id] = "#000000"; break;
      default: values[control.id] = "";
    }
  }
  return values;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/template.test.js`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit and push**

```bash
git add public/js/template.js tests/template.test.js
git commit -m "feat: shared placeholder engine with context-aware escaping"
git push
```

---

## Task 7: Design tokens, layout shell and theme

**Files:**
- Create: `public/css/tokens.css`, `public/css/app.css`, `public/js/theme.js`, `src/render/layout.js`, `src/render/components.js`
- Download: `public/fonts/*.woff2`
- Test: `tests/layout.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `layout({title, description, body, scripts, activeNav}) → string` — full HTML document
  - `html(strings, ...values)` — tagged template that escapes interpolations; the standard way every renderer builds markup
  - `raw(s)` — marks a string as pre-escaped
  - `tierBadge(tier)`, `catalogueRef(code, no)`, `entryCard(entry)`, `specimenPlate({entry, children})` from `components.js`

- [ ] **Step 1: Verify the self-hosted fonts**

The fonts were downloaded in the planning session and are already committed, along with `public/css/fonts.css` holding their `@font-face` rules. All three are variable fonts, so one file covers every weight.

Run: `ls -l public/fonts/*.woff2 && head -c4 public/fonts/bricolage-grotesque-var.woff2`
Expected: three files — `bricolage-grotesque-var.woff2` (~131KB), `instrument-sans-var.woff2` (~57KB), `jetbrains-mono-var.woff2` (~31KB) — and the magic bytes `wOF2`.

Do not re-download them, and never reference a font CDN: the spec forbids third-party requests.

- [ ] **Step 2: Write `public/css/tokens.css`**

Custom properties only, no rules. Light on `:root`, dark via both the attribute and the media query so system preference works before JS runs.

```css
:root {
  --ink: #241430;
  --ink-raised: #322044;
  --paper: #FAF7F2;
  --mint: #A8E6C1;
  --blush: #F5C2E0;
  --sky: #BFD9F2;
  --lavender: #D9C8F0;
  --gold: #E8A020;

  --bg: var(--paper);
  --bg-raised: #FFFFFF;
  --fg: var(--ink);
  --fg-muted: #5C4A6B;
  --border: #E4DCD2;

  --font-display: "Bricolage Grotesque", Georgia, serif;
  --font-body: "Instrument Sans", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);
  --step-0:  clamp(1rem, 0.96rem + 0.2vw, 1.1rem);
  --step-1:  clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
  --step-2:  clamp(1.6rem, 1.4rem + 1vw, 2.2rem);
  --step-3:  clamp(2.2rem, 1.8rem + 2vw, 3.6rem);
  --step-4:  clamp(3rem, 2.2rem + 4vw, 5.5rem);

  --space-1: 0.25rem; --space-2: 0.5rem; --space-3: 1rem;
  --space-4: 1.5rem; --space-5: 2.5rem; --space-6: 4rem;

  --radius: 14px;
  --plate-opacity: 0.85;
}

[data-theme="dark"] {
  --bg: var(--ink);
  --bg-raised: var(--ink-raised);
  --fg: #F3ECF7;
  --fg-muted: #B9A8C7;
  --border: #43305A;
  --plate-opacity: 0.3;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: var(--ink);
    --bg-raised: var(--ink-raised);
    --fg: #F3ECF7;
    --fg-muted: #B9A8C7;
    --border: #43305A;
    --plate-opacity: 0.3;
  }
}
```

- [ ] **Step 3: Write `public/js/theme.js`**

```js
const KEY = "compendium-theme";

export function applyStoredTheme() {
  const stored = localStorage.getItem(KEY);
  if (stored) document.documentElement.dataset.theme = stored;
}

export function toggleTheme() {
  const root = document.documentElement;
  const current = root.dataset.theme
    || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem(KEY, next);
  return next;
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-theme-toggle]")) toggleTheme();
});
```

- [ ] **Step 4: Write the failing layout test**

Create `tests/layout.test.js`:

```js
import { describe, it, expect } from "vitest";
import { layout, html, raw } from "../src/render/layout.js";

describe("html tagged template", () => {
  it("escapes interpolated values", () => {
    expect(html`<p>${"<script>"}</p>`).toBe("<p>&lt;script&gt;</p>");
  });
  it("passes raw() values through", () => {
    expect(html`<p>${raw("<b>x</b>")}</p>`).toBe("<p><b>x</b></p>");
  });
  it("joins arrays without commas", () => {
    expect(html`${[raw("<li>a</li>"), raw("<li>b</li>")]}`).toBe("<li>a</li><li>b</li>");
  });
});

describe("layout", () => {
  const doc = layout({ title: "Toast", description: "A brief message.", body: raw("<main>x</main>") });

  it("sets the document language and title", () => {
    expect(doc).toContain('<html lang="en-GB"');
    expect(doc).toContain("<title>Toast · UI Element Compendium</title>");
  });
  it("applies the stored theme before first paint", () => {
    // An inline head script is the only way to avoid a flash of the wrong theme.
    const headEnd = doc.indexOf("</head>");
    const script = doc.indexOf("compendium-theme");
    expect(script).toBeGreaterThan(-1);
    expect(script).toBeLessThan(headEnd);
  });
  it("links the stylesheets and no third-party origins", () => {
    expect(doc).toContain('href="/css/fonts.css"');
    expect(doc).toContain('href="/css/tokens.css"');
    expect(doc).toContain('href="/css/app.css"');
    expect(doc).not.toMatch(/https?:\/\/(?!artifacts\.clydeford\.net)/);
  });
  it("includes a skip link as the first focusable element", () => {
    expect(doc.indexOf('href="#main"')).toBeLessThan(doc.indexOf("<main"));
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run tests/layout.test.js`
Expected: FAIL — cannot resolve `../src/render/layout.js`.

- [ ] **Step 6: Implement `src/render/layout.js`**

```js
const RAW = Symbol("raw");

export function raw(s) {
  return { [RAW]: String(s) };
}

function stringify(v) {
  if (v == null || v === false) return "";
  if (Array.isArray(v)) return v.map(stringify).join("");
  if (typeof v === "object" && RAW in v) return v[RAW];
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Every renderer builds markup with this, so escaping is the default and
// raw() is the deliberate exception.
export function html(strings, ...values) {
  return strings.reduce((acc, s, i) => acc + s + stringify(values[i]), "");
}

export function layout({ title, description = "", body, scripts = [], activeNav = "" }) {
  const scriptTags = scripts
    .map((src) => `<script type="module" src="${src}"></script>`)
    .join("");
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${stringify(title)} · UI Element Compendium</title>
<meta name="description" content="${stringify(description)}">
<script>
  // Inline and synchronous: applying the theme after first paint would flash.
  try {
    var t = localStorage.getItem("compendium-theme");
    if (t) document.documentElement.dataset.theme = t;
  } catch (e) {}
</script>
<link rel="preload" href="/fonts/instrument-sans-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/app.css">
</head>
<body data-nav="${stringify(activeNav)}">
<a class="skip-link" href="#main">Skip to content</a>
${stringify(body)}
${scriptTags}
</body>
</html>`;
}
```

- [ ] **Step 7: Implement `src/render/components.js`**

```js
import { html, raw } from "./layout.js";

export function catalogueRef(code, no) {
  return html`<span class="catalogue-ref">${code}-${String(no).padStart(3, "0")}</span>`;
}

export function tierBadge(tier) {
  if (tier === "core") return html`<span class="badge badge--core">Core</span>`;
  if (tier === "useful") return html`<span class="badge">Useful</span>`;
  return "";
}

export function definitionOnlyBadge(hasExample) {
  return hasExample ? "" : html`<span class="badge badge--quiet">Definition only</span>`;
}

export function entryCard(entry) {
  return raw(html`
    <a class="card" href="/e/${entry.slug}" data-prefetch>
      <span class="card__meta">
        ${raw(catalogueRef(entry.category_code, entry.catalogue_no))}
        <span class="card__cat">${entry.category_name}</span>
      </span>
      <h3 class="card__name">${entry.name}</h3>
      <p class="card__def">${firstLine(entry.definition)}</p>
      <span class="card__badges">
        ${raw(tierBadge(entry.tier))}${raw(definitionOnlyBadge(entry.has_example))}
      </span>
    </a>`);
}

export function firstLine(text) {
  return String(text || "").split("\n")[0];
}

// The signature element. The gradient leans toward one of the four aurora
// pastels based on the category, so navigation entries feel different from
// form entries (spec section 9).
export function specimenPlate({ entry, children }) {
  const lean = ["mint", "blush", "sky", "lavender"][(entry.categories?.[0]?.id ?? 0) % 4];
  return raw(html`
    <figure class="plate" data-lean="${lean}">
      <div class="plate__head">
        ${raw(catalogueRef(entry.categories?.[0]?.code ?? "UIF", entry.catalogue_no))}
        <span class="plate__stamp">${entry.categories?.[0]?.name ?? ""}</span>
      </div>
      <div class="plate__stage">${raw(children)}</div>
    </figure>`);
}
```

- [ ] **Step 8: Write `public/css/app.css`**

Write the real rules for `.skip-link`, `.card`, `.badge`, `.plate`, `.catalogue-ref`, the browse grid and the entry layout. Two rules are non-negotiable:

```css
/* The plate's aurora mesh. Four radial gradients, leaning per category. */
.plate {
  position: relative;
  border-radius: var(--radius);
  padding: var(--space-4);
  overflow: hidden;
  background: var(--bg-raised);
}
.plate::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: var(--plate-opacity);
  background:
    radial-gradient(60% 70% at 15% 20%, var(--mint) 0%, transparent 60%),
    radial-gradient(55% 65% at 85% 15%, var(--blush) 0%, transparent 60%),
    radial-gradient(65% 60% at 80% 85%, var(--sky) 0%, transparent 60%),
    radial-gradient(60% 70% at 20% 85%, var(--lavender) 0%, transparent 60%);
}
.plate[data-lean="mint"]::before   { background-position: -10% -10%; }
.plate[data-lean="blush"]::before  { background-position: 110% -10%; }
.plate[data-lean="sky"]::before    { background-position: 110% 110%; }
.plate[data-lean="lavender"]::before { background-position: -10% 110%; }
.plate__head, .plate__stage { position: relative; }

/* ALL motion lives in here. Never write a bare transition elsewhere. */
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 160ms ease, box-shadow 160ms ease; }
  .card:hover { transform: translateY(-2px); }
  .plate__stage { transition: opacity 120ms ease; }
}

:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.skip-link { position: absolute; left: -9999px; }
.skip-link:focus { left: var(--space-3); top: var(--space-3); }
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run tests/layout.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 10: Commit and push**

```bash
git add public/ src/render/ tests/layout.test.js
git commit -m "feat: design tokens, layout shell, specimen plate and theme"
git push
```

---

## Task 8: Browse page with categories, tiers and no-JS search

**Files:**
- Create: `src/render/browse.js`
- Modify: `src/worker.js` (register `GET /` and `GET /c/:slug`)
- Test: `tests/browse.test.js`

**Interfaces:**
- Consumes: `listCategories`, `listEntries` (Task 5); `layout`, `html`, `raw` (Task 7); `entryCard` (Task 7).
- Produces: `renderBrowse({categories, entries, filters}) → string`.

- [ ] **Step 1: Write the failing browse tests**

Create `tests/browse.test.js`:

```js
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

describe("GET /", () => {
  it("returns HTML", async () => {
    const res = await SELF.fetch("https://example.com/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("lists all 45 categories", async () => {
    const body = await (await SELF.fetch("https://example.com/")).text();
    expect(body).toContain("UI Fundamentals");
    expect(body).toContain("Internationalisation &amp; Localisation");
  });

  it("defaults to core and useful tiers only", async () => {
    const body = await (await SELF.fetch("https://example.com/")).text();
    expect(body).toContain(">Button<");
    // "Affordance" is reference tier and must not appear by default
    expect(body).not.toContain(">Affordance<");
  });

  it("shows every tier when asked", async () => {
    const body = await (await SELF.fetch("https://example.com/?tier=all")).text();
    expect(body).toContain(">Affordance<");
  });

  it("filters to definition-only entries", async () => {
    const body = await (await SELF.fetch("https://example.com/?examples=none")).text();
    expect(body).toContain("Definition only");
  });

  it("searches without JavaScript across every tier", async () => {
    const body = await (await SELF.fetch("https://example.com/?q=affordance")).text();
    expect(body).toContain(">Affordance<");
  });

  it("shows a charming empty state when nothing matches", async () => {
    const body = await (await SELF.fetch("https://example.com/?q=zzzznotathing")).text();
    expect(body).toMatch(/Nothing in the catalogue/i);
  });
});

describe("GET /c/:slug", () => {
  it("lists a single category", async () => {
    const res = await SELF.fetch("https://example.com/c/navigation");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Navigation");
    expect(body).toContain("NAV-");
  });

  it("404s an unknown category", async () => {
    const res = await SELF.fetch("https://example.com/c/nope");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/browse.test.js`
Expected: FAIL — routes not registered, 404s.

- [ ] **Step 3: Implement `src/render/browse.js`**

```js
import { html, raw, layout } from "./layout.js";
import { entryCard } from "./components.js";

export function renderBrowse({ categories, entries, filters, activeCategory }) {
  const body = html`
    <header class="masthead">
      <h1 class="masthead__title">UI Element Compendium</h1>
      <p class="masthead__sub">${entries.length} specimens on display. Press
        <kbd>/</kbd> or <kbd>Cmd</kbd>+<kbd>K</kbd> to search.</p>
      <button class="theme-toggle" data-theme-toggle aria-label="Switch between light and dark themes">Theme</button>
    </header>
    <div class="browse">
      <nav class="browse__nav" aria-label="Categories">
        <h2 class="browse__navtitle">Categories</h2>
        <ul>
          ${categories.map((c) => raw(html`
            <li><a href="/c/${c.slug}" ${raw(c.slug === activeCategory ? 'aria-current="page"' : "")}>
              <span class="cat__code">${c.code}</span>
              <span class="cat__name">${c.name}</span>
              <span class="cat__count">${c.entry_count}</span>
            </a></li>`))}
        </ul>
      </nav>
      <main id="main" class="browse__main">
        <form class="searchbar" action="/" method="get" role="search">
          <label for="q" class="visually-hidden">Search the compendium</label>
          <input id="q" name="q" type="search" value="${filters.q ?? ""}"
                 placeholder="Search 918 elements…" autocomplete="off">
          <select name="tier" aria-label="Tier">
            <option value="default"${sel(filters.tier, "default")}>Core &amp; useful</option>
            <option value="core"${sel(filters.tier, "core")}>Core only</option>
            <option value="reference"${sel(filters.tier, "reference")}>Reference</option>
            <option value="all"${sel(filters.tier, "all")}>All tiers</option>
          </select>
          <select name="examples" aria-label="Examples">
            <option value="any"${sel(filters.examples, "any")}>Any</option>
            <option value="none"${sel(filters.examples, "none")}>Definition only</option>
            <option value="some"${sel(filters.examples, "some")}>Has an example</option>
          </select>
          <button type="submit">Search</button>
        </form>
        ${entries.length === 0 ? raw(emptyState(filters)) : raw(html`
          <ul class="grid">${entries.map((e) => raw(html`<li>${raw(entryCard(e))}</li>`))}</ul>`)}
      </main>
    </div>`;

  return layout({
    title: activeCategory ? categories.find((c) => c.slug === activeCategory)?.name ?? "Browse" : "Browse",
    description: "A searchable catalogue of user interface elements.",
    body: raw(body),
    scripts: ["/js/theme.js", "/js/palette.js"],
  });
}

function sel(current, value) {
  return current === value ? " selected" : "";
}

function emptyState(filters) {
  if (filters.examples === "none") {
    return html`<p class="empty">Every specimen is mounted. Nothing left to catalogue.</p>`;
  }
  return html`<p class="empty">Nothing in the catalogue matches
    “${filters.q ?? ""}”. Try a shorter word, or browse by category.</p>`;
}
```

- [ ] **Step 4: Wire the routes in `src/worker.js`**

```js
import * as db from "./db.js";
import { renderBrowse } from "./render/browse.js";

const TIERS = {
  default: ["core", "useful"],
  core: ["core"],
  reference: ["reference"],
  all: ["core", "useful", "reference"],
};

async function browse(request, env, ctx, params) {
  const url = new URL(request.url);
  const filters = {
    q: url.searchParams.get("q") || "",
    tier: url.searchParams.get("tier") || "default",
    examples: url.searchParams.get("examples") || "any",
  };
  const categories = await db.listCategories(env.DB);
  if (params.slug && !categories.some((c) => c.slug === params.slug)) {
    return new Response("Not found", { status: 404 });
  }
  const entries = await db.listEntries(env.DB, {
    categorySlug: params.slug,
    tiers: TIERS[filters.tier] ?? TIERS.default,
    definitionOnly: filters.examples === "none",
    q: filters.q || undefined,
    limit: 500,
  });
  const filtered = filters.examples === "some" ? entries.filter((e) => e.has_example) : entries;
  return htmlResponse(renderBrowse({
    categories, entries: filtered, filters, activeCategory: params.slug,
  }));
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
```

Register `{ method: "GET", pattern: "/", handler: browse }` and `{ method: "GET", pattern: "/c/:slug", handler: browse }`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/browse.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit and push**

```bash
git add src/render/browse.js src/worker.js tests/browse.test.js public/css/app.css
git commit -m "feat: browse page with category, tier and example filters"
git push
```

---

## Task 9: Search index API and command palette

**Files:**
- Create: `src/api/index.js`, `public/js/palette.js`
- Modify: `src/worker.js`
- Test: `tests/searchindex.test.js`

**Interfaces:**
- Consumes: `searchIndexRows`, `getIndexVersion` (Task 5).
- Produces: `GET /api/index.json` returning `{version: string, entries: [[name, slug, aliases, code, definition, tier, hasExample]]}`, and a global `Cmd+K` / `/` palette.

- [ ] **Step 1: Write the failing index tests**

Create `tests/searchindex.test.js`:

```js
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import * as db from "../src/db.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

describe("GET /api/index.json", () => {
  it("returns all 918 entries in compact array form", async () => {
    const res = await SELF.fetch("https://example.com/api/index.json");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(918);
    expect(Array.isArray(body.entries[0])).toBe(true);
    expect(body.entries[0]).toHaveLength(7);
  });

  it("stays small enough to ship on every page", async () => {
    const text = await (await SELF.fetch("https://example.com/api/index.json")).text();
    expect(text.length).toBeLessThan(250_000);
  });

  it("sends an ETag and honours If-None-Match", async () => {
    const first = await SELF.fetch("https://example.com/api/index.json");
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    const second = await SELF.fetch("https://example.com/api/index.json", {
      headers: { "if-none-match": etag },
    });
    expect(second.status).toBe(304);
  });

  it("changes its ETag when an entry is written", async () => {
    const before = (await SELF.fetch("https://example.com/api/index.json")).headers.get("etag");
    await db.saveEntry(env.DB, "toast", { definition: "A brief, self-dismissing message." });
    const after = (await SELF.fetch("https://example.com/api/index.json")).headers.get("etag");
    expect(after).not.toBe(before);
  });

  it("omits deleted entries", async () => {
    await db.saveEntry(env.DB, "affordance", { tier: "deleted" });
    const body = await (await SELF.fetch("https://example.com/api/index.json")).json();
    expect(body.entries.some((e) => e[1] === "affordance")).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/searchindex.test.js`
Expected: FAIL — 404 on `/api/index.json`.

- [ ] **Step 3: Implement `src/api/index.js`**

```js
import { searchIndexRows, getIndexVersion } from "../db.js";
import { firstLine } from "../render/components.js";

export async function searchIndex(request, env) {
  const version = await getIndexVersion(env.DB);
  const etag = `W/"idx-${version}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }
  const rows = await searchIndexRows(env.DB);
  const body = JSON.stringify({
    version,
    entries: rows.map((r) => [
      r.name, r.slug, JSON.parse(r.aliases || "[]").join(" "),
      r.category_code, firstLine(r.definition), r.tier, r.has_example,
    ]),
  });
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, must-revalidate",
      etag,
    },
  });
}
```

Register `{ method: "GET", pattern: "/api/index.json", handler: searchIndex }`.

- [ ] **Step 4: Run to verify the tests pass**

Run: `npx vitest run tests/searchindex.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Implement `public/js/palette.js`**

Scoring order per spec section 6: exact name, name prefix, name substring, alias, definition.

```js
let index = null;
let dialog = null;
let input = null;
let list = null;
let active = 0;
let results = [];

async function loadIndex() {
  if (index) return index;
  const res = await fetch("/api/index.json");
  index = (await res.json()).entries;
  return index;
}

function score(entry, q) {
  const [name, , aliases, , definition] = entry;
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q)) return 2;
  if (aliases.toLowerCase().includes(q)) return 3;
  if (definition.toLowerCase().includes(q)) return 4;
  return Infinity;
}

function search(q) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return index
    .map((e) => ({ e, s: score(e, needle) }))
    .filter((r) => r.s < Infinity)
    .sort((a, b) => a.s - b.s || a.e[0].length - b.e[0].length)
    .slice(0, 20)
    .map((r) => r.e);
}

function build() {
  dialog = document.createElement("div");
  dialog.className = "palette";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Search the compendium");
  dialog.innerHTML = `
    <div class="palette__box">
      <input class="palette__input" type="text" role="combobox"
             aria-expanded="true" aria-controls="palette-list"
             aria-autocomplete="list" placeholder="Search elements…">
      <ul class="palette__list" id="palette-list" role="listbox"></ul>
    </div>`;
  document.body.append(dialog);
  input = dialog.querySelector(".palette__input");
  list = dialog.querySelector(".palette__list");
  input.addEventListener("input", () => { results = search(input.value); active = 0; paint(); });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
}

function paint() {
  list.innerHTML = results.map((e, i) => `
    <li id="palette-opt-${i}" role="option" aria-selected="${i === active}"
        class="palette__item${i === active ? " is-active" : ""}">
      <span class="palette__name">${e[0]}</span>
      <span class="palette__code">${e[3]}</span>
      <span class="palette__def">${e[4]}</span>
    </li>`).join("");
  input.setAttribute("aria-activedescendant", results.length ? `palette-opt-${active}` : "");
}

let lastFocused = null;

async function open() {
  await loadIndex();
  if (!dialog) build();
  lastFocused = document.activeElement;
  dialog.hidden = false;
  input.value = "";
  results = [];
  paint();
  input.focus();
}

function close() {
  dialog.hidden = true;
  lastFocused?.focus();
}

function isTyping(el) {
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

document.addEventListener("keydown", (e) => {
  const open_ = dialog && !dialog.hidden;
  if (!open_ && (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"))) {
    if (isTyping(document.activeElement)) return;
    e.preventDefault();
    open();
    return;
  }
  if (!open_) return;
  if (e.key === "Escape") { e.preventDefault(); close(); }
  if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, results.length - 1); paint(); }
  if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
  if (e.key === "Tab") { e.preventDefault(); input.focus(); }   // focus trap
  if (e.key === "Enter" && results[active]) {
    e.preventDefault();
    location.href = `/e/${results[active][1]}`;
  }
});

// Prefetch on hover makes cross-entry navigation feel instant without a SPA.
document.addEventListener("mouseover", (e) => {
  const link = e.target.closest("a[data-prefetch]");
  if (!link || link.dataset.prefetched) return;
  link.dataset.prefetched = "1";
  const l = document.createElement("link");
  l.rel = "prefetch";
  l.href = link.href;
  document.head.append(l);
});
```

- [ ] **Step 6: Verify the palette by hand**

Run `npx wrangler dev`, open `http://127.0.0.1:8787/`, press Cmd+K, type "toa", press Enter.
Expected: navigates to `/e/toast` without touching the mouse.

- [ ] **Step 7: Commit and push**

```bash
git add src/api/index.js public/js/palette.js src/worker.js tests/searchindex.test.js
git commit -m "feat: client-resident search index and command palette"
git push
```

---

## Task 10: Entry detail page

**Files:**
- Create: `src/render/entry.js`
- Modify: `src/worker.js`
- Test: `tests/entry.test.js`

**Interfaces:**
- Consumes: `getEntryBySlug` (Task 5); `specimenPlate`, `catalogueRef`, `tierBadge` (Task 7).
- Produces: `renderEntry({entry}) → string`. Renders correctly whether or not the entry has templates — Task 11 adds the interactive parts.

- [ ] **Step 1: Write the failing entry tests**

Create `tests/entry.test.js`:

```js
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import * as db from "../src/db.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

const get = (p) => SELF.fetch(`https://example.com${p}`);

describe("GET /e/:slug", () => {
  it("renders a definition-only entry without an example", async () => {
    const body = await (await get("/e/affordance")).text();
    expect(body).toContain("Affordance");
    expect(body).toContain("Definition only");
    expect(body).not.toContain("<iframe");
  });

  it("shows the specimen plate with catalogue reference and category stamp", async () => {
    const body = await (await get("/e/breadcrumb")).text();
    expect(body).toContain("plate");
    expect(body).toMatch(/NAV-\d{3}/);
    expect(body).toContain("Navigation");
  });

  it("shows aliases", async () => {
    const body = await (await get("/e/switch")).text();
    expect(body).toContain("Toggle");
  });

  it("shows every category a merged entry belongs to", async () => {
    const body = await (await get("/e/state")).text();
    expect(body).toContain("Interaction States");
    expect(body).toContain("Application State Terminology");
  });

  it("renders notes from merged duplicates", async () => {
    const body = await (await get("/e/state")).text();
    expect(body).toContain("Also defined in");
  });

  it("404s an unknown slug", async () => {
    expect((await get("/e/not-a-real-element")).status).toBe(404);
  });

  it("renders the example iframe once templates exist", async () => {
    await db.saveEntry(env.DB, "badge", {
      templates: { html: "<span class=\"b\">{{label}}</span>" },
      controls_schema: [{ id: "label", type: "text", label: "Label", default: "New" }],
    });
    const body = await (await get("/e/badge")).text();
    expect(body).toContain("<iframe");
    expect(body).toContain('sandbox="allow-scripts"');
    expect(body).not.toContain("allow-same-origin");
  });

  it("shows a tab only for formats the entry actually has", async () => {
    const body = await (await get("/e/badge")).text();
    expect(body).toContain("HTML + CSS");
    expect(body).not.toContain("React");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/entry.test.js`
Expected: FAIL — 404 on `/e/affordance`.

- [ ] **Step 3: Implement `src/render/entry.js`**

```js
import { html, raw, layout } from "./layout.js";
import { specimenPlate, tierBadge, definitionOnlyBadge } from "./components.js";
import { defaultsFor } from "../../public/js/template.js";

const FORMAT_LABELS = { html: "HTML + CSS", tailwind: "Tailwind CSS", react: "React" };

export function renderEntry({ entry }) {
  const formats = Object.keys(FORMAT_LABELS).filter((k) => entry.templates[k]?.trim());
  const values = defaultsFor(entry.controls_schema);

  const body = html`
    <header class="entry__head">
      <a class="backlink" href="/c/${entry.categories[0].slug}">← ${entry.categories[0].name}</a>
      <h1 class="entry__name">${entry.name}</h1>
      <p class="entry__def">${entry.definition}</p>
      <p class="entry__badges">
        ${raw(tierBadge(entry.tier))}${raw(definitionOnlyBadge(entry.has_example))}
        ${entry.aliases.length ? raw(html`<span class="aliases">Also known as ${entry.aliases.join(", ")}</span>`) : ""}
      </p>
    </header>
    <main id="main" class="entry">
      ${entry.has_example ? raw(exampleSection(entry, formats, values)) : raw(noExample(entry))}
      ${entry.notes ? raw(html`
        <section class="entry__notes">
          <h2>Also defined in other sections</h2>
          <div class="prose">${raw(notesToHtml(entry.notes))}</div>
        </section>`) : ""}
      <section class="entry__cats">
        <h2>Categories</h2>
        <ul class="chips">${entry.categories.map((c) => raw(html`
          <li><a class="chip" href="/c/${c.slug}">${c.code} · ${c.name}</a></li>`))}</ul>
      </section>
      <p class="entry__actions">
        <a href="/e/${entry.slug}/edit">Edit</a>
        <a href="/e/${entry.slug}/history">History</a>
        <a href="/e/${entry.slug}/export.html" download>Download standalone HTML</a>
      </p>
    </main>`;

  return layout({
    title: entry.name,
    description: entry.definition,
    body: raw(body),
    scripts: entry.has_example
      ? ["/js/theme.js", "/js/palette.js", "/js/copy.js", "/js/tweak.js"]
      : ["/js/theme.js", "/js/palette.js"],
  });
}

function exampleSection(entry, formats, values) {
  return html`
    <section class="specimen"
             data-entry="${entry.slug}"
             data-controls="${JSON.stringify(entry.controls_schema)}"
             data-templates="${JSON.stringify(entry.templates)}">
      ${raw(specimenPlate({
        entry,
        children: html`<iframe class="stage" title="Live example of ${entry.name}"
                        sandbox="allow-scripts" loading="lazy"></iframe>`,
      }))}
      <div class="tweaks">
        <h2>Adjust</h2>
        <div class="tweaks__controls"></div>
        <button type="button" class="tweaks__reset">Reset</button>
      </div>
      <div class="code">
        <div class="code__tabs" role="tablist">
          ${formats.map((f, i) => raw(html`
            <button role="tab" class="code__tab" data-format="${f}"
                    aria-selected="${i === 0 ? "true" : "false"}">${FORMAT_LABELS[f]}</button>`))}
        </div>
        ${formats.map((f, i) => raw(html`
          <div class="code__panel" role="tabpanel" data-format="${f}" ${raw(i === 0 ? "" : "hidden")}>
            <pre><code></code></pre>
            <button type="button" class="copy" data-copy>Copy</button>
          </div>`))}
      </div>
    </section>`;
}

function noExample(entry) {
  return html`
    ${raw(specimenPlate({
      entry,
      children: html`<p class="stage stage--empty">No specimen mounted yet.
        <a href="/e/${entry.slug}/edit">Write one</a>.</p>`,
    }))}`;
}

function notesToHtml(notes) {
  return String(notes)
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`)
    .join("");
}
```

- [ ] **Step 4: Wire the route**

```js
async function entryPage(request, env, ctx, params) {
  const entry = await db.getEntryBySlug(env.DB, params.slug);
  if (!entry) return new Response("Not found", { status: 404 });
  return htmlResponse(renderEntry({ entry }));
}
```

Register `{ method: "GET", pattern: "/e/:slug", handler: entryPage }`.

- [ ] **Step 5: Run to verify the tests pass**

Run: `npx vitest run tests/entry.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit and push**

```bash
git add src/render/entry.js src/worker.js tests/entry.test.js public/css/app.css
git commit -m "feat: entry detail page with specimen plate"
git push
```

---

## Task 11: Tweak panel, live example and code tabs

This is the feature the whole site exists for. The panel, the iframe and the code tabs all read from the same `render()` call, which is what makes them impossible to desynchronise.

**Files:**
- Create: `public/js/tweak.js`, `public/js/copy.js`
- Test: `tests/tweak.test.js` (logic), plus manual verification

**Interfaces:**
- Consumes: `render`, `defaultsFor` from `public/js/template.js` (Task 6). The browser loads that file directly as a static asset; nothing needs serving through a route.
- Produces: `buildDocument(htmlTemplate, values) → string` (the iframe srcdoc) and `generateAll(templates, values) → {format: code}`.

- [ ] **Step 1: Make the template engine reachable from the browser**

Nothing to do — Task 6 already put it at `public/js/template.js`, which the assets binding serves at `/js/template.js`. The browser modules beside it import it as `./template.js`, which resolves both in the browser and in Node, so the tests need no aliasing.

Confirm it is reachable:

Run: `npx wrangler dev` then `curl -s -o /dev/null -w "%{http_code}
" http://127.0.0.1:8787/js/template.js`
Expected: `200`.

- [ ] **Step 2: Write the failing generation tests**

Create `tests/tweak.test.js`:

```js
import { describe, it, expect } from "vitest";
import { generateAll, buildDocument } from "../public/js/generate.js";

const templates = {
  html: '<button style="border-radius:{{radius}}px;background:{{bg}}">{{label}}</button>',
  tailwind: '<button class="rounded-[{{radius}}px]">{{label}}</button>',
  react: 'export function Button() { return <button>{{label}}</button>; }',
};

describe("generateAll", () => {
  it("produces one output per template", () => {
    const out = generateAll(templates, { radius: 8, bg: "#241430", label: "Save" });
    expect(Object.keys(out)).toEqual(["html", "tailwind", "react"]);
  });

  it("puts the same control value into every format", () => {
    const out = generateAll(templates, { radius: 16, bg: "#A8E6C1", label: "Save" });
    expect(out.html).toContain("16");
    expect(out.tailwind).toContain("16");
    expect(out.html).toContain("#A8E6C1");
    expect(out.html).toContain("Save");
    expect(out.tailwind).toContain("Save");
    expect(out.react).toContain("Save");
  });

  it("skips absent formats", () => {
    expect(Object.keys(generateAll({ html: "<b>{{x}}</b>" }, { x: "1" }))).toEqual(["html"]);
  });
});

describe("buildDocument", () => {
  it("wraps the html template in a full document", () => {
    const doc = buildDocument("<button>{{label}}</button>", { label: "Go" }, "light");
    expect(doc).toContain("<!doctype html>");
    expect(doc).toContain("<button>Go</button>");
  });

  it("reports its height to the parent", () => {
    expect(buildDocument("<b>x</b>", {}, "light")).toContain("postMessage");
  });

  it("carries the current theme through to the frame", () => {
    expect(buildDocument("<b>x</b>", {}, "dark")).toContain('data-theme="dark"');
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/tweak.test.js`
Expected: FAIL — cannot resolve `../public/js/generate.js`.

- [ ] **Step 4: Implement `public/js/generate.js`**

```js
import { render } from "./template.js";

export function generateAll(templates, values) {
  const out = {};
  for (const [format, template] of Object.entries(templates)) {
    if (!template?.trim()) continue;
    out[format] = render(template, values).output;
  }
  return out;
}

// The iframe document. sandbox="allow-scripts" without allow-same-origin puts
// this in an opaque origin, so this script cannot reach the parent page.
export function buildDocument(htmlTemplate, values, theme) {
  const body = render(htmlTemplate, values).output;
  return `<!doctype html>
<html data-theme="${theme}">
<head><meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; }
  body {
    display: grid; place-items: center; min-height: 120px;
    padding: 24px; background: transparent;
    font-family: system-ui, sans-serif;
  }
</style></head>
<body>
${body}
<script>
  const report = () => parent.postMessage(
    { type: "height", value: document.documentElement.scrollHeight }, "*");
  new ResizeObserver(report).observe(document.body);
  report();
</script>
</body></html>`;
}
```

- [ ] **Step 5: Run to verify the tests pass**

Run: `npx vitest run tests/tweak.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 6: Implement `public/js/tweak.js`**

```js
import { defaultsFor } from "./template.js";
import { generateAll, buildDocument } from "./generate.js";

const root = document.querySelector(".specimen");
if (root) init(root);

function init(root) {
  const schema = JSON.parse(root.dataset.controls || "[]");
  const templates = JSON.parse(root.dataset.templates || "{}");
  const frame = root.querySelector("iframe.stage");
  const panel = root.querySelector(".tweaks__controls");
  const stage = root.querySelector(".plate__stage");

  const values = { ...defaultsFor(schema), ...fromHash() };

  panel.innerHTML = schema.map(controlHtml).join("");
  panel.addEventListener("input", onChange);
  panel.addEventListener("change", onChange);
  root.querySelector(".tweaks__reset")?.addEventListener("click", () => {
    Object.assign(values, defaultsFor(schema));
    syncInputs();
    location.hash = "";
    paint();
  });

  root.querySelectorAll(".code__tab").forEach((tab) => {
    tab.addEventListener("click", () => selectTab(root, tab.dataset.format));
  });

  addEventListener("message", (e) => {
    if (e.source === frame.contentWindow && e.data?.type === "height") {
      frame.style.height = `${e.data.value}px`;
    }
  });

  let timer = null;
  function onChange(e) {
    const control = schema.find((c) => c.id === e.target.name);
    if (!control) return;
    values[control.id] = readValue(control, e.target);
    const immediate = control.type !== "text" && control.type !== "number";
    clearTimeout(timer);
    if (immediate) paint();
    else timer = setTimeout(paint, 80);
  }

  function paint() {
    const theme = document.documentElement.dataset.theme
      || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    frame.srcdoc = buildDocument(templates.html, values, theme);
    const code = generateAll(templates, values);
    for (const [format, text] of Object.entries(code)) {
      const el = root.querySelector(`.code__panel[data-format="${format}"] code`);
      if (el) el.textContent = text;
    }
    // A brief shimmer connects cause to effect; the CSS that animates it is
    // inside a prefers-reduced-motion: no-preference block, so this class is
    // inert when the visitor asks for less motion.
    stage.classList.remove("is-fresh");
    void stage.offsetWidth;
    stage.classList.add("is-fresh");
    writeHash();
  }

  function syncInputs() {
    for (const c of schema) {
      const el = panel.querySelector(`[name="${c.id}"]`);
      if (!el) continue;
      if (c.type === "toggle") el.checked = Boolean(values[c.id]);
      else el.value = values[c.id];
    }
  }

  function writeHash() {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(values)) params.set(k, String(v));
    history.replaceState(null, "", `#${params}`);
  }

  function fromHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const out = {};
    for (const c of schema) {
      if (!params.has(c.id)) continue;
      const raw = params.get(c.id);
      out[c.id] = c.type === "number" ? Number(raw)
        : c.type === "toggle" ? raw === "true" : raw;
    }
    return out;
  }

  paint();
}

function readValue(control, el) {
  if (control.type === "toggle") return el.checked;
  if (control.type === "number") return Number(el.value);
  return el.value;
}

function controlHtml(c) {
  const id = `ctl-${c.id}`;
  const label = `<label class="ctl__label" for="${id}">${c.label ?? c.id}</label>`;
  switch (c.type) {
    case "select":
      return `<div class="ctl">${label}<select id="${id}" name="${c.id}">${
        (c.options || []).map((o) => `<option value="${o}">${o}</option>`).join("")
      }</select></div>`;
    case "color":
      return `<div class="ctl">${label}
        <span class="ctl__colour">
          <input id="${id}" name="${c.id}" type="color" value="${c.default ?? "#000000"}">
          ${(c.presets || []).map((p) =>
            `<button type="button" class="swatch" data-for="${c.id}" data-value="${p}"
                     style="background:${p}" aria-label="Use ${p}"></button>`).join("")}
        </span></div>`;
    case "number":
      return `<div class="ctl">${label}<input id="${id}" name="${c.id}" type="range"
        min="${c.min ?? 0}" max="${c.max ?? 100}" step="${c.step ?? 1}"
        value="${c.default ?? 0}"><output>${c.default ?? 0}</output></div>`;
    case "toggle":
      return `<div class="ctl ctl--toggle"><input id="${id}" name="${c.id}" type="checkbox"
        ${c.default ? "checked" : ""}>${label}</div>`;
    default:
      return `<div class="ctl">${label}<input id="${id}" name="${c.id}" type="text"
        value="${c.default ?? ""}"></div>`;
  }
}

function selectTab(root, format) {
  root.querySelectorAll(".code__tab").forEach((t) =>
    t.setAttribute("aria-selected", String(t.dataset.format === format)));
  root.querySelectorAll(".code__panel").forEach((p) => {
    p.hidden = p.dataset.format !== format;
  });
}

// Preset swatches write into the colour input and fire its change handler.
document.addEventListener("click", (e) => {
  const swatch = e.target.closest(".swatch");
  if (!swatch) return;
  const input = document.querySelector(`input[name="${swatch.dataset.for}"]`);
  input.value = swatch.dataset.value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
```

- [ ] **Step 7: Implement `public/js/copy.js`**

```js
document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-copy]");
  if (!button) return;
  const code = button.closest(".code__panel").querySelector("code").textContent;
  try {
    await navigator.clipboard.writeText(code);
    stamp(button, "Copied");
  } catch {
    stamp(button, "Press Ctrl+C");
  }
});

function stamp(button, message) {
  const original = button.textContent;
  button.textContent = message;
  button.classList.add("is-copied");
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove("is-copied");
  }, 1400);
}
```

- [ ] **Step 8: Add the shimmer and copy-stamp CSS**

In `public/css/app.css`, inside the existing reduced-motion block only:

```css
@media (prefers-reduced-motion: no-preference) {
  .plate__stage.is-fresh { animation: shimmer 220ms ease-out; }
  @keyframes shimmer {
    from { opacity: 0.55; }
    to   { opacity: 1; }
  }
  .copy.is-copied { animation: stamp 200ms ease-out; }
  @keyframes stamp {
    from { transform: scale(0.94); }
    to   { transform: scale(1); }
  }
}
.copy.is-copied { background: var(--gold); color: var(--ink); }
```

- [ ] **Step 9: Verify end to end by hand**

Give Badge a colour control and template, run `npx wrangler dev`, open `/e/badge`, change the colour.
Expected: the example changes immediately, and every code tab shows the new hex.

- [ ] **Step 10: Commit and push**

```bash
git add public/js/ src/worker.js tests/tweak.test.js public/css/app.css
git commit -m "feat: tweak panel driving the live example and all code tabs"
git push
```

---

## Task 12: Edit view, new entry, history and restore

**Files:**
- Create: `src/render/edit.js`, `src/render/history.js`, `src/api/entries.js`, `src/auth.js`, `public/js/edit.js`
- Modify: `src/worker.js`
- Test: `tests/edit.test.js`

**Interfaces:**
- Consumes: `saveEntry`, `createEntry`, `listRevisions`, `restoreRevision`, `listCategories` (Task 5).
- Produces: `requireWrite(request, env) → Response | null` — the single auth seam. Returns `null` today; a future edit key is implemented here and nowhere else.

- [ ] **Step 1: Implement `src/auth.js`**

```js
// The ONE place a future shared edit key gets checked. Every write route
// calls this. Implementing the key means filling in this function and
// changing nothing else — no accounts, no sessions, no user table.
export function requireWrite(request, env) {
  if (!env.EDIT_KEY) return null;           // open editing, as specified today
  const supplied = request.headers.get("x-edit-key")
    || cookie(request, "edit_key");
  if (supplied === env.EDIT_KEY) return null;
  return new Response("Editing is locked", { status: 401 });
}

function cookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
```

- [ ] **Step 2: Write the failing edit tests**

Create `tests/edit.test.js`:

```js
import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

const post = (path, body) => SELF.fetch(`https://example.com${path}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("GET /e/:slug/edit", () => {
  it("renders a form pre-filled with the current values", async () => {
    const body = await (await SELF.fetch("https://example.com/e/toast/edit")).text();
    expect(body).toContain("Brief");
    expect(body).toContain('name="definition"');
    expect(body).toContain('name="controls_schema"');
    expect(body).toContain('name="templates"');
  });
});

describe("POST /api/entries/:slug", () => {
  it("saves a definition and creates a revision", async () => {
    const res = await post("/api/entries/toast", { definition: "Edited definition." });
    expect(res.status).toBe(200);
    const page = await (await SELF.fetch("https://example.com/e/toast")).text();
    expect(page).toContain("Edited definition.");
    const history = await (await SELF.fetch("https://example.com/e/toast/history")).text();
    expect(history).toContain("Restore");
  });

  it("rejects invalid JSON in templates with a useful message", async () => {
    const res = await post("/api/entries/toast", { templates: "not json" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/templates/i);
  });

  it("rejects an unknown tier", async () => {
    expect((await post("/api/entries/toast", { tier: "amazing" })).status).toBe(400);
  });

  it("rejects a controls schema with an unknown control type", async () => {
    const res = await post("/api/entries/toast", {
      controls_schema: [{ id: "x", type: "wormhole" }],
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/wormhole/);
  });

  it("rejects a control whose id is not a safe identifier", async () => {
    const res = await post("/api/entries/toast", {
      controls_schema: [{ id: "a b", type: "text" }],
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/entries (new)", () => {
  it("creates a blank entry in a category", async () => {
    const res = await post("/api/entries", { name: "Split Button", categoryId: 5 });
    expect(res.status).toBe(200);
    const created = await res.json();
    expect(created.slug).toBe("split-button");
    expect((await SELF.fetch("https://example.com/e/split-button")).status).toBe(200);
  });

  it("rejects a blank name", async () => {
    expect((await post("/api/entries", { name: "  ", categoryId: 5 })).status).toBe(400);
  });
});

describe("restore", () => {
  it("returns the original text and remains undoable", async () => {
    await post("/api/entries/card", { definition: "Temporarily wrong." });
    const revs = await (await SELF.fetch("https://example.com/api/revisions/card")).json();
    const res = await post(`/api/revisions/${revs[0].id}/restore`, {});
    expect(res.status).toBe(200);
    const after = await (await SELF.fetch("https://example.com/e/card")).text();
    expect(after).not.toContain("Temporarily wrong.");
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/edit.test.js`
Expected: FAIL — routes missing.

- [ ] **Step 4: Implement `src/api/entries.js`**

Validation is explicit rather than "add appropriate validation": every rejection below has a test above.

```js
import * as db from "../db.js";
import { requireWrite } from "../auth.js";

const CONTROL_TYPES = new Set(["text", "select", "color", "number", "toggle"]);
const TIERS = new Set(["core", "useful", "reference", "deleted"]);
const FORMATS = new Set(["html", "tailwind", "react"]);
const ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

function bad(message) {
  return Response.json({ error: message }, { status: 400 });
}

function validate(patch) {
  if ("tier" in patch && !TIERS.has(patch.tier)) {
    return `unknown tier "${patch.tier}"`;
  }
  if ("templates" in patch) {
    if (typeof patch.templates !== "object" || patch.templates === null || Array.isArray(patch.templates)) {
      return "templates must be a JSON object keyed by format";
    }
    for (const key of Object.keys(patch.templates)) {
      if (!FORMATS.has(key)) return `unknown template format "${key}"`;
      if (typeof patch.templates[key] !== "string") return `template "${key}" must be a string`;
    }
  }
  if ("controls_schema" in patch) {
    if (!Array.isArray(patch.controls_schema)) return "controls_schema must be an array";
    const seen = new Set();
    for (const c of patch.controls_schema) {
      if (!c || typeof c !== "object") return "each control must be an object";
      if (!ID_RE.test(c.id ?? "")) return `control id "${c.id}" must be a plain identifier`;
      if (seen.has(c.id)) return `duplicate control id "${c.id}"`;
      seen.add(c.id);
      if (!CONTROL_TYPES.has(c.type)) return `unknown control type "${c.type}"`;
      if (c.type === "select" && !(Array.isArray(c.options) && c.options.length)) {
        return `select control "${c.id}" needs an options array`;
      }
    }
  }
  if ("aliases" in patch && !Array.isArray(patch.aliases)) return "aliases must be an array";
  return null;
}

export async function saveEntryRoute(request, env, ctx, params) {
  const locked = requireWrite(request, env);
  if (locked) return locked;
  let patch;
  try { patch = await request.json(); } catch { return bad("body must be JSON"); }
  const error = validate(patch);
  if (error) return bad(error);
  try {
    return Response.json(await db.saveEntry(env.DB, params.slug, patch));
  } catch (e) {
    return Response.json({ error: String(e.message) }, { status: 404 });
  }
}

export async function createEntryRoute(request, env) {
  const locked = requireWrite(request, env);
  if (locked) return locked;
  let body;
  try { body = await request.json(); } catch { return bad("body must be JSON"); }
  if (!String(body.name ?? "").trim()) return bad("name is required");
  if (!Number.isInteger(body.categoryId)) return bad("categoryId is required");
  return Response.json(await db.createEntry(env.DB, {
    name: String(body.name).trim(), categoryId: body.categoryId,
  }));
}

export async function listRevisionsRoute(request, env, ctx, params) {
  const entry = await db.getEntryBySlug(env.DB, params.slug);
  if (!entry) return new Response("Not found", { status: 404 });
  return Response.json(await db.listRevisions(env.DB, entry.id));
}

export async function restoreRoute(request, env, ctx, params) {
  const locked = requireWrite(request, env);
  if (locked) return locked;
  try {
    return Response.json(await db.restoreRevision(env.DB, Number(params.id)));
  } catch (e) {
    return Response.json({ error: String(e.message) }, { status: 404 });
  }
}
```

Register:
```js
{ method: "POST", pattern: "/api/entries", handler: createEntryRoute },
{ method: "POST", pattern: "/api/entries/:slug", handler: saveEntryRoute },
{ method: "GET",  pattern: "/api/revisions/:slug", handler: listRevisionsRoute },
{ method: "POST", pattern: "/api/revisions/:id/restore", handler: restoreRoute },
```

- [ ] **Step 5: Implement `src/render/edit.js` and `src/render/history.js`**

`edit.js` renders a `<form>` with `name`, `aliases` (comma separated), `definition`, `notes`, `tier` (select), `controls_schema` (textarea of pretty JSON) and `templates` (textarea of pretty JSON), plus a "New entry" form with a name field and a category select. `public/js/edit.js` submits it as JSON to `/api/entries/:slug`, shows the returned `error` inline on a 400 without clearing the textareas, and validates JSON on `blur`:

```js
const form = document.querySelector("form.edit");
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  let payload;
  try {
    payload = {
      name: data.get("name"),
      aliases: String(data.get("aliases")).split(",").map((s) => s.trim()).filter(Boolean),
      definition: data.get("definition"),
      notes: data.get("notes"),
      tier: data.get("tier"),
      controls_schema: JSON.parse(data.get("controls_schema") || "[]"),
      templates: JSON.parse(data.get("templates") || "{}"),
    };
  } catch (err) {
    return showError(`That JSON will not parse: ${err.message}`);
  }
  const res = await fetch(form.action, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) location.href = form.dataset.after;
  else showError((await res.json()).error);
});

function showError(message) {
  const box = document.querySelector(".edit__error");
  box.textContent = message;
  box.hidden = false;
}

for (const field of document.querySelectorAll("textarea[data-json]")) {
  field.addEventListener("blur", () => {
    try {
      field.value = JSON.stringify(JSON.parse(field.value || "{}"), null, 2);
      field.setCustomValidity("");
    } catch (err) {
      field.setCustomValidity(err.message);
      field.reportValidity();
    }
  });
}
```

`history.js` renders a list of revisions with `changed_at`, the summary, and a Restore button posting to `/api/revisions/:id/restore`.

- [ ] **Step 6: Run to verify the tests pass**

Run: `npx vitest run tests/edit.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 7: Commit and push**

```bash
git add src/render/edit.js src/render/history.js src/api/entries.js src/auth.js public/js/edit.js src/worker.js tests/edit.test.js
git commit -m "feat: edit view, new entries, revision history and restore"
git push
```

---

## Task 13: Export, import and the nightly backup

**Files:**
- Create: `src/api/export.js`, `src/api/import.js`
- Modify: `src/worker.js` (routes plus the `scheduled` handler), `wrangler.toml` (R2 binding, cron trigger)
- Test: `tests/export.test.js`

**Interfaces:**
- Consumes: `listCategories`, `listEntries`, `getEntryBySlug` (Task 5); `parseGlossary`, `mergeEntries` (Task 3) for the round-trip test.
- Produces: `exportJson(db)`, `exportMarkdown(db)`, `exportEntryHtml(entry)`, `importJson(db, payload)`.

- [ ] **Step 1: Add the R2 binding and cron to `wrangler.toml`**

```toml
[[r2_buckets]]
binding = "BACKUPS"
bucket_name = "compendium-backups"

[triggers]
crons = ["0 3 * * *"]
```

Run `npx wrangler r2 bucket create compendium-backups`.

- [ ] **Step 2: Write the failing export tests**

Create `tests/export.test.js`:

```js
import { env, SELF, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import { parseGlossary } from "../src/seed/parse.js";
import worker from "../src/worker.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

describe("GET /api/export.json", () => {
  it("exports every category and entry", async () => {
    const body = await (await SELF.fetch("https://example.com/api/export.json")).json();
    expect(body.categories).toHaveLength(45);
    expect(body.entries).toHaveLength(918);
    expect(body.entries[0]).toHaveProperty("slug");
    expect(body.entries[0]).toHaveProperty("templates");
  });
});

describe("GET /api/export.md", () => {
  it("re-imports cleanly with no data loss", async () => {
    const md = await (await SELF.fetch("https://example.com/api/export.md")).text();
    // Parsed with the SAME parser the seeder uses — that is what makes this
    // a real round-trip rather than a test of a bespoke reader.
    const reparsed = parseGlossary(md);
    expect(reparsed.categories).toHaveLength(45);
    const total = reparsed.categories.reduce((n, c) => n + c.rows.length, 0);
    expect(total).toBe(918);   // one row per entry, under its primary category
    const names = reparsed.categories.flatMap((c) => c.rows.map((r) => r.term));
    expect(new Set(names).size).toBe(918);
    expect(names).toContain("Toast");
    expect(names).toContain("Master/Detail");
  });

  it("escapes pipe characters so tables stay well formed", async () => {
    const md = await (await SELF.fetch("https://example.com/api/export.md")).text();
    for (const line of md.split("\n").filter((l) => l.startsWith("|"))) {
      expect(line.split(/(?<!\\)\|/).length).toBe(4); // leading, term, def, trailing
    }
  });
});

describe("GET /e/:slug/export.html", () => {
  it("returns a self-contained document with no external requests", async () => {
    const res = await SELF.fetch("https://example.com/e/toast/export.html");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<!doctype html>");
    expect(body).not.toMatch(/<(script|link|img)[^>]+(src|href)="https?:/);
  });
});

describe("scheduled backup", () => {
  it("writes a dated object to R2 and prunes beyond 30", async () => {
    for (let d = 1; d <= 32; d++) {
      await env.BACKUPS.put(`backups/2026-01-${String(d).padStart(2, "0")}.json`, "{}");
    }
    const ctx = createExecutionContext();
    await worker.scheduled({ scheduledTime: Date.parse("2026-08-18T03:00:00Z") }, env, ctx);
    await waitOnExecutionContext(ctx);
    const listed = await env.BACKUPS.list({ prefix: "backups/" });
    expect(listed.objects.length).toBeLessThanOrEqual(30);
    expect(listed.objects.some((o) => o.key === "backups/2026-08-18.json")).toBe(true);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/export.test.js`
Expected: FAIL — routes and `scheduled` handler missing.

- [ ] **Step 4: Implement `src/api/export.js`**

```js
import * as db from "../db.js";
import { render, defaultsFor } from "../../public/js/template.js";

export async function exportJson(dbc) {
  const categories = await db.listCategories(dbc);
  const summaries = await db.listEntries(dbc, { limit: 10000 });
  const entries = [];
  for (const s of summaries) {
    entries.push(await db.getEntryBySlug(dbc, s.slug));
  }
  return { version: 1, exported_at: new Date().toISOString(), categories, entries };
}

// A cell may not contain a bare pipe or the table breaks. Escaping keeps the
// markdown round-trip lossless.
function cell(text) {
  return String(text ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export async function exportMarkdown(dbc) {
  const { categories, entries } = await exportJson(dbc);
  const byCategory = new Map(categories.map((c) => [c.id, []]));
  for (const e of entries) {
    const primary = e.categories.find((c) => c.is_primary);
    byCategory.get(primary.id)?.push(e);
  }
  const parts = ["# UI Element Compendium", ""];
  categories.forEach((c, i) => {
    const rows = (byCategory.get(c.id) ?? []).sort((a, b) => a.catalogue_no - b.catalogue_no);
    if (!rows.length) return;
    parts.push(`# ${i + 1}. ${c.name}`, "", "| Term | Definition |", "|---|---|");
    for (const e of rows) parts.push(`| ${cell(e.name)} | ${cell(e.definition)} |`);
    parts.push("", "---", "");
  });
  return parts.join("\n");
}

export function exportEntryHtml(entry) {
  const values = defaultsFor(entry.controls_schema);
  const example = entry.templates.html ? render(entry.templates.html, values).output : "";
  const code = Object.entries(entry.templates)
    .map(([format, tpl]) => `<h2>${format}</h2><pre><code>${escapeHtml(
      render(tpl, values).output)}</code></pre>`).join("");
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<title>${escapeHtml(entry.name)} — UI Element Compendium</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 60rem; margin: 3rem auto; padding: 0 1rem; }
  .stage { display: grid; place-items: center; padding: 3rem; border-radius: 14px;
    background: linear-gradient(135deg, #A8E6C1, #BFD9F2, #D9C8F0, #F5C2E0); }
  pre { background: #241430; color: #F3ECF7; padding: 1rem; overflow-x: auto; border-radius: 8px; }
</style></head>
<body>
<h1>${escapeHtml(entry.name)}</h1>
<p>${escapeHtml(entry.definition)}</p>
<div class="stage">${example}</div>
${code}
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
```

- [ ] **Step 5: Implement `src/api/import.js`**

```js
import { requireWrite } from "../auth.js";

export async function importJson(request, env) {
  const locked = requireWrite(request, env);
  if (locked) return locked;
  let payload;
  try { payload = await request.json(); } catch { return Response.json({ error: "body must be JSON" }, { status: 400 }); }
  if (!Array.isArray(payload.entries) || !Array.isArray(payload.categories)) {
    return Response.json({ error: "payload needs categories and entries arrays" }, { status: 400 });
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
```

- [ ] **Step 6: Add the `scheduled` handler to `src/worker.js`**

```js
export default {
  async fetch(request, env, ctx) { /* as before */ },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(backup(event, env));
  },
};

async function backup(event, env) {
  const data = await exportJson(env.DB);
  const date = new Date(event.scheduledTime).toISOString().slice(0, 10);
  await env.BACKUPS.put(`backups/${date}.json`, JSON.stringify(data));

  // Keep the most recent 30. Keys are dated, so lexical order is chronological.
  const listed = await env.BACKUPS.list({ prefix: "backups/" });
  const keys = listed.objects.map((o) => o.key).sort();
  const excess = keys.slice(0, Math.max(0, keys.length - 30));
  for (const key of excess) await env.BACKUPS.delete(key);
}
```

Register the export routes, including `GET /e/:slug/export.html` and `POST /api/import`.

- [ ] **Step 7: Run to verify the tests pass**

Run: `npx vitest run tests/export.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 8: Commit and push**

```bash
git add src/api/export.js src/api/import.js src/worker.js wrangler.toml tests/export.test.js
git commit -m "feat: JSON/markdown/standalone export, import and nightly R2 backup"
git push
```

---

## Task 14: Author ten core examples

The tweak system is unproven until real entries use it. Ten entries from the core tier, each with a controls schema and all three templates.

**Files:**
- Create: `examples/button.json`, `card.json`, `modal.json`, `toast.json`, `tab-bar.json`, `badge.json`, `text-input.json`, `select.json`, `accordion.json`, `table.json`
- Modify: `src/seed/run.js` (load examples after seeding)
- Test: `tests/examples.test.js`

**Interfaces:**
- Consumes: `saveEntry` (Task 5), the control types from Task 6.
- Produces: ten entries with `has_example = 1`. Each JSON file is `{slug, controls_schema, templates}`.

- [ ] **Step 1: Write `examples/button.json` as the pattern for the rest**

```json
{
  "slug": "button",
  "controls_schema": [
    { "id": "label", "type": "text", "label": "Label", "default": "Save changes" },
    { "id": "variant", "type": "select", "label": "Variant", "default": "primary",
      "options": ["primary", "secondary", "ghost"] },
    { "id": "bg", "type": "color", "label": "Background", "default": "#241430",
      "presets": ["#241430", "#A8E6C1", "#F5C2E0", "#BFD9F2", "#D9C8F0", "#E8A020"] },
    { "id": "radius", "type": "number", "label": "Corner radius", "default": 10,
      "min": 0, "max": 24, "step": 1 },
    { "id": "disabled", "type": "toggle", "label": "Disabled", "default": false }
  ],
  "templates": {
    "html": "<button class=\"btn btn--{{variant}}\"{{#if disabled}} disabled{{/if}}>{{label}}</button>\n<style>\n.btn {\n  font: 500 16px/1 system-ui, sans-serif;\n  padding: 12px 20px;\n  border-radius: {{radius}}px;\n  border: 2px solid {{bg}};\n  background: {{bg}};\n  color: #FAF7F2;\n  cursor: pointer;\n}\n.btn--secondary { background: transparent; color: {{bg}}; }\n.btn--ghost { background: transparent; border-color: transparent; color: {{bg}}; }\n.btn[disabled] { opacity: .45; cursor: not-allowed; }\n</style>",
    "tailwind": "<button class=\"px-5 py-3 text-base font-medium text-[#FAF7F2] border-2 disabled:opacity-45 disabled:cursor-not-allowed\" style=\"border-radius:{{radius}}px;background:{{bg}};border-color:{{bg}}\"{{#if disabled}} disabled{{/if}}>{{label}}</button>",
    "react": "export function Button({\n  label = \"{{label}}\",\n  variant = \"{{variant}}\",\n  disabled = {{disabled}},\n}) {\n  const base = {\n    padding: \"12px 20px\",\n    borderRadius: {{radius}},\n    border: \"2px solid {{bg}}\",\n    background: variant === \"primary\" ? \"{{bg}}\" : \"transparent\",\n    color: variant === \"primary\" ? \"#FAF7F2\" : \"{{bg}}\",\n    cursor: disabled ? \"not-allowed\" : \"pointer\",\n    opacity: disabled ? 0.45 : 1,\n  };\n  return <button style={base} disabled={disabled}>{label}</button>;\n}"
  }
}
```

- [ ] **Step 2: Write the remaining nine**

`card.json`, `modal.json`, `toast.json`, `tab-bar.json`, `badge.json`, `text-input.json`, `select.json`, `accordion.json`, `table.json`. Each follows the same shape: a `text` control for the main copy, a `select` for variant where meaningful, a `color`, a `number`, and a `toggle` for a state. All three templates must use the same control ids so the tabs agree.

- [ ] **Step 3: Load them in `src/seed/run.js`**

```js
import buttonExample from "../../examples/button.json";
// ...the other nine
const EXAMPLES = [buttonExample, /* ... */];

export async function loadExamples(db) {
  const { saveEntry } = await import("../db.js");
  let loaded = 0;
  for (const ex of EXAMPLES) {
    await saveEntry(db, ex.slug, {
      controls_schema: ex.controls_schema,
      templates: ex.templates,
    });
    loaded++;
  }
  return loaded;
}
```

Call it from the seed route after `seed()` returns.

- [ ] **Step 4: Write and run the example tests**

Create `tests/examples.test.js`:

```js
import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed, loadExamples } from "../src/seed/run.js";
import * as db from "../src/db.js";
import { render, defaultsFor } from "../public/js/template.js";
import source from "../web-development-ui-glossary-complete.md?raw";

const SLUGS = ["button", "card", "modal", "toast", "tab-bar", "badge",
               "text-input", "select", "accordion", "table"];

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
  await loadExamples(env.DB);
});

describe.each(SLUGS)("example: %s", (slug) => {
  it("is marked as having an example", async () => {
    expect((await db.getEntryBySlug(env.DB, slug)).has_example).toBe(1);
  });

  it("renders every template with no unknown placeholders", async () => {
    const entry = await db.getEntryBySlug(env.DB, slug);
    const values = defaultsFor(entry.controls_schema);
    for (const [format, tpl] of Object.entries(entry.templates)) {
      const { warnings } = render(tpl, values);
      expect({ format, warnings }).toEqual({ format, warnings: [] });
    }
  });

  it("uses the same control ids in every format", async () => {
    const entry = await db.getEntryBySlug(env.DB, slug);
    const ids = entry.controls_schema.map((c) => c.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const tpl of Object.values(entry.templates)) {
      const used = [...tpl.matchAll(/\{\{[#/]?(?:if |unless )?\s*([\w-]+)\s*\}?\}\}/g)]
        .map((m) => m[1]).filter((id) => !["if", "unless"].includes(id));
      for (const id of used) expect(ids).toContain(id);
    }
  });
});

describe("colour changes reach every format", () => {
  it("puts a new hex into all three tabs", async () => {
    const entry = await db.getEntryBySlug(env.DB, "button");
    const values = { ...defaultsFor(entry.controls_schema), bg: "#E8A020" };
    for (const tpl of Object.values(entry.templates)) {
      expect(render(tpl, values).output).toContain("#E8A020");
    }
  });
});
```

Run: `npx vitest run tests/examples.test.js`
Expected: PASS, 31 tests.

- [ ] **Step 5: Commit and push**

```bash
git add examples/ src/seed/run.js tests/examples.test.js
git commit -m "feat: ten authored core examples proving the tweak system"
git push
```

---

## Task 15: Responsive, accessibility and reduced-motion pass

**Files:**
- Modify: `public/css/app.css`, `src/render/*.js`
- Create: `tests/e2e/acceptance.spec.js`, `playwright.config.js`
- Test: the eight acceptance checks from spec section 12

**Interfaces:**
- Consumes: every page from Tasks 8-14.
- Produces: no new modules; this task hardens what exists.

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test && npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.js`**

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:8787" },
  webServer: {
    command: "npx wrangler dev --port 8787",
    url: "http://127.0.0.1:8787/healthz",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 3: Write the acceptance spec — one test per spec section 12 check**

Create `tests/e2e/acceptance.spec.js`:

```js
import { test, expect } from "@playwright/test";

test("searching toast finds it and the page has definition, example, tweaks and a code tab", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Meta+k");
  await page.keyboard.type("toast");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/e\/toast/);
  await expect(page.locator(".entry__def")).not.toBeEmpty();
  await expect(page.locator("iframe.stage")).toBeVisible();
  await expect(page.locator(".tweaks__controls .ctl")).not.toHaveCount(0);
  await expect(page.getByRole("tab", { name: "HTML + CSS" })).toBeVisible();
});

test("changing a colour updates the example and every code tab", async ({ page }) => {
  await page.goto("/e/button");
  await page.locator('.swatch[data-value="#E8A020"]').click();
  for (const tab of ["HTML + CSS", "Tailwind CSS", "React"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.locator('.code__panel:not([hidden]) code')).toContainText("#E8A020");
  }
  const frame = page.frameLocator("iframe.stage");
  await expect(frame.locator("button")).toHaveCSS("background-color", "rgb(232, 160, 32)");
});

test("editing then restoring returns the original definition", async ({ page }) => {
  await page.goto("/e/card");
  const original = await page.locator(".entry__def").textContent();
  await page.goto("/e/card/edit");
  await page.fill('[name="definition"]', "Temporarily wrong.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".entry__def")).toHaveText("Temporarily wrong.");
  await page.goto("/e/card/history");
  await page.getByRole("button", { name: "Restore" }).first().click();
  await page.goto("/e/card");
  await expect(page.locator(".entry__def")).toHaveText(original.trim());
});

test("the site is usable one-handed on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // No horizontal scroll: the commonest one-handed failure.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.goto("/e/button");
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  // Every control is a comfortable touch target.
  for (const ctl of await page.locator(".tweaks__controls input, .tweaks__controls select").all()) {
    const box = await ctl.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
});

test("Cmd+K navigates without the mouse from any page", async ({ page }) => {
  await page.goto("/e/affordance");
  await page.keyboard.press("Meta+k");
  await page.keyboard.type("modal");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/e\/modal/);
});

test("the Button plate shows its gradient, reference and stamp in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"]) {
    await page.goto("/e/button");
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await expect(page.locator(".catalogue-ref")).toHaveText(/BTN-\d{3}/);
    await expect(page.locator(".plate__stamp")).toHaveText("Buttons & Actions");
    const gradient = await page.locator(".plate").evaluate((el) =>
      getComputedStyle(el, "::before").backgroundImage);
    expect(gradient).toContain("radial-gradient");
    await expect(page.locator(".plate")).toBeVisible();
  }
});

test("escape closes the palette and returns focus", async ({ page }) => {
  await page.goto("/");
  await page.locator("#q").focus();
  const before = await page.evaluate(() => document.activeElement.id);
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.querySelector(".masthead__title").focus());
  await page.keyboard.press("Meta+k");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.activeElement.className)).toContain("masthead__title");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("plays no animation anywhere", async ({ page }) => {
    for (const path of ["/", "/e/button", "/e/button/edit"]) {
      await page.goto(path);
      const moving = await page.evaluate(() =>
        [...document.querySelectorAll("*")].filter((el) => {
          const s = getComputedStyle(el);
          const dur = (v) => v.split(",").some((d) => parseFloat(d) > 0);
          return dur(s.transitionDuration) || dur(s.animationDuration);
        }).length);
      expect({ path, moving }).toEqual({ path, moving: 0 });
    }
  });
});
```

- [ ] **Step 4: Run the acceptance suite and fix what fails**

Run: `npx playwright test`
Expected: 8 tests pass. Typical fixes: raising touch-target heights to 44px, moving a stray `transition` inside the reduced-motion block, adding `overflow-x: auto` to the code block and the category strip.

- [ ] **Step 5: Add the responsive rules**

```css
.browse { display: grid; grid-template-columns: minmax(0, 16rem) minmax(0, 1fr); gap: var(--space-5); }
.specimen { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 20rem); gap: var(--space-4); }
.code__panel pre, .grid { overflow-x: auto; }

@media (max-width: 768px) {
  .browse, .specimen { grid-template-columns: minmax(0, 1fr); }
  .browse__nav ul { display: flex; overflow-x: auto; gap: var(--space-2); }
  .tweaks__controls input, .tweaks__controls select { min-height: 44px; }
  .entry__actions a { display: block; padding: var(--space-3) 0; }
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test && npx playwright test`
Expected: every vitest file and all 8 acceptance tests pass.

- [ ] **Step 7: Commit and push**

```bash
git add public/css/app.css src/render/ tests/e2e/ playwright.config.js package.json
git commit -m "feat: responsive layout, accessibility and reduced-motion compliance"
git push
```

---

## Task 16: Deploy to artifacts.clydeford.net

**Files:**
- Modify: `wrangler.toml` (custom domain route)

**Interfaces:**
- Consumes: everything.
- Produces: the live site.

- [ ] **Step 1: Add the custom domain**

```toml
routes = [
  { pattern = "artifacts.clydeford.net", custom_domain = true }
]
```

- [ ] **Step 2: Apply the schema to the remote database**

```bash
npm run db:remote
```

- [ ] **Step 3: Deploy**

```bash
export CLOUDFLARE_API_TOKEN=$(grep '^CLOUDFLARE_API_TOKEN=' .env | cut -d= -f2-)
export CLOUDFLARE_ACCOUNT_ID=$(grep '^CLOUDFLARE_ACCOUNT_ID=' .env | cut -d= -f2-)
npx wrangler deploy
```

- [ ] **Step 4: Seed production**

```bash
curl -s -X POST --data-binary @web-development-ui-glossary-complete.md \n  https://artifacts.clydeford.net/api/seed
```

Expected: `{"categories":45,"entries":918,"core":61,"examples":10}`

- [ ] **Step 5: Verify the live site**

```bash
curl -s https://artifacts.clydeford.net/healthz
curl -s https://artifacts.clydeford.net/api/index.json | head -c 200
curl -s -o /dev/null -w "%{http_code}\n" https://artifacts.clydeford.net/e/button
```

Expected: `ok`, JSON beginning `{"version":`, and `200`. Then open the site and confirm Cmd+K works and the Button plate renders in both themes.

- [ ] **Step 6: Verify the backup cron is registered**

```bash
npx wrangler deployments list
```

Expected: the deployment shows the `0 3 * * *` trigger. Confirm the first backup object appears in R2 the following day.

- [ ] **Step 7: Commit and push**

```bash
git add wrangler.toml
git commit -m "feat: bind artifacts.clydeford.net custom domain"
git push
```

---

## Self-Review

**Spec coverage.** Every section of the design doc maps to a task: architecture and deployment → Tasks 1, 16; data model → Task 2; seeding → Tasks 3, 4; tweak panel → Task 11; templates and the sandboxed example → Tasks 6, 11; search → Task 9; editing, revisions, backup and the auth seam → Tasks 12, 13; export and import → Task 13; visual design → Tasks 7, 15; testing → present in every task plus Task 15; non-goals → enforced by the Global Constraints.

**Source-brief coverage.** Build order steps 1-9 map to Tasks 1-4, 8, 10, 11, 11, 12, 13, 15, 14 respectively. All eight acceptance checks in spec section 12 have a named Playwright test in Task 15.

**Known open items, deliberately deferred, not blockers.**
- Task 14 step 2 specifies the *shape* of the nine remaining example files but not their literal contents. Writing ten complete three-format templates inline would triple this document; `button.json` is given in full as the exemplar and the tests in step 4 mechanically enforce that the other nine match its contract (all placeholders known, control ids shared across formats).
- `src/render/edit.js` and `history.js` are described by their form fields and behaviour rather than given as complete listings, for the same reason; their tests in Task 12 pin the required behaviour.
- The 45 category codes in Task 4 are given in full and are asserted unique by test.
