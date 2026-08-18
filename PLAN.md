# Run Plan: UI Element Compendium — full build

**Goal:** Build and deploy artifacts.clydeford.net: a searchable glossary of
918 UI elements, each with a definition, a live tweakable example, and
copyable code in three formats.

**Detailed plan:** `docs/superpowers/plans/2026-08-18-ui-element-compendium.md`
— every step below expands into full test code and implementation there. Work
from that document; this file is the checklist and the resumption point.

**Design spec:** `docs/superpowers/specs/2026-08-18-ui-element-compendium-design.md`

**Branch:** `master`. Do not create branches. Commit and push after each step.

---

## Steps

Each step is one task in the detailed plan. A step is done when its stated
command passes. Do not mark a step complete in PROGRESS.md until you have run
the command and seen it pass.

- [ ] **1. Worker scaffold and router**
  Done when: `npx vitest run tests/router.test.js` passes (6 tests) and
  `curl -s http://127.0.0.1:8787/healthz` returns `ok`.

- [ ] **2. D1 schema**
  Done when: `npm run db:local && npx vitest run tests/schema.test.js` passes
  (4 tests).

- [ ] **3. Glossary parser**
  Done when: `npx vitest run tests/parse.test.js` passes (17 tests), including
  the assertions of 45 categories, 1,001 rows and 918 merged entries. If those
  counts fail, the parser is wrong — do not edit the expected numbers.

- [ ] **4. Seed tables and runner**
  Done when: `npx vitest run tests/seed.test.js` passes (10 tests) and
  `curl -s -X POST http://127.0.0.1:8787/api/seed` returns
  `{"categories":45,"entries":918,"core":61}`.

- [ ] **5. Data access layer**
  Done when: `npx vitest run tests/db.test.js` passes (15 tests), including
  the revision-on-every-write and slug-immutability tests.

- [ ] **6. Template engine**
  Done when: `npx vitest run tests/template.test.js` passes (13 tests).

- [ ] **7. Design tokens, layout shell, theme**
  Done when: `npx vitest run tests/layout.test.js` passes (7 tests) and
  `public/fonts/` contains the three self-hosted woff2 families.

- [ ] **8. Browse page**
  Done when: `npx vitest run tests/browse.test.js` passes (9 tests).

- [ ] **9. Search index and command palette**
  Done when: `npx vitest run tests/searchindex.test.js` passes (5 tests) and
  Cmd+K on the running dev server navigates to an entry via the keyboard.

- [ ] **10. Entry detail page**
  Done when: `npx vitest run tests/entry.test.js` passes (8 tests).

- [ ] **11. Tweak panel, live example, code tabs**
  Done when: `npx vitest run tests/tweak.test.js` passes (6 tests) and
  changing a colour control on the dev server visibly updates the example and
  every code tab.

- [ ] **12. Edit view, new entry, history, restore**
  Done when: `npx vitest run tests/edit.test.js` passes (9 tests).

- [ ] **13. Export, import, nightly R2 backup**
  Done when: `npx vitest run tests/export.test.js` passes (5 tests), including
  the markdown round-trip parsed by the seeder's own parser.

- [ ] **14. Ten authored core examples**
  Done when: `npx vitest run tests/examples.test.js` passes (31 tests) for
  button, card, modal, toast, tab-bar, badge, text-input, select, accordion
  and table.

- [ ] **15. Responsive, accessibility, reduced motion**
  Done when: `npm test && npx playwright test` both pass — all vitest files
  plus the 8 acceptance tests from spec section 12.

- [ ] **16. Deploy to artifacts.clydeford.net**
  Done when: `curl -s https://artifacts.clydeford.net/healthz` returns `ok`,
  `curl -s -o /dev/null -w "%{http_code}" https://artifacts.clydeford.net/e/button`
  returns `200`, and the seed endpoint has been run against the remote D1.

---

## Standing constraints

Copied from the plan's Global Constraints; they apply to every step.

- `dependencies` in package.json stays empty. No framework, no bundler, no
  CSS library, no build step.
- Every write to `entries` creates a revision first, inside `saveEntry()`.
- All CSS transitions and animations live inside
  `@media (prefers-reduced-motion: no-preference)`. Never write a bare
  `transition:` outside it.
- The example iframe is exactly `sandbox="allow-scripts"`. Never add
  `allow-same-origin`.
- No cookies, no analytics, no third-party requests. Fonts are self-hosted.
- Secrets stay in `.env`, which is gitignored. Never commit a token.
- British spelling in user-facing copy.

## If you get stuck

If a step is ambiguous or a decision is needed that is not answered by the
plan or the spec, stop. Write the question to PROGRESS.md under a "Blockers"
heading and end the run. Do not guess.
