# Design: UI Element Compendium

**Site:** artifacts.clydeford.net
**Date:** 2026-08-18
**Source spec:** `artifacts-clydeford-spec.md`
**Status:** architecture approved, pending implementation plan

This document resolves the build specification into decisions an implementer
can follow without further input. Where it departs from the source spec, the
departure is flagged and justified.

---

## 1. Architecture

A single Cloudflare Worker renders HTML server-side from D1 and serves the
API. JavaScript loads only where it is needed. No build pipeline, no
framework, no bundler.

```
Browser
  |  GET /                  browse page    (server-rendered)
  |  GET /e/:slug           entry detail   (server-rendered)
  |  GET /e/:slug/edit      edit form      (server-rendered)
  |  GET /e/:slug/history   revisions      (server-rendered)
  |  GET /api/index.json    search index   (cached, ETag)
  |  POST/PUT /api/*        writes         (JSON)
  v
Worker (src/worker.js)
  |-- router.js     path matching, no dependencies
  |-- db.js         every D1 query, one function per operation
  |-- render/       server-side HTML template functions
  |-- template.js   placeholder engine (SHARED with the client)
  |-- seed.js       one-off glossary import
  v
D1 (compendium)  +  R2 (backups)
```

**Why server-rendered.** The first paint is the content, which is what
delivers "no spinners on normal navigation". Heading structure, focus order
and keyboard navigation come out correct by construction rather than being
reconstructed in JavaScript. Reading works with JavaScript disabled.
Cross-entry navigation uses prefetch-on-hover plus CSS view transitions,
closing most of the gap to a single-page app for about twenty lines of code.

**Client islands.** Five standalone ES modules, no shared framework:
`palette.js` (command palette), `tweak.js` (controls, iframe, code tabs),
`theme.js`, `copy.js` (clipboard and stamp animation), `edit.js`. Each page
loads only the islands it uses.

### 1.1 Deployment

`git init` in this directory, remote `github.com/sjohnston1972/artifacts`,
deploy with `wrangler deploy` using the token in `.env`. `.env` is
gitignored; secrets never enter the repo. Custom domain
`artifacts.clydeford.net` bound to the Worker in `wrangler.toml`. Every
completed step is committed and pushed before the next begins.

---

## 2. Data model

### 2.1 Schema

```sql
CREATE TABLE categories (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,   -- 3 letters, for catalogue refs
  sort_order  INTEGER NOT NULL
);

CREATE TABLE entries (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  aliases         TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  definition      TEXT NOT NULL,
  notes           TEXT,
  controls_schema TEXT NOT NULL DEFAULT '[]',   -- JSON array, section 4
  templates       TEXT NOT NULL DEFAULT '{}',   -- JSON object, section 5
  tier            TEXT NOT NULL DEFAULT 'reference',
  has_example     INTEGER NOT NULL DEFAULT 0,
  catalogue_no    INTEGER NOT NULL,             -- position in primary category
  updated_at      TEXT NOT NULL,
  CHECK (tier IN ('core','useful','reference','deleted'))
);

CREATE TABLE entry_categories (
  entry_id    INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  is_primary  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (entry_id, category_id)
);

CREATE TABLE revisions (
  id         INTEGER PRIMARY KEY,
  entry_id   INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  snapshot   TEXT NOT NULL,        -- full JSON of the entry BEFORE the change
  changed_at TEXT NOT NULL
);

CREATE INDEX idx_entries_tier    ON entries(tier);
CREATE INDEX idx_entries_example ON entries(has_example);
CREATE INDEX idx_ec_category     ON entry_categories(category_id);
CREATE INDEX idx_revisions_entry ON revisions(entry_id, changed_at DESC);
```

**Departure from the source spec.** The spec put a single `category_id` on
`entries`. Merging duplicate terms (section 3) means one entry legitimately
belongs to several sections, so category membership moves to a join table.
Exactly one row per entry carries `is_primary = 1`; that is the category
shown in listings and used to build the catalogue reference.

**Derived and immutable fields.**

- `has_example` is recomputed on every save as `templates.html` being
  present and non-empty. It is never set directly by the edit form.
- `slug` is generated from `name` when an entry is created and never
  changes afterwards, including when the entry is renamed, so published
  URLs cannot rot.
- `catalogue_no` for an entry created through the Edit view is one greater
  than the highest existing `catalogue_no` in its primary category, so
  references stay unique and seeded numbering is never disturbed.
