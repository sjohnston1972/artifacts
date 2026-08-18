# Build Specification: UI Element Compendium
**Site:** artifacts.clydeford.net
**Platform:** Cloudflare (Workers + D1)
**Builder:** Claude Code
**Owner:** Steven

---

## 1. What this is

A personal, online, searchable glossary of UI elements. Every entry combines four things:

1. A plain-English definition of the element
2. A live rendered example of the element, visible on the page
3. A tweak panel of controls that change the example in real time (colour, size, variant, text, and so on)
4. Copyable code for the element in multiple formats, regenerated to match whatever the tweak panel currently shows

The purpose is practical: when building websites, the owner looks up an element, adjusts it until it looks right, and copies working code straight into his project.

## 2. What this is not

- Not a component library published as a package
- Not a multi-user product with accounts, teams, or roles
- Not a blog or documentation site
- No analytics, no cookies, no tracking

Keep the build boring and dependable. Prefer the simplest implementation that meets this spec.

## 3. Architecture

- **Hosting:** a single Cloudflare Worker serving static assets, with API routes under `/api/*`
- **Database:** Cloudflare D1 (SQLite) storing all glossary content
- **Frontend:** plain HTML, CSS, and vanilla JavaScript, or a very light framework if genuinely needed. No heavy build pipeline unless it earns its keep
- **Live examples:** rendered inside a sandboxed `<iframe>` so example CSS and JS can never break the main site
- **Domain:** artifacts.clydeford.net via a Cloudflare custom domain on the Worker

## 4. Data model

### entries
| Field | Notes |
|---|---|
| id | unique id |
| name | e.g. "Toggle Button" |
| slug | e.g. "toggle-button", used in URLs |
| aliases | alternative names, e.g. "Switch" |
| category_id | link to categories |
| definition | plain-English meaning |
| notes | optional longer guidance, when to use it, pitfalls |
| controls_schema | JSON describing the tweak panel for this entry (see section 6) |
| templates | JSON holding one code template per format (see section 7) |
| tier | one of: core, useful, reference. Controls prominence in browsing (see section 9) |
| has_example | flag; entries can exist as definition-only until an example is written |
| updated_at | timestamp |

### categories
id, name, slug, sort_order. Seeded from the 23 sections of the source glossary.

### revisions
id, entry_id, snapshot (full JSON of the entry before the change), changed_at.
Every save writes a revision first. Any entry can be restored to a previous revision from the UI. This is the safety net for open editing.

## 5. Pages

### Browse (home)
- Category list down one side, entries in the main area
- Instant search box, always visible, filtering as you type across name, aliases, and definition text
- Each result shows name, category, and the first line of the definition
- A tier filter (core / useful / reference / all) defaults to showing core and useful entries; search always looks across everything regardless of the filter
- Entries without examples yet show a small "definition only" badge

### Entry detail
- Definition and notes at the top
- Live example in the centre, rendered in the sandboxed iframe
- Tweak panel beside or below the example (responsive)
- Code area with one tab per format, a copy button per tab, and a download button
- The code shown always reflects the current tweak panel state
- Light and dark preview toggle for the example background

### Edit
- Every entry has an Edit view: definition, notes, aliases, category, controls schema, and code templates are all editable in the browser
- A "new entry" action creates a blank entry in a chosen category
- Saving writes a revision. A History view lists revisions with one-click restore

### Import and export
- One-off seed import from the provided glossary markdown (see section 9)
- Export the whole glossary as JSON (full fidelity) and as markdown (tables of term and meaning, matching the original source format)
- Export a single entry as a standalone HTML file containing the example and its code

## 6. The tweak panel

Each entry defines its own controls in `controls_schema`. Supported control types:

- **text**: free text (e.g. button label)
- **select**: pick one from fixed options (e.g. variant: primary, secondary, ghost)
- **color**: colour picker with a small set of preset swatches plus custom
- **number**: numeric with min, max, step (e.g. border radius 0 to 24)
- **toggle**: on or off (e.g. disabled state, icon shown)

Changing any control updates the live example immediately and regenerates the code in every format tab. No save needed to experiment; tweaks are throwaway until the owner copies the code.

Model to imitate: the "controls" panel in Storybook. Aim for that experience in miniature.

## 7. Code formats

Each entry carries a template per format, with placeholders filled from the current control values:

1. **HTML + CSS** (self-contained, no dependencies)
2. **Tailwind CSS** (single HTML snippet using Tailwind utility classes)
3. **React** (single functional component, props matching the controls)

Templates use a simple placeholder syntax such as `{{label}}` and `{{radius}}`. The same control values feed all three formats so the tabs always agree with each other and with the live example.

Not every entry needs all three formats on day one. Tabs only appear for formats the entry actually has.

## 8. Editing and safety

- Per the owner's decision, the site is fully open: anyone can view and edit, no login
- Mitigations that must be built in from the start:
  - every save creates a revision (section 4), restorable from the UI
  - a nightly export of the full glossary JSON to an R2 bucket or similar, keeping the last 30 copies
- Leave a clean seam for adding a single shared edit key later (one `if` check on write routes). Do not build accounts or auth beyond that seam

## 9. Seed content

Seed the database from the provided file `web-development-ui-glossary-complete.md` (54 numbered sections, roughly 1,000 terms):