- `tier = 'deleted'` is excluded from browse listings, the tier filter, the
  search index and both exports. Such entries remain reachable by direct
  URL and through the History view so they can be restored.

### 2.2 Catalogue references

`catalogue_no` is the entry's 1-based position within its primary category,
assigned at seed time in source order. The reference on the specimen plate
is `{category.code}-{catalogue_no padded to 3}`, e.g. `NAV-014`. Codes are a
fixed hand-assigned table in the seed script rather than derived, so they
stay stable and unique across all 45 categories (`UIF`, `SEM`, `LAY`, `NAV`,
`BTN`, `FRM`, `SEL`, `FBK`, `OVL`, `DAT`, `GRD`, and so on).

---

## 3. Seeding

Source: `web-development-ui-glossary-complete.md`.

### 3.1 Rules

1. **A section becomes a category if and only if it contains a two-column
   term table.** This yields 45 categories from sections 1-38, 43 and 49-54,
   in source order, and automatically excludes the nine guidance sections
   (39, 40, 41, 42, 44, 45, 46, 47, 48) with no hand-maintained skip list.
   Sections 39 and 40 are bullet lists carrying no definitions, so there is
   nothing in them to seed.
2. **Each table row becomes an entry.** 1,001 rows. A table's header row is
   identified structurally as *the row immediately preceding the `|---|---|`
   separator*, not by matching known header text. This matters: the source
   uses four different header labels — `Term` (42 tables), `Element / Term`,
   `Pattern` and `State` — and the last two are also legitimate term names
   elsewhere in the glossary, so text matching would either skip real
   entries or admit two header rows as terms.
3. **Duplicate names merge.** 918 unique names remain after merging 85
   repeats. The first occurrence in source order supplies `name`, `slug`,
   `definition` and the primary category. Each later occurrence appends to
   `notes` as `**{Section name}:** {definition}` and adds a non-primary row
   to `entry_categories`. Nothing is lost: the five distinct senses of
   "State" all survive on one page.
4. **Slugs** are lowercased, non-alphanumerics collapsed to single hyphens,
   then trimmed. Backticked terms from section 2 (`html`, `head`) keep the
   bare word. Any collision after normalisation takes a `-2` suffix and is
   reported by the seed script rather than resolved silently.
5. **No slash-splitting.** *Departure from the source spec:* section 9 asked
   for "Switch / Toggle" style rows to be split into a name plus aliases. No
   such row exists in this source. The only eight rows containing a slash
   are `Master/Detail`, `Date/Time Picker`, `Min/Max Width`,
   `Before/After Slider`, `Ease-In / Ease-Out`, `Enter/Exit Animation` and
   two of the same kind — all single terms, none synonym pairs. Splitting
   would manufacture entries called "Detail" and "Max Width". Terms are
   therefore taken verbatim, and aliases come from a small hand-curated map
   in the seed script (`Switch` to `Toggle`, `Text Input` to `Textbox`, and
   so on, roughly thirty pairs).
6. **All entries seed with `has_example = 0` and `tier = 'reference'`,**
   except the curated core list, which seeds as `tier = 'core'`.

### 3.2 Core tier list

The 61 names in spec section 9, of which 59 match a glossary term exactly.
*Departure:* two do not exist in the source and are remapped —
`Tabs` becomes `Tab Bar` (aliases: Tabs, Tab Set), and `Chart` becomes
`Bar Chart`, since the source carries only specific chart types. The seed
script asserts that every core name resolves to exactly one entry and fails
loudly otherwise, so the list cannot drift silently out of sync.

### 3.3 Running it

`POST /api/seed`, guarded by a check that the entries table is empty, plus
an `npm run seed` path for local development. Idempotent: it refuses to run
twice rather than duplicating content.

---

## 4. The tweak panel

`controls_schema` is a JSON array of control objects:

```json
[
  {"id":"label","type":"text","label":"Label","default":"Click me"},
  {"id":"variant","type":"select","label":"Variant","default":"primary",
   "options":["primary","secondary","ghost"]},
  {"id":"bg","type":"color","label":"Background","default":"#241430",
   "presets":["#241430","#A8E6C1","#F5C2E0","#BFD9F2","#D9C8F0"]},
  {"id":"radius","type":"number","label":"Radius","default":8,
   "min":0,"max":24,"step":1,"unit":"px"},
  {"id":"disabled","type":"toggle","label":"Disabled","default":false}
]
```