- Each numbered section containing a term table becomes a category, keeping the source order
- Each table row becomes an entry: Term becomes name, Definition becomes definition
- Sections that are guidance rather than term tables (naming conventions, variants examples, state model, specification format, hierarchy diagrams, core principle, vocabulary map) are not seeded as entries; skip them
- All seeded entries start as definition-only (`has_example = false`)
- Where the source lists obvious synonyms in one row (e.g. "Switch / Toggle"), the first becomes the name and the rest become aliases
- Every entry seeds with `tier = reference`, except a curated core list which seeds as `tier = core`: Button, Icon Button, Button Group, Text Input, Textarea, Select, Combobox, Checkbox, Radio Group, Switch, Slider, Date Picker, File Upload, Form Group, Validation Message, Card, Badge, Chip, Tag, Avatar, Alert, Banner, Toast, Progress Bar, Spinner, Skeleton, Empty State, Modal, Dialog, Drawer, Popover, Tooltip, Dropdown Menu, Context Menu, Command Palette, Tabs, Breadcrumb, Pagination, Sidebar, Topbar, Table, Data Grid, List, Accordion, Kanban Board, Timeline, KPI Card, Chart, Hero Section, Pricing Table, Testimonial, FAQ Accordion, Feature Grid, Newsletter Signup, Contact Section, Cookie Consent Banner, Carousel, Image Gallery, Lightbox, Video Player, Map Embed
- Tier is freely editable afterwards from the Edit view; the curated list is a starting point, not a rule

After seeding, examples are added gradually through the Edit view. The Browse page should make it easy to see which entries still need examples (filter: "definition only"), and the core tier is where examples get authored first.

## 10. Design brief

The site should feel beautiful, rich, and delightful to use, not like a grey admin dashboard. This section is the design direction; follow it rather than inventing a generic look.

### Concept: the specimen catalogue

Every UI element is presented like a precision-made part in a collector's catalogue. Each entry is a "specimen": mounted, labelled, and lit. The interface around the specimens stays quiet and disciplined so the elements themselves are the stars.

### Palette

| Token | Hex | Use |
|---|---|---|
| ink | #241430 | dark mode base, deep aubergine, not pure black |
| ink-raised | #322044 | dark mode cards and panels |
| paper | #FAF7F2 | light mode base, warm off-white |
| mint | #A8E6C1 | aurora accent |
| blush | #F5C2E0 | aurora accent |
| sky | #BFD9F2 | aurora accent |
| lavender | #D9C8F0 | aurora accent |
| gold | #E8A020 | rare highlight: active states, the catalogue crown moments |

The four aurora pastels are never used as flat fills. They appear only as soft mesh-gradient washes (see signature element) and as subtle category tinting. Gold is used sparingly enough that seeing it feels special.

### Typography

- **Display:** Bricolage Grotesque, for entry names, category headings, and the hero. Confident and characterful; use its personality at large sizes only
- **Body:** Instrument Sans, for definitions, notes, and UI labels
- **Code:** JetBrains Mono, for all snippets and the catalogue reference labels

Set a deliberate type scale. Entry names on detail pages should be genuinely large. Definitions read like well-set book text, not UI copy.

### Signature element: the specimen plate

The live example on each entry page sits on a "plate": a rounded card whose background is a soft aurora mesh gradient blending mint, blush, sky, and lavender, with gentle grain-free transitions. On the plate:

- a catalogue reference in the corner, set in mono, built from category and entry number, e.g. `NAV-014` or `FRM-023`
- a small category stamp
- the element itself centred and given generous room

Each category leans its plate gradient toward one of the four pastels, so navigation entries feel subtly different from form entries. This is the one memorable, expressive moment of the design; everything else defers to it.

### Delight, deliberately placed

- Search is a command palette: press `/` or Cmd+K anywhere, type, arrow, enter. Instant, keyboard-first, beautiful
- Copying code responds with a brief stamp animation and a "Copied" confirmation on the button itself
- Adjusting a tweak control re-renders the example with a soft, fast shimmer, so cause and effect feel connected
- Cards lift gently on hover; nothing bounces or wobbles
- Skeleton loaders are shaped like the content they precede
- Empty states give direction with charm, e.g. the definition-only filter when everything has examples: "Every specimen is mounted. Nothing left to catalogue."
- All motion is fast (under 250ms), purposeful, and fully disabled when the visitor's device requests reduced motion

### Discipline

- Spend boldness only on the specimen plates; the surrounding chrome is quiet, spacious, and consistent
- Fully responsive; must be comfortable and one-handed on a phone
- Dark and light theme, remembered per browser; the specimen plates work in both
- Fast: browse and search feel instant, no spinners on normal navigation
- Accessible: keyboard navigable end to end, visible focus states, sensible heading structure, WCAG AA contrast in both themes

## 11. Build order

1. Worker + D1 schema + seed import from the glossary markdown
2. Browse page with search and categories
3. Entry detail page rendering definition-only entries
4. Live example iframe + code tabs + copy for entries with templates
5. Tweak panel wired to example and code generation
6. Edit view, new entry, revisions and restore
7. Export (JSON, markdown, single-entry HTML) and nightly backup
8. Polish: themes, responsive layout, accessibility pass
9. Author examples for an initial set of about 10 high-value core-tier entries (Button, Card, Modal, Toast, Tabs, Badge, Input, Select, Accordion, Table) to prove the tweak system end to end

## 12. Acceptance checks

- Searching "toast" finds Toast instantly and the entry page shows definition, live example, tweak panel, and at least the HTML + CSS tab
- Changing a colour control visibly updates the example and the copied code contains the new colour in every format tab
- Editing a definition, saving, then restoring the previous revision returns the original text
- Exported markdown re-imports cleanly with no data loss
- The site is usable one-handed on a phone
- Cmd+K opens the command palette from any page and navigates to an entry without touching the mouse
- The entry page for Button shows the specimen plate with its aurora gradient, catalogue reference, and category stamp in both light and dark themes
- With reduced motion enabled at system level, no animation plays anywhere