Five types only: `text`, `select`, `color`, `number`, `toggle`. Each renders
as a native form input with a real `<label>`, so keyboard and screen-reader
support is inherited rather than built.

**Data flow.** The panel holds one plain object of current values. Any
change updates that object and calls `render(values)`, which rewrites the
iframe's `srcdoc` and rewrites every code tab. Both read the same templates,
so they cannot disagree. Text and number inputs are debounced at 80ms;
select, colour and toggle apply immediately.

**State is throwaway.** Values live in memory and in the URL fragment, so a
tweaked state can be linked, but never in D1. Saving an entry saves its
*defaults*, not the current experiment.

---

## 5. Templates and code generation

`templates` is a JSON object keyed by format:

```json
{
  "html":     "<button class=\"btn\">{{label}}</button><style>...</style>",
  "tailwind": "<button class=\"px-4 py-2 rounded-lg\">{{label}}</button>",
  "react":    "export function Button({ label = \"{{label}}\" }) { ... }"
}
```

A tab appears only for a key that is present and non-empty. `has_example` is
true exactly when `templates.html` exists, because the HTML+CSS template is
what the live example renders — an entry cannot have an example without one.

### 5.1 Placeholder engine

One module, `src/template.js`, imported by both the Worker and the browser.
Deliberately tiny; a full templating language is not needed:

- `{{id}}` — substitute the control value, escaped
- `{{{id}}}` — substitute raw, for values that are markup
- `{{#if id}} ... {{/if}}` and `{{#unless id}} ... {{/unless}}`, for toggles
- an unknown id renders empty and is collected into a warnings array shown
  in the Edit view, so a template typo is visible rather than silent

Escaping is context-aware in one respect: a value landing inside an HTML
attribute is attribute-escaped, a value in text content is text-escaped. The
engine picks by inspecting the character preceding the placeholder.

### 5.2 The live example

The example is the `html` template rendered with the current values and
injected as the `srcdoc` of an iframe carrying `sandbox="allow-scripts"` —
deliberately *without* `allow-same-origin`, which puts the frame in an
opaque origin and makes it incapable of reaching the parent document,
cookies or storage. A small bootstrap inside the frame reports its content
height by `postMessage` so the frame can size itself, and applies the
current theme's background.

This is what makes the acceptance check "changing a colour updates the
example and the copied code" structurally true rather than a property to
keep in sync: the example is not a preview *of* the code, it *is* the code,
executed.

---

## 6. Search

**Index.** `GET /api/index.json` returns one array of
`[id, name, slug, aliases, categoryCode, definitionFirstLine, tier,
hasExample]` for all 918 entries — roughly 100KB raw, 25KB gzipped. Served
with an `ETag` and `Cache-Control: public, max-age=60, must-revalidate`,
invalidated by a version counter bumped on any entry write.

**Client scoring.** Case-insensitive: exact name match, then name prefix,
then name substring, then alias match, then definition substring, with
earlier categories breaking ties. Capped at 20 results. Because the whole
index is resident, a keystroke costs no network round trip, which is what
makes Cmd+K feel instant.

**Command palette.** Opens on `/` or Cmd+K (Ctrl+K on Windows) from any
page, unless focus is already in a text field. Arrows move, Enter
navigates, Esc closes and restores focus to the element that had it.
Implemented as a `role="dialog"` modal with a focus trap and
`aria-activedescendant` on the input pointing at the highlighted row.

**No-JS fallback.** The browse page's search box sits in a
`<form action="/">` that runs a D1 `LIKE` query over name, aliases and
definition server-side.

**Tier filter.** Defaults to core plus useful. *The filter never constrains
search* — the palette and search results always span every tier, per spec.

---

## 7. Editing, revisions and safety

The site is open: no login, no accounts. Mitigations, all built from the
start:

- **Every write creates a revision first.** `db.saveEntry()` reads the
  current row, inserts it into `revisions` as a JSON snapshot, then updates.
  No code path can write an entry without this, because the snapshot happens
  inside the same function as the update.
- **History view** at `/e/:slug/history` lists revisions newest first with a
  change summary and one-click Restore. A restore is itself a write, so it
  creates a revision and is therefore also undoable.
- **Nightly backup.** A Cron Trigger at 03:00 UTC writes the full export
  JSON to R2 as `backups/YYYY-MM-DD.json`, then deletes everything beyond
  the most recent 30 objects.
- **The auth seam.** Every write route passes through one function,
  `requireWrite(request, env)`, which currently returns `null`. Adding a
  shared edit key later means implementing that one function — compare a
  cookie or header against `env.EDIT_KEY` — and changing nothing else. No
  accounts, no sessions, no user table.
- **Delete is soft**: the entry moves to the `deleted` tier rather than
  losing its row, so it stays restorable.

The edit form edits `controls_schema` and `templates` as JSON in a textarea,
validated on blur and on submit; invalid JSON is rejected with the parse
error inline and the input preserved. A structured schema-builder UI is
explicitly out of scope — YAGNI for a single author.

---

## 8. Export and import

- `GET /api/export.json` — every entry, category and alias, full fidelity.
  This is also what the nightly backup writes.
- `GET /api/export.md` — markdown reproducing the source format: one `#`
  heading per category in `sort_order`, one two-column table beneath. An
  entry with several categories appears under its primary one only, so the
  round trip is stable.
- `GET /e/:slug/export.html` — one standalone file containing the rendered
  example, its code and the definition, styles inlined, no external
  requests.
- `POST /api/import` accepts the JSON form and replaces content
  transactionally, taking a full revision set first.

The acceptance check "exported markdown re-imports cleanly" is verified by a
test that seeds, exports markdown, re-parses it with *the same parser the
seeder uses*, and asserts the entry set matches on name, definition and
category.

---

## 9. Visual design

Follows section 10 of the source spec, which is directive rather than
advisory.

**Tokens.** Palette, type scale and spacing live in one `tokens.css` as
custom properties, defined for light on `:root` and overridden in a
`[data-theme="dark"]` block plus a `prefers-color-scheme: dark` query, so
system preference works before any JavaScript runs. The chosen theme
persists in `localStorage` and is applied by an inline head script to avoid
a flash.

**Fonts.** Bricolage Grotesque, Instrument Sans and JetBrains Mono are
self-hosted as woff2 subsets under `/public/fonts` with `font-display: swap`.
Self-hosting rather than a CDN keeps the "no tracking" promise literal.

**The specimen plate.** A rounded card holding the example iframe. Its
background is a layered `radial-gradient` mesh in mint, blush, sky and
lavender. Each category leans toward one of the four via a hue assigned by
`category.id % 4`, exposed as `--plate-lean`. The catalogue reference sits
top-left in mono, the category stamp top-right. In dark mode the mesh drops
to about 30% opacity over `ink-raised`, so it reads as a lit surface rather
than a glowing one. Gold appears only on the active nav state, the copy
confirmation, and the core-tier marker.

**Motion.** Every transition is under 250ms, and all of it sits inside
`@media (prefers-reduced-motion: no-preference)`. Reduced motion is then the
*absence* of an opt-in rather than an override to remember, so the
acceptance check "no animation plays anywhere" holds by construction.

**Responsive.** Single column under 768px, the tweak panel collapsing
beneath the plate and the category list becoming a horizontally scrolling
strip. Touch targets at least 44px. Primary actions within thumb reach.

---

## 10. Testing

`vitest` with `@cloudflare/vitest-pool-workers`, running tests inside
`workerd` against a real local D1 — the database is not mocked.

| Area | What is tested |
|---|---|
| Seed parser | 45 categories; 1,001 rows; 918 entries; the merge behaviour for "State"; every core name resolves; no slash-split damage |
| Template engine | substitution, escaping, attribute context, conditionals, unknown-id warnings |
| Code generation | one control change alters all three format outputs consistently |
| Revisions | a save creates a revision; restore returns the prior text; a restore is itself undoable |
| Export round trip | markdown export re-imports to an identical entry set |
| Routes | every route's status, content type and cache headers |

The eight acceptance checks in spec section 12 are covered by an end-to-end
file driven with Playwright against `wrangler dev`, including the Cmd+K path
and the reduced-motion assertion.

---

## 11. Explicit non-goals

No accounts, roles or teams. No analytics, cookies or tracking. No published
package. No CMS. No comments. No bundler, transpiler or CSS framework. No
structured control-schema builder UI. No server-side rendering of the
example itself — examples render only inside the sandboxed frame.
