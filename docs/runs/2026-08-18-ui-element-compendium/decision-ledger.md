# SDD ledger — plan: docs/superpowers/plans/2026-08-18-ui-element-compendium.md

**Spec:** `docs/superpowers/specs/2026-08-18-ui-element-compendium-design.md` (reachable, read)
**Branch:** `master` — no worktree.
Ruling: work on `master` rather than an isolated worktree/branch — CLAUDE.md
states "Push to the branch the run is already on; don't create branches", and
user instructions override the skill default. Cost if wrong: history is
linear on master, so backing the work out means reverts rather than
abandoning a branch.
**Remote:** none configured yet; Task 1 step 10 adds `origin`. Commits before
that point are local only.

---

## Pre-flight scan

### Cross-task pairs (shared file or interface)

| Producer | Consumer | Interface | Finding |
|---|---|---|---|
| T1 `router.js` | T8,9,10,12,13 | `route(routes, method, path)` + route registration in `worker.js` | OK — every consumer registers via the same table shape |
| T2 schema | T5 `db.js` | column names, `meta.index_version` | OK — all columns referenced exist |
| T3 `parse.js` | T4 `run.js` | `sortOrder,name,rows` / `categories,primaryCategory,catalogueNo` | OK |
| T3 `parse.js` | T13 export round trip | `parseGlossary` re-reads exported markdown | **CONFLICT — see R3** |
| T4 seed | T5 `listCategories` | `categories.id == sortOrder` | OK |
| T5 `db.js` | T8,9,10,12,13,14 | 11 exported functions | OK — every name used is exported |
| T6 template engine | T11,13,14 | `render`, `defaultsFor` | **CONFLICT — see R1** |
| T7 `components.js` | T9 `api/index.js` | `firstLine` | OK — exported in T7 |
| T7 `layout.js` | T8,10,12 | `layout`, `html`, `raw` | OK |
| T7 `components.js` | T8,10 | `entryCard`,`specimenPlate`,`tierBadge`,`definitionOnlyBadge` | OK |
| T9 index API | T9 palette | compact 7-field row array | OK — producer and consumer both 7 fields |
| T11 `generate.js` | T14 examples | placeholder ids shared across formats | OK — T14 test enforces it |
| T4 `run.js` | T14 `loadExamples` | export added to same module | OK |
| T4 seed route | T16 verification | response shape `{categories,entries,core,examples}` | OK — fixed during plan self-review |

### Per-task self-consistency

Tasks 1,2,3,5,6,7,8,9,10,12,15,16: text agrees with itself — the tests
specified exercise the code specified, and files created are the files later
modified. Task 4: **see R2**. Task 11: **see R1**. Task 13: **see R3**.
Task 14: nine of ten example files are specified by contract rather than
literal content; its tests enforce the contract mechanically — accepted, not
a conflict.

### Rulings from the scan

**R1 — Ruling: the shared template engine lives at `public/js/template.js`, not `src/template.js`.**
The plan had the Worker importing it from `src/` while the browser fetched it
through a hand-rolled route using `import ... from "./template.js?raw"`.
Wrangler has no `?raw` loader, so that route could not build, and the
`vitest` alias I had added to compensate was papering over the same crack.
Moving the file into `public/js/` makes the assets binding serve it and lets
the Worker, the browser modules and the tests all import the one real file by
relative path. Removed: the route, the `?raw` import, and both vitest aliases.
Cost if wrong: a shared module sits under `public/` where a reader might
expect only client code — mitigated by a note in the plan's file structure.

**R2 — Ruling: the seed route reads the glossary markdown from the request body.**
The plan bundled it via `import glossary from "../*.md"` plus a wrangler
`Text` rule. That rule would not apply under vitest, where the Worker is
loaded through vite, so every `SELF.fetch` test file would have failed to
import `worker.js`. Body-posting also keeps 66KB out of the deployed bundle.
Seeding is now
`curl -X POST --data-binary @web-development-ui-glossary-complete.md .../api/seed`.
Cost if wrong: seeding needs the file to hand, which both the local and the
production step already have.

**R3 — Ruling: `cell()` in the parser unescapes `\|`.**
`exportMarkdown` escapes pipes inside cells so tables stay well formed, but
the parser never unescaped them, so a definition containing a pipe would
survive export and come back corrupted — silently breaking the "exported
markdown re-imports cleanly" acceptance check. No current glossary row
contains a pipe, so this is latent rather than active. Verified the corrected
regex against Node: `" Master\|Detail "` → `"Master|Detail"`.
Cost if wrong: none observable today; it only engages once someone writes a
pipe into a definition.

Three defects found, three ruled on, all patched into the plan before Task 1.

---

## Log

Task 1: dispatched (sonnet) — scaffold, router, worker skeleton. BASE fb78937.

**R4 — Ruling: accept the implementer's `vitest.config.js` deviation; the plan was wrong.**
The plan specified `defineWorkersConfig` from
`@cloudflare/vitest-pool-workers/config`. That subpath does not exist in the
pinned 0.21.3 — verified directly against the installed package's `exports`
map, which offers only `.`, `./types` and `./codemods/vitest-v3-to-v4`. The
real export is the `cloudflareTest()` Vite plugin, and the package ships a
`vitest-v3-to-v4` codemod that rewrites to exactly the shape the implementer
used. It changed the config rather than moving any pinned version, which was
the right call. Plan patched so later tasks and reviewers do not read this as
drift. Cost if wrong: none — tests run green against the written config.

**R5 — Ruling: Task 1 verifies the Worker parses; Task 2 boots the dev server.**
Task 1 step 9 asked for `wrangler dev` + `curl /healthz`, but wrangler
rejects the empty `database_id` that Task 1 is explicitly told to leave in
place, so the step could never pass as written. Moved the dev-server check to
Task 2 step 6, after the database exists. Cost if wrong: the Worker's first
real boot is verified one task later than intended.

Task 1: implementer DONE_WITH_CONCERNS (commit 7043d85, 6/6 router tests
  pass). Both concerns verified real and ruled on as R4/R5 above. Remote
  `origin` added and push to github.com/sjohnston1972/artifacts succeeded, so
  later tasks can push normally. No secrets in the commit (.env untracked,
  no token strings in tracked files).
Task 1: task reviewer dispatched (sonnet) over fb78937..7043d85.
Task 1: reviewer ⚠️ on .gitignore resolved by controller — file contains
  .env, node_modules/, .wrangler/, dist/, .superpowers/ and `git check-ignore`
  confirms all five rules bite. Not a gap.
Task 1: complete (commits fb78937..7043d85, review clean — spec ✅, quality
  approved, zero findings)
Task 2: dispatched (sonnet) — D1 create, schema.sql, applySchema test helper.
  BASE f0779cc.
Task 2: implementer DONE (commit 781c11c, 10/10 tests across 2 files). Real D1
  created (id committed in wrangler.toml — not a secret). wrangler dev booted
  and /healthz returned ok, closing out R5. Self-reported deviation: no TDD
  red phase — all files written before the first test run; handed to the
  reviewer to judge whether that weakens the tests.
Task 2: task reviewer dispatched (sonnet) over f0779cc..781c11c.

**R6 — Ruling: the reviewer is right; add `DROP TABLE IF EXISTS meta` and a
re-apply test.** The finding is plan-mandated — my Task 2 step 2 listed only
four drops — so I ruled on it rather than dismissing it. Reproduced directly:
a second `npm run db:local` fails with `table meta already exists at offset
13: SQLITE_ERROR`, which defeats the reset workflow the other four drops
exist to provide. Plan patched to drop all five tables and to add a test
asserting the schema applies twice cleanly, so the property is defended
rather than just fixed. Cost if wrong: none — the drops are guarded by IF
EXISTS and the test pins the behaviour.
Task 2: fix round 1/5 dispatched — 1 Important finding (missing meta drop).
  The Minor (generic fragility of the `;` splitter) is deferred: verified
  safe against the actual schema.sql, and it was specified verbatim in the
  brief.
Task 2: minor (deferred): tests/helpers/db.js splits SQL on `;` without
  handling semicolons inside string literals — safe for the current
  schema.sql, would need a real parser if schema.sql ever gains one.
Task 2: fix round 1/5 (1 addressed, 0 open — meta drop + re-apply test;
  commits 781c11c..b681617). Scoped re-review dispatched (haiku).
Task 2: re-review — finding ADDRESSED (schema.sql:22), test asserts the
  property (fails without the drop), scope clean, no new breakage.
Task 2: complete (commits f0779cc..b681617, 1 fix round, 11/11 tests)
Task 3: dispatched (sonnet) — glossary parser. BASE fcca932.

**R7 — Ruling: the plan's "State" test expectation was wrong; the parser is right.**
Caught mid-flight by re-deriving the merge facts with an independent
implementation rather than waiting for the review. `State` occurs 4 times,
not 5: my original count came from a crude scan that treated the
`| State | Definition |` HEADER row of the Interaction States table as a term
row — the exact bug structural header detection exists to prevent. The test
was therefore asserting the bug. Corrected in place and made stronger: it now
asserts `notes` does NOT contain `**Interaction States:**`, pinning header
exclusion explicitly. Also corrected 85 -> 74 repeating names (83 rows beyond
first appearance) in both plan and spec. 45 / 1,001 / 918 unchanged.
Cost if wrong: none — verified twice by separate implementations that agree
on 45/1001/918 and on State's four contributing categories.
Task 3: correction sent to the running implementer mid-task.
Controller note: `git add -A` for the R7 docs commit swept in the Task 3
  implementer's in-progress src/seed/parse.js and tests/parse.test.js.
  Caught immediately; commit was unpushed, so `git reset --mixed HEAD~1`
  undid it with the working tree untouched (md5 verified identical) and the
  files returned to untracked. Docs re-committed alone. Rule for the rest of
  this run: stage explicit paths, never `-A`, while an implementer is live.
Task 3: implementer DONE (commit f63f6d5; 17/17 parse, 28/28 suite). It found
  the State discrepancy independently by grep before my correction arrived and
  reached the same conclusion; parse.js was never bent to chase the wrong
  number.
Task 3: controller verified the two things tests cannot catch —
  (a) cell() uses the correct /\\|/g form, proven behaviourally: a synthetic
      row "Master\|Detail" round-trips to "Master|Detail" rather than being
      shredded to "|M|a|s|t|e|r|...";
  (b) structural header detection proven on a synthetic 2-table doc where a
      "| State | Definition |" header is excluded while a real "State" term
      row in the same table survives.
  Also confirmed primaryCategory/categories carry sortOrder values (1,2) and
  catalogueNo restarts at 1 per category.
Task 3: task reviewer dispatched (sonnet) over ae78678..f63f6d5.
Task 4: reference tables pre-verified — 45 CATEGORY_CODES, all unique, names
  matching the parsed categories exactly; 61 CORE_NAMES, no duplicates, every
  one resolving to a real term.

**R8 — Ruling: namespace Semantic HTML Elements slugs with `-element`.**
The reviewer's purity finding exposed something larger. Those 12 "collisions"
were not cosmetic: source order hands `/e/button` to the `<button>` tag from
section 2 and pushes the CORE-TIER Button component to `/e/button-2`. Same for
Select, Textarea and Dialog — four core entries. This breaks the spec's own
acceptance check (Task 15 asserts `/e/button` shows a `BTN-###` reference and
the "Buttons & Actions" stamp; it would have found `SEM-###`), and Task 14
would have attached the authored Button example to the HTML tag's entry.
Ruled: components own the clean slug, tags get `-element`. Simulated against
the real source before committing to it — 918 entries, 918 unique slugs, zero
residual collisions, and no numeric suffix anywhere. Cost if wrong: the
`-element` URLs are a naming choice a reader might not guess; the entries
remain findable by name in search, which is how they are actually reached.

**R9 — Ruling: `assignSlugs` returns collisions instead of logging them.**
The `console.warn` violated the module's stated purity constraint and fired on
every real seed. `mergeEntries` now returns `slugCollisions`, and Task 4's
seeder throws if it is non-empty — so a future collision fails the seed loudly
instead of being silently suffixed. Cost if wrong: a genuinely new colliding
term would block seeding until someone names it; that is the intended
trade.
Task 3: fix round 1/5 dispatched — spec ❌ (purity) + Important (same), plus
  the wrong section number in a test comment. Minor on the `-N` suffix scheme
  being theoretically self-colliding is now moot: after R8 no suffix is ever
  generated, and the seeder rejects it if one ever is.
Task 3: fix round 1/5 (3 addressed, 0 open — purity, slug precedence, comment;
  commits f63f6d5..23f1e2f; 30/30 suite, 19/19 parse). Controller independently
  re-verified on the real module: 918/918 unique slugs, slugCollisions [], no
  numeric suffixes, /e/button -> Button and /e/button-element -> button.
  Scoped re-review dispatched (sonnet).
Task 3: re-review — all 3 findings ADDRESSED, no new breakage, both new tests
  confirmed non-vacuous (they fail if the -element rule is removed).
Task 3: complete (commits ae78678..23f1e2f, 1 fix round, 30/30 suite)

**R10 — Ruling: the bad State count had leaked into Task 4's test too; fixed
before dispatch.** Task 4 asserted `entry_categories` holds 5 rows for State.
Same root cause as R7 (header row miscounted as a term). Corrected to 4 with a
comment naming the four contributing sections, and added a companion test
asserting slug 'button' is the core-tier Button component while
'button-element' is the tag — so R8 is defended at the database layer, not
just in the parser. Cost if wrong: none; both figures verified against the
real source.
Task 4: dispatched (sonnet) — seed tables + runner. BASE 23f1e2f.
Task 4: implementer DONE (commit a00aa44; 11/11 seed, 41/41 suite). Live smoke
  test via wrangler dev returned {"categories":45,"entries":918,"core":61};
  re-POST correctly rejected by the already-seeded guard.
Task 4: controller verified the seeded local D1 directly, not just the HTTP
  response — cats 45, entries 918, unique slugs 918, core 61, has_example 0,
  entry_categories 1001 (= 918 primary + 83 secondary, exactly the source row
  count, so no category membership was lost in the merge), State 4 categories,
  slug 'button' -> Button/core and 'button-element' -> button, zero entries
  with other than exactly one primary category, Switch aliases applied, NAV
  code assigned.
Task 4: task reviewer dispatched (sonnet) over bfe57a9..a00aa44; asked
  specifically about half-seed wedging (batch failure + already-seeded guard).
Task 4: reviewer — spec ✅, quality Approved. Half-seed wedge ruled out:
  db.batch() is atomic, so a failed batch rolls back and the guard still reads
  0 entries, leaving the seed re-runnable. Identity map at run.js:33 confirmed
  correct (categories.id IS sortOrder by design). "refuses to run twice"
  confirmed non-vacuous.

**R11 — Ruling: park the unchunked ~1,964-statement batch as a known risk;
carry it into Task 16 rather than pre-emptively chunking.** The reviewer
raised it as Important but explicitly not a defect in this task, and it is
inherited verbatim from my brief. Reasoning: atomicity is worth more than
headroom here — a single batch either fully applies or fully rolls back, so
the worst case at production scale is a clean, retryable failure, not a
half-seeded database. Chunking would buy headroom at the cost of that
guarantee, and would then need its own cleanup-on-failure path to avoid
re-introducing the wedge. Not worth building speculatively when the local run
already executed all 1,964 statements successfully. Carried into Task 16: if
the production seed fails on batch size or Worker CPU time, the known fix is
to chunk AND add cleanup-on-failure, and Task 16 must not paper over it.
Cost if wrong: the production seed fails once, visibly and retryably, and
Task 16 does the chunking then.
Task 4: minor (deferred): /api/seed is unauthenticated by design — the
  already-seeded guard is its only protection. Spec-level decision, revisit
  when the shared edit key lands behind requireWrite().
Task 4: complete (commits bfe57a9..a00aa44, review clean, 41/41 suite)
Task 5: dispatched (sonnet) — data access layer. BASE a00aa44.

**R12 — Ruling: 4 is correct; the Task 5 test's `toHaveLength(5)` was stale.**
Third leak of the same R7 error, and my earlier sweep missed it because I
grepped `toBe(5)` and this one was `toHaveLength(5)`. The implementer reported
BLOCKED rather than editing the assertion — exactly the instructed behaviour,
and the reason this was caught as a plan defect instead of silently
normalised. Re-confirmed ground truth by querying the seeded D1 directly:
entry_categories for slug 'state' holds 4 rows, Workflow UI primary. Replaced
the length check with an exact ordered list of the four category names, so the
assertion can no longer drift without saying what it expects. Swept the whole
plan again with a wider pattern; the only remaining `5`s are the legitimate
`toHaveLength(45)` category counts. Cost if wrong: none — verified at parser,
seeder and database layers independently.
Task 5: implementer DONE (commit d796852; 14/14 db, 55/55 suite) after the R12
  unblock.
Task 5: CONTROLLER-FOUND BUG (pending, to be merged with the reviewer's
  findings into one fix round): `listEntries` mixes a numbered placeholder
  `?1` for the LIKE term with positional `?` binds. SQLite assigns a bare `?`
  the next free index, so when `categorySlug` is ALSO supplied the leading
  `c.slug = ?` takes index 1 and `?1` aliases onto it — the statement then has
  3 parameters while 4 values are bound. Proven with node:sqlite:
    q only         -> works
    categorySlug+q -> ERROR: column index out of range
  This is the search-within-a-category path (/c/navigation?q=toast), which
  Task 8's browse handler exercises by passing both. No Task 5 test combines
  the two, so the suite is green. Fix: drop `?1`, use three positional `?`
  and push the LIKE term three times.

**R13 — Ruling: `listCategories` must COUNT(e.id), not COUNT(ec.entry_id).**
Reviewer-found Critical, independently reproduced with node:sqlite: a category
holding one live and one soft-deleted entry reported entry_count 2 instead of
1. The `e.tier <> 'deleted'` condition sits on the entries LEFT JOIN, but
counting join-table rows ignores whether that join matched. Every browse page
would have shown inflated counts once anything was deleted — wrong, quiet, and
untested. Cost if wrong: none; the corrected form is proven.

**R14 — Ruling: `listEntries` must use positional binds, never `?1`.**
Found independently by me and by the reviewer. SQLite assigns a bare `?` the
next free index, so with `categorySlug` present the leading `c.slug = ?` takes
index 1 and `?1` aliases onto it — 3 parameters for 4 bound values. Confirmed
this is a live path, not hypothetical: Task 8's browse handler passes
categorySlug and q together, so /c/navigation?q=toast would have 500'd. The
suite was green because no test combined the two filters. Also dropped the
redundant `ec.is_primary = 1` from that branch. Cost if wrong: none.

**R15 — Ruling: guard hydrate()'s JSON.parse.** Editing is open by design and
these columns hold hand-edited JSON, so a malformed value is reachable by an
ordinary user action and would 500 the entry page. Degrade to the empty
default instead. Cost if wrong: a corrupt value renders as empty rather than
announcing itself — accepted, because the alternative is a dead page.
Task 5: minor (deferred): listRevisions parses every snapshot with no
  pagination; fine at current volumes, will scale poorly per entry.
Task 5: fix round 1/5 dispatched — 2 Critical, 1 Important, 1 Minor folded in.
Task 5: fix round 1/5 (3 addressed, 0 open; commits d796852..0cafbd1; 17/17
  db, 58/58 suite). Controller confirmed COUNT(e.id), three positional LIKE
  binds with no ?1 left in executable SQL, safeParse wired into hydrate, and
  all three new tests present. Implementer correctly flagged that my "18
  tests" was an off-by-one — 14 existing + 3 new = 17. My arithmetic error,
  not a missing test.
Task 5: scoped re-review dispatched (sonnet).
Task 5: re-review — all 3 findings ADDRESSED. Bind counts verified across all
  four call shapes (neither 0+2, categorySlug 1+2, q 3+2, both 4+2). Zero-live
  categories still return a row with count 0 rather than being dropped. Both
  new tests confirmed to fail under the old code. No new breakage.
Task 5: complete (commits a00aa44..0cafbd1, 1 fix round, 58/58 suite)
Task 6: dispatched (sonnet) — shared template engine. BASE 0cafbd1.
Task 6: implementer DONE (commit 411ac11; 13/13 template, 71/71 suite).
Task 6: CONTROLLER-FOUND escaping bypasses (holding to merge with reviewer):
  (a) SINGLE-QUOTED attribute is classified as TEXT context, because the
      detector counts only double quotes. escapeText does not escape ' , so:
        <img alt='{{x}}'>  with x = "' onerror='alert(1)"
        -> <img alt='' onerror='alert(1)'>          XSS
  (b) UNQUOTED attribute likewise:
        <div class={{x}}>  with x = "a onmouseover=alert(1)"
        -> <div class=a onmouseover=alert(1)>       XSS
  Verified clean, no action: values are NOT re-scanned for placeholders (a
  value containing {{y}} or {{{evil}}} stays literal, so no double-expansion
  or injection through data); unbalanced blocks are left literal and do not
  hang; an unknown id inside a removed block correctly produces no warning.
  Threat model note: templates are author-written and an author can already
  emit raw markup, so escaping only protects VALUES (tweak-panel inputs, which
  are shareable via the URL fragment) from breaking out of author markup.
  Output lands in a sandboxed iframe (allow-scripts without allow-same-origin,
  so opaque origin) BUT also in Task 13's standalone HTML export, which is
  downloaded and opened unsandboxed. So (a) is worth fixing properly.

**R16 — Ruling: replace context-aware escaping with one uniform rule.**
Seven confirmed breakouts across five causes (two found by me, five by the
reviewer, all reproduced): single-quoted attributes, unquoted attributes, a
`>` inside an earlier attribute value, <script> blocks, and an inner
single-quoted JS string each defeated the scanner. The approach is unsound,
not merely buggy — it tries to infer HTML context by counting characters.
Escaping & < > " ' everywhere is the only rule that is correct without parsing
the surrounding markup. Cost: a quote in visible text now copies as &quot; —
valid, renders identically, marginally noisier in the code tab. Accepted
against a class of XSS.

**R17 — Ruling: substitution collapses to a single regex pass.** Two
sequential passes let `{{{raw}}}` output be re-scanned, so a raw value shaped
like {{secret}} pulled in a key the template never named. One combined regex
means String.replace never re-examines inserted text, killing
injection-through-data structurally.

**R18 — Ruling: defaultsFor skips malformed schema entries** instead of
throwing on `defaultsFor([null])`.

Unquoted attributes cannot be fixed by escaping (a bare space starts a new
attribute), so they now raise an authoring warning surfaced in the Edit view.

Controller note: my own replacement was wrong on first write — a Python `\1`
octal escape put a literal 0x01 into the block regex, silently turning
if/unless into no-ops. Caught by extracting the code from the plan and
executing it before dispatch. Lesson repeated from R3: never hand an
implementer regex code that has not been run.
Task 6: fix round 1/5 dispatched — 5 Critical, 2 Important, 1 Minor deferred.
Task 6: minor (deferred): block resolution is O(n^2) in nesting depth
  (measured 4000 deep -> 194ms). Templates are author-written; 400 deep is 4ms.

**R19 — Ruling: warn on placeholders inside event-handler attributes.**
Verifying the shipped fix showed one case still executing:
`onclick="foo('{{x}}')"` renders `foo('&#39;);alert(1);(&#39;')`, and because
HTML decodes character references in attribute values BEFORE JavaScript parses
them, the handler receives real quotes and runs. HTML escaping cannot fix
this; it would need JS-string escaping, which depends on the surrounding JS.
Notably `<script>` blocks ARE safe now — entities are not decoded there, so
the value stays inert. Ruled: warn, consistent with the unquoted-attribute
warning, since the author is the one who can fix it. Cost if wrong: a
determined author can still write an unsafe handler, but they could equally
write raw script; the warning is the honest signal rather than a false claim
of safety. My first regex for this missed the case because it excluded both
quote characters from the value — fixed to key on the opening quote only, and
re-verified (fires on onclick, silent on title).
Task 6: fix round 2/5 dispatched — event-handler warning + 2 tests.
Task 6: fix round 2/5 (commit 5900bc7; 21/21 template, 79/79 suite). The
  implementer found a THIRD defect in my plan: the event-handler test literal
  had unescaped inner single quotes, making it unparseable JS. It verified
  against the plan with cat -A first to rule out its own transcription, then
  fixed only the outer-string escaping. Plan synced to match, and the shipped
  test file confirmed to parse as valid JS.
Task 6: controller re-verified the shipped module — every probe case is either
  contained by escaping or flagged by a warning; ordinary attributes produce no
  warning (no false positives); BLOCK_RE intact; defaultsFor robust.
Task 6: scoped re-review dispatched (sonnet) over acbd884..5900bc7.
Task 6: re-review — all 7 findings ADDRESSED. inAttribute/escapeAttr/
  escapeText confirmed deleted repo-wide (zero grep hits); single TOKEN_RE
  pass with no second .replace; EVENT_ATTR_RE fires on onclick, silent on
  title; BLOCK_RE backreference verified by codepoint; escape() orders & first
  so no double-escaping. No new breakage.
Task 6: complete (commits 0cafbd1..5900bc7, 2 fix rounds, 79/79 suite)
Task 7: dispatched (sonnet) — tokens, layout shell, components, theme.
Task 7: implementer DONE (commit 77f9cc4; 7 new layout tests, 86/86 suite).
Task 7: controller verified mechanically —
  (a) reduced motion: exactly 1 @media(prefers-reduced-motion: no-preference)
      block, ZERO motion declarations outside it, durations {120,160}ms only,
      all < 250ms. This is the constraint Task 15's acceptance test checks, so
      proving it now avoids a failure 8 tasks from its cause.
  (b) no third-party origins anywhere in public/ or src/.
  (c) html`` escaping boundary probed directly: XSS escaped, & escaped FIRST
      (no double-escaping), attribute quotes escaped, null/undefined/false ->
      empty while 0 survives, arrays of raw() pass through, arrays of strings
      escape, a plain {raw:...} object CANNOT impersonate the Symbol
      ("[object Object]"), and a crafted toString is escaped.
Task 7: task reviewer dispatched (sonnet) — asked for WCAG AA contrast figures
  and token completeness across both themes.

**R20 — Ruling: escape the apostrophe in the chrome escaping boundary.**
Reviewer raised it as Minor with no live exploit — every attribute in the
codebase is double-quoted — and I escalated it to a fix anyway. Verified the
gap directly: html`<a t='${"x' onerror='alert(1)"}'>` produces a clean
breakout. The reason to fix a latent bug now is that this is the SOLE
escaping boundary for the seven renderers Tasks 8-14 add, and the entry
example engine lost two full fix rounds to exactly this class. One replace.
Cost if wrong: apostrophes render as &#39; in page chrome — invisible to
users, marginally noisier in view-source.

**R21 — Ruling: catalogueRef guards a missing number.** "NAV-undefined" on
the specimen plate, which is the one element the design brief asks to be
flawless. Falls back to 000.

**R22 — Ruling: amend the design spec to sanction gold on the focus ring.**
The reviewer correctly found a textual spec violation: §9 says gold appears
"only" on active nav, copy confirmation and the core-tier marker, but
:focus-visible uses it too. The spec conflicts with itself here — it also
demands visible focus states and WCAG AA — and gold is the only accent with
enough contrast against both grounds. Ruled in favour of accessibility,
amended the spec to list four sanctioned uses, and recorded which one to
change first if Steven thinks the colour is now diluted. Flagging to him
because it is a design decision, not an implementation one.
Task 7: parked (brief-originated, not a defect): the spec describes the
  per-category plate lean as a --plate-lean custom property; the brief and
  implementation use a data-lean attribute with four background-position
  rules. Functionally and visually equivalent.
Task 7: fix round 1/5 dispatched — 1 Important (escalated), 1 Minor.
Task 7: fix round 1/5 (commit d1a2279; 9/9 layout, 88/88 suite). Controller
  verified directly: single-quoted attribute now contained, & still escaped
  first (no double-escape regression), catalogueRef renders NAV-014 normally
  and NAV-000 on missing input.
Task 7: scoped re-review dispatched (haiku).
Task 7: re-review — both findings ADDRESSED, & still escaped first, only the
  three expected files touched, no new breakage.
Task 7: complete (commits 7cf8a85..d1a2279, 1 fix round, 88/88 suite)
Task 8: pre-dispatch check — rendered an entryCard against the real
  components module to confirm the brief's `>Affordance<` assertion matches
  actual markup (<h3 class="card__name">Affordance</h3>). Valid; no stale
  expectation this time.
Task 8: dispatched (sonnet) — browse page, filters, no-JS search. BASE d1a2279.
Task 8: implementer DONE (commit 90f70ab; 9 browse tests, 97/97 suite). It
  caught a SIXTH defect in my brief: Step 3 wrapped raw(raw(entryCard(e))),
  and double-wrapping coerces the inner raw object to "[object Object]",
  which would have collapsed every card on the page.
Task 8: controller verified live against wrangler dev, not just tests —
  / 200/61 cards (= the 61 core entries, correct since seeding yields only
  core and reference); /?tier=all 200; /?q=affordance finds the reference-tier
  entry, proving the tier filter is correctly dropped for search;
  /c/navigation 200/5; /c/navigation?q=menu 200/6 -- THE R14 CRASH PATH NOW
  WORKS LIVE; /?q=zzzznotathing 200 with the empty-state copy; /c/nope 404.
  Zero "[object Object]" in the output. Cross-checked the category+search
  result against SQL: exactly 6 Navigation entries match "Menu" and Widget
  Menu (Dashboard UI) is correctly excluded, so the category filter genuinely
  still applies alongside q.
  Motion constraint re-verified after the new CSS: 0 declarations outside the
  reduced-motion block, durations {120,160}ms.
Task 8: CONTROLLER-FOUND (holding for the fix round): /?tier=all renders
  exactly 500 cards against 918 entries. listEntries is called with limit 500,
  so browse SILENTLY TRUNCATES with no indication to the reader. Only reachable
  via tier=all (the default core+useful is 61), but a catalogue that quietly
  hides 418 of its specimens is wrong for a reference tool.

**R23 — Ruling: the no-JS search form must keep the category scope.**
Reviewer-found, spec ❌. The form hardcoded action="/", so submitting a search
from /c/navigation silently went site-wide. Notable for HOW it hid: my live
verification passed because I typed the URL /c/navigation?q=menu rather than
submitting the form. The route worked; the form did not. Lesson for the rest
of this run — testing a URL is not testing the control that produces it.
Cost if wrong: none, the fix is a conditional action attribute.

**R24 — Ruling: raise the browse limit above the corpus rather than paginate.**
I found the 500-cap hiding 418 of 918 specimens at tier=all; the reviewer
confirmed it is worse, because examples=some filters in JS AFTER the query and
so under-reports beyond row 500. Chose limit 2000 over pagination: the corpus
is fixed at ~918, this is a server-rendered browse page rather than an API,
and a bare cap with no "showing X of Y" is the one truncation shape that
actively misleads. Cost if wrong: the tier=all page is large (~918 cards);
if that proves too heavy, the fix is a count indicator plus pagination, not a
silent cap.

**R25 — Ruling: the search placeholder must reflect the real entry count**
rather than a hardcoded 918, which would lie the moment anyone edits.

Task 8: parked — the spec's horizontally-scrolling category strip under 768px
  is genuinely missing (implementation stacks at 60rem/960px), but Task 15's
  responsive pass already schedules that exact rule. Building it twice is
  waste. Task 15 must also reconcile the breakpoint mismatch: 960px vs the
  spec's 768px leaves 768-960 stacked vertically with no strip.
Task 8: minor (deferred): none outstanding — the two brief-inherited test gaps
  (examples=some uncovered, category count never asserted) are fixed in this
  round rather than deferred.
Task 8: fix round 1/5 dispatched — 2 Important, 1 Minor, 3 new tests.
Task 8: fix round 1/5 (commit 39db4f3; 12/12 browse, 100/100 suite). The
  implementer improved on my test rather than just implementing it: my
  proposed `examples=some` assertion (`not.toContain("Definition only")`)
  would have passed VACUOUSLY, because every seeded entry has has_example=0
  so the result set is empty. It instead created a real example via saveEntry
  and asserted exactly 1 card plus the complementary examples=none exclusion.
  My test was wrong; theirs is right.
Task 8: scoped re-review dispatched (sonnet).
Task 8: re-review — all 3 findings ADDRESSED. `total` confirmed derived from
  listCategories (unaffected by the query limit) and excluding soft-deleted
  rows. The action attribute has two independent protections: html`` escaping
  AND the unknown-category 404 firing before renderBrowse is called. The
  replacement examples=some test confirmed genuinely non-vacuous (would return
  918 not 1 if the filter were removed) and its write is rolled back per-test.
Task 8: complete (commits d1a2279..39db4f3, 1 fix round, 100/100 suite)
Task 9: dispatched (sonnet) — search index API + command palette. BASE 39db4f3.

**R26 — Ruling: escape untrusted entry text in the command palette.**
The implementer found a genuine stored-XSS in my brief: paint() interpolated
entry name, category code and definition straight into innerHTML. Entry names
are user-editable and editing is open by design, so renaming an entry to
`<img src=x onerror=...>` would execute in every visitor's palette on every
page — and unlike the example iframe, the palette renders in the MAIN
document, not a sandbox, so there is no containment. This is the most serious
defect I have authored. It added escapeHtml() matching the project's other
escaping (& first, includes '); plan patched to match. Cost if wrong: none.

Task 9: implementer DONE_WITH_CONCERNS (commit 75cff50; 5 new tests, 105/105).
  It could NOT run the mandated hands-on browser check (claude-in-chrome
  extension not connected) and said so plainly rather than claiming success —
  correct behaviour, and I confirmed the extension is unavailable to me too.
Task 9: controller could not drive Chrome either (same extension failure).
  Ruling: fold the browser verification into the review — the reviewer will
  install Playwright (which Task 15 needs regardless, so not scope creep),
  drive the palette for all 8 behaviours including the XSS check against a
  live page, and commit only the devDependency. Verifying a named acceptance
  check now beats discovering a broken palette at Task 15, where the debugging
  would land on an implementer with no context for this code.
Task 9: task reviewer dispatched (sonnet) with browser-verification duty.
Task 9: reviewer — spec ✅, quality Approved, and ALL EIGHT browser checks
  PASS against real Chromium (it got a working Playwright browser where the
  implementer and I could not):
    1 Ctrl+K and Meta+K open from / and /c/navigation
    2 "/" opens from the body but inserts a literal slash when focus is in an
      input — the hijack guard works
    3 typing "toast" ranks the exact match first
    4 Arrow keys move .is-active AND aria-activedescendant together
    5 Enter navigates to /e/toast (404 body only because Task 10 has not built
      the entry page yet — navigation itself succeeded)
    6 Esc closes and restores focus to the exact anchor that had it
    7 Tab stays trapped on the palette input
    8 XSS: entry renamed to <img src=x onerror=window.__pwned=1>, palette
      opened — window.__pwned stayed undefined, name rendered as literal text.
      R26's fix confirmed in a live browser, not just in source. Reviewer
      reverted the row to "Toast" afterwards (verified by me).
  It substituted a direct D1 write for the API call in check 8 because
  POST /api/entries/:slug does not exist until Task 12 — correct adaptation.
Task 9: Playwright devDependency committed (Task 15 needs it regardless).
  Verified `dependencies` is still {} — the deployed Worker ships zero runtime
  packages.
Task 9: complete (commits 39db4f3..75cff50, no fix round, 105/105 suite)

**R27 — Ruling: park the index cache-control staleness; carry it into Task 12.**
Reviewer raised (Minor) that `max-age=60, must-revalidate` lets a browser
serve a cached index for up to 60s without a conditional request, so the fresh
ETag cannot help until max-age expires — meaning an edit may not appear in
search for a minute. Real, and it comes from my design doc verbatim. Not
fixing it now: the index is fetched lazily on first palette open, editing does
not exist until Task 12, and a dedicated fix round for a one-line header on a
task that is otherwise clean is poor value. Carried into Task 12, which owns
the write path and the index-version bump, and where "I edited an entry and
search still shows the old name" first becomes reachable. Recommended change
there: `no-cache` so the ETag is consulted every time — a 304 costs almost
nothing. Cost if wrong: up to 60s of stale search results, invisible until
Task 12 ships editing.

**R28 — Ruling: notesToHtml must escape before inserting tags.**
The implementer found my brief inserted <strong> BEFORE escaping, so
user-editable `notes` could inject markup — structurally the same bug as the
command-palette XSS one task earlier. I had explicitly warned about this exact
ordering in the dispatch and my own brief still had it wrong. Escapes first
now, in both the shipped code and the plan.

**R29 — Ruling: a FOURTH leak of the State miscount, in a string assertion.**
The entry-page test asserted /e/state renders "Interaction States". It does
not — State's four categories are Workflow UI (primary), Design System
Terminology, Component Architecture, Application State Terminology. This one
survived two earlier sweeps because I grepped for the NUMBER (toBe(5),
toHaveLength(5)) and this instance encodes the same error as a STRING. Lesson:
when a fact is wrong, sweep for every representation of the fact, not for the
literal that first exposed it. Remaining "Interaction States" refs in the plan
are legitimate (the parser test finds that category by name; the code table
maps it to STA).
Task 10: implementer DONE_WITH_CONCERNS (commit 272e92d; 8 new tests,
  113/113). It fixed both defects above rather than transcribing them, and
  caught a double-raw() bug in its own first draft (specimenPlate self-wraps).
  sandbox="allow-scripts" present, allow-same-origin absent — verified.
Task 10: reviewer — spec ✅, quality Approved, zero Critical/Important.
  Escaping probes run against the SHIPPED functions:
    **<img src=x onerror=alert(1)>** -> fully neutralised
    "A & B" -> A &amp; B (correct, no double-escape of real text)
    unbalanced/nested ** -> well-formed closed tags, no injection
    data-templates carrying ", </script>, ' -> attribute unbreakable, and
      decode + JSON.parse round-trips to the original object exactly
  Sandbox: exactly one sandbox="allow-scripts" in the whole codebase;
  allow-same-origin appears nowhere; the test asserts against the WHOLE body,
  so adding it anywhere on the page fails the test.
  The /e/state correction independently re-verified against the source: only
  sections 18/31/34/35 carry a "State" term row; section 30 has it as a header.
Task 10: complete (commits b6d7970..272e92d, no fix round, 113/113 suite)
Task 10: two Minors CARRIED INTO TASK 11 rather than fix-rounded, because
  Task 11 owns exactly this code:
    (a) tab buttons lack id/aria-controls and panels lack id/aria-labelledby
        (incomplete WAI-ARIA tabs pattern) — brief-inherited;
    (b) /js/tweak.js and /js/copy.js are referenced but do not exist yet.
Task 11: dispatched (sonnet) — tweak panel, live example, code tabs.

**R30 — Ruling: sync the tweak controls from `values` on initial load.**
Eleventh defect found in my briefs, and the first that ONLY a browser could
catch. `controlHtml()` always emits the control's `default`, while
`syncInputs()` was wired solely to the Reset button. So a tweak state restored
from the URL fragment painted the iframe and all three code tabs correctly
while every control still displayed its default — the panel and the specimen
silently disagreeing, which is the exact failure this page exists to prevent.
The implementer caught it with a real assertion (input[name="bg"] showed
#241430 instead of the restored #ff00aa), not by reading code. It also fixed
the same class of bug for the range <output> display. Plan patched. Cost if
wrong: none. Lesson: for interactive UI, unit tests verify the data path and
prove nothing about what the user sees.
Task 11: implementer DONE (commit 39f3ad3; 6 new tests, 119/119). Live
  headless-Chromium verification reported for all six required behaviours:
  iframe render, colour change propagating to iframe AND all three code tabs,
  real clipboard copy, hash round-trip through reload, tab switching by click
  and keyboard, ARIA id wiring. No console or page errors.
  Also completed Task 10's two carried Minors (tab/panel ARIA ids and
  arrow-key nav; the dangling tweak.js/copy.js references now resolve).
Task 11: reviewer — spec ✅, quality Approved. Live browser confirmation of
  the headline acceptance criterion: colour changed to #ff00aa gave iframe
  computed background rgb(255,0,170) AND #ff00aa in all three code panels —
  one render() call, one source of truth. Reduced motion verified inert
  (.plate__stage animationName "none"). sandbox exactly "allow-scripts",
  zero occurrences of allow-same-origin in the page. All five control types
  round-trip through the fragment on a genuine reload, so R30's fix is
  complete, not just fixed for colour. Copy button copies live code, not a
  stale snapshot. ArrowRight moves focus and aria-selected together.
  buildDocument breakout attempt failed as designed: a </script><script>
  payload left window.__pwned undefined and appeared only as inert escaped
  text. postMessage source check confirmed to reject a spoofed message from
  the top window.

**R31 — Ruling: validate URL-fragment values before they reach render().**
Reviewer-found Important. #radius=NaN / Infinity / 1e999 rendered literally as
border-radius:NaNpx in the example and in ALL THREE code tabs, while the range
input clamped itself to its default — the same panel-disagrees-with-specimen
class as R30, arriving through a different door. Non-finite values are now
rejected and finite ones clamped to the control's own min/max, so the slider
and the generated code agree by construction rather than by luck. The fragment
is attacker-supplyable via a shared link, which is what makes this worth
fixing rather than parking. Cost if wrong: none.

**R32 — Ruling: clamp the iframe height.** The postMessage handler verified
e.source correctly (confirmed to block a spoofed top-window message) but
applied the height unclamped, so a genuine message carrying 99999999 set the
frame to 1e+08px and destroyed the page layout. Clamped to 80-2000px,
non-finite ignored, and fragment values capped at 2000 chars.
Task 11: fix round 1/5 dispatched — 1 Important, 2 Minors folded in.

**R33 — Ruling: the fragment-validation regression test goes in Task 15's
Playwright suite, not into tweak.js's API.** The implementer correctly refused
to act unilaterally and came back with the constraint: the Workers test pool
has no document/location/window, so tweak.js cannot even be imported there
(it calls document.querySelector at module top level), let alone reach the
private fromHash closure. Its two options were exporting a helper — widening a
module whose public API is deliberately zero — or adding jsdom project-wide.
Neither is worth it for one validation function. Ruled: this is browser
behaviour, so it belongs in the browser suite the plan already builds. Added
to Task 15 as a ninth acceptance test covering normal round-trip,
NaN/Infinity/1e999 fallback, and out-of-range clamping. Cost if wrong: the
regression is caught at Task 15 rather than in the unit suite — acceptable,
since no unit suite could have caught it in the first place.
Task 11: fix round 1/5 (commit 9bbd728; 119/119 unit, plus 16 live Playwright
  checks: #radius=16 round-trips through slider/output/example/code;
  NaN/Infinity/1e999 all fall back with no literal NaNpx anywhere;
  #radius=9999 clamps to the control's max; oversized postMessage height
  clamps to 2000px; spoofed top-window message still ignored).
Task 11: re-review — both findings ADDRESSED. Non-finite branch confirmed to
  `continue` (leaving the default) rather than writing 0 or undefined, which
  would have been a silently-wrong value instead of an obviously-wrong one.
  Clamp uses the control's own min/max and is a no-op for unbound controls.
  Source check still first, now an early return. Only tweak.js touched.
Task 11: complete (commits 272e92d..9bbd728, 1 fix round, 119/119 unit + live
  browser verification). THE SITE'S CORE FEATURE NOW WORKS END TO END.
Task 12: dispatched (sonnet) — edit view, new entry, history, restore.
Task 12: implementer DONE (commit 4a71be5; 17 new tests — it expanded my 9 to
  cover all 12 specified validation rules — 136/136 suite). Browser-verified
  edit->save, history->restore->restore-is-itself-undoable, new-entry
  creation, and invalid-JSON handling preserving input on both the blur and
  server paths.
  It added a stored-XSS regression test that PASSED with no fix needed — my
  brief was clean this time, after two earlier XSS defects.
Task 12: controller verified — R27 applied (cache-control: no-cache), all
  three POST write routes pass through requireWrite, auth.js is still the
  single seam, and the "Split Button" collision is real (already seeded).
Task 12: CONTROLLER-FOUND (holding for the fix round): POST /api/seed does NOT
  pass through requireWrite. It writes 918 rows and is guarded only by the
  "already seeded" check, so if the entries table were ever emptied, an
  unauthenticated caller could re-seed. Now that the seam exists, every write
  route should use it — otherwise the promise "add a key to requireWrite and
  nothing else changes" is false for the one route that writes the most.
Task 12: reviewer — spec ✅, quality Changes needed (1 Important, 2 Minor).
  Browser-verified the whole safety model: edit->save works; restore returns
  the original AND itself becomes a second revision; invalid JSON preserves
  typed input on both the blur and server paths; a </textarea><script> payload
  in name/definition/notes left window.__pwned undefined on both the edit and
  history pages; and posting {slug:"toast-hacked", has_example:1} left the
  entry untouched — smuggling is STRUCTURALLY impossible because saveEntry
  builds its update from explicit field picks rather than spreading the patch.

**R36 — Ruling: /api/seed must pass through requireWrite.** Found by me,
independently agreed by the reviewer, which also observed the route throws
"already seeded" uncaught into a 500. The exploit path is narrow (the guard is
a row-count check on mutable data, so it only opens if the table is emptied),
but the real defect is that the seam's stated promise — implement requireWrite
and change nothing else — was false for the route that writes 918 rows. Also
returns 409 rather than crashing. Cost if wrong: seeding now needs the key
once EDIT_KEY is set, which is the intended behaviour.

**R37 — Ruling: reject names that slugify to empty.** "!!!" is non-blank so it
passed the blank check, but slugifies to "" and would create an entry with no
reachable URL. Not in the brief's 12-rule matrix — a genuine gap in my spec,
not a missed implementation.

**R38 — Ruling: server-side validation errors must move focus.** The blur path
uses reportValidity() which moves focus natively, so the two failure paths
behaved differently for keyboard and screen-reader users. Consistency here is
the accessibility requirement, not politeness.
Task 12: fix round 1/5 dispatched — 1 Important, 2 Minor, 3 new tests
  including the first exercise of the EDIT_KEY path.
Task 12: re-review — all 3 findings ADDRESSED. requireWrite confirmed to run
  BEFORE request.text(), so an unauthenticated caller cannot stream 66KB
  before rejection. 409 branch matches only the literal "already seeded"
  error; every other throw propagates unswallowed. showError touches only the
  error box, so typed input survives the focus move. The EDIT_KEY test's
  cleanup IS in a try/finally, so a failing assertion cannot leak the key into
  later tests. "Überschrift" passes the name check and slugifies to
  "berschrift" — consistent with the existing ASCII-only slugify, not a new
  regression.
Task 12: complete (commits 8114e52..72a0670, 1 fix round, 139/139 suite)

**R39 — Ruling: export must not loop getEntryBySlug per entry.**
Found by me while preparing Task 13, before any implementer saw it. exportJson
called getEntryBySlug for every row, and that helper issues 2 queries — 1,838
sequential D1 round trips for 918 entries, on every export AND every nightly
cron backup. It would pass locally and then be the thing that breaks in
production, where CPU time and subrequest limits actually bite. Replaced with
exportRows(db): one query for entries, one for category memberships, assembled
in JS. Cost if wrong: exportRows must keep the same shape getEntryBySlug
returned (hydrated JSON columns plus a `categories` array ordered
is_primary DESC), which the round-trip test will catch if it drifts.
Task 13: dispatched (sonnet) — export, import, nightly R2 backup.

**R40 — Ruling: split table rows on unescaped pipes only.**
The Task 13 implementer flagged this as latent and out of its file scope, and
was right on both counts — but wrong that it does not matter. I reproduced it
and it is worse than reported: a pipe in a DEFINITION mis-splits the row
(term becomes "Pipe Table | Columns split by a \"), and a pipe at the END of a
definition DROPS THE ROW ENTIRELY. Since the exporter escapes pipes and
editing is open, one person typing "|" into a definition silently loses that
entry on re-import — breaking the exact acceptance check Task 13 owns. Replaced
the greedy /^\|(.+)\|(.+)\|$/ with a split on /(?<!\)\|/ requiring exactly
four parts. Verified all four pipe placements plus the no-pipe control against
the patched parser before dispatching. Cost if wrong: none; the no-pipe path
is unchanged and the 45/1,001/918 counts must still hold.

**R41/R42 — the Task 13 implementer's own two finds, accepted as shipped:**
importJson had no shape validation, so an unvalidated `templates` key reached
exportEntryHtml's `<h2>${format}</h2>` — which lands in a DOWNLOADED,
UNSANDBOXED HTML file, the one place render() output escapes the iframe. It
added entry-shape validation plus defensive escaping. And a missing
`definition` would hit D1's bind(undefined) and abort the WHOLE batch rather
than one row. Both are real; neither weakened a test.
Task 13: implementer DONE (commit 2392a8a; 5 new tests, 144/144). Real
  round-trip against wrangler dev: 45 categories, 918 rows, 918 unique names,
  0 missing / 0 extra vs export.json, and a full import round trip returning
  {"imported":918}.
Task 13: fix round 1/5 dispatched — the parser row-split fix.
Task 13: reviewer — spec ❌ (SQL outside db.js), quality Changes needed.
  Verified all three earlier fixes correct: exportRows matches getEntryBySlug's
  shape exactly; every import attack rejected BEFORE any DB write ("any DB
  write occurred: false"); parser fix survived regression probes (3-column
  rows, |||, empty cells, non-table lines). Round trip held for literal
  backslashes, trailing backslashes and multi-backslash sequences.

**R43 — Ruling: import must be able to RESTORE, not just update.**
The most consequential finding of the task. POST /api/import only ran
UPDATE ... WHERE slug=?, so restoring the nightly backup after entries were
deleted would return {"imported":918} while restoring NOTHING. The feature
whose entire purpose is durability could not perform its one job, and would
have reported success while doing so. Replaced with db.importEntries():
upserts entries, INSERT OR IGNOREs categories, rebuilds entry_categories
membership, snapshots every overwritten row into revisions first. The dead
payload.categories validation becomes live. Cost if wrong: a restore now
writes more than before, which is why it snapshots first.

**R44 — Ruling: import SQL moves into db.js.** Five raw prepare/batch calls
sat in src/api/import.js, breaking the "only file containing SQL" constraint
every other route honours. My brief's Step 5 template caused it. Architectural
constraints only hold if they hold everywhere.

**R45 — Ruling: test the ESCAPE half of the pipe round trip.**
The reviewer found the coverage one-sided: deleting cell()'s pipe-escaping in
export.js would go unnoticed, because no cell in the real corpus contains "|".
The new parser test covers only the unescape side. Added a test that writes a
pipe into a real definition, exports, and re-parses — exercising both halves
against real data. This is the same lesson as R40 from the other direction:
"the corpus does not contain X today" is not coverage.
Task 13: parked (deliberate): markdown export collapses newlines in a
  definition to a space, so it is lossy for multi-line definitions. A newline
  would break the table row; JSON is the lossless format.
Task 13: fix round 2/5 dispatched — 3 Important.
Task 13: fix round 2/5 (commit 9516528; 2 new tests, 147/147; corpus counts
  unchanged). Restore verified LIVE: hard-deleted Toast -> 404, imported the
  prior backup -> {"imported":918,"created":1} -> 200, and entry_categories
  membership rebuilt correctly to feedback-status/primary.
Task 13: controller verified no SQL remains outside db.js on the request path
  (src/api/import.js now only validates and delegates).

**R46 — Ruling: state the SQL-location constraint accurately rather than
enforce a rule that was never true.** Checking R44's fix showed src/seed/run.js
has held its own bulk INSERTs since Task 4 — so "db.js is the only file
containing SQL" has been false, and unenforced, for most of the build. Two
options: move ~70 lines of seeding into db.js (where a 2,000-statement batch
built from parsed markdown is not "one function per operation" and would
obscure both), or say what I actually meant. Amended plan and spec to
"every request-path D1 query", with the seeder explicitly carved out. A
constraint everyone quietly steps around is worse than a narrower one that
holds. Cost if wrong: the final review may still prefer the move; the carve-out
is now explicit rather than an unexamined inconsistency.
Task 13: re-review — all 3 findings ADDRESSED. Snapshot loop confirmed to run
  strictly BEFORE the upsert (reading `before` prior to any write), so undo is
  meaningful rather than capturing the new value. `created` filters against the
  pre-upsert set. The membership guard `continue`s past entries with empty or
  malformed `categories`, so the DELETE never fires for them — a malformed
  payload cannot strip an entry's memberships. The pipe test genuinely
  exercises the ESCAPE half (it fails if cell()'s escaping is removed), and the
  restore test asserts membership, not just row presence.
Task 13: complete (commits 0bc93fe..9516528, 2 fix rounds, 147/147 suite)
Task 14: pre-dispatch check — all ten example slugs resolve to the right
  core-tier components (button/card/modal/toast/tab-bar/badge/text-input/
  select/accordion/table), confirming R8's namespacing holds where it matters:
  /e/select is the Select component, not the <select> tag.
Task 14: dispatched (sonnet) — ten authored core examples.

**R47 — Ruling: the unquoted-attribute warning must require tag context.**
The Task 14 implementer hit my warning firing on `disabled = {{d}}` in React
templates — an assignment, not an attribute — and silenced it with
`{{{disabled}}}`. Reasonable given the constraint, but the constraint was
wrong, and the incentive it created is the real defect: the ONLY way to quiet a
security warning was to disable escaping. A warning that pushes authors toward
less safety is worse than no warning. Now requires an unclosed `<` before the
placeholder; verified silent on JS assignments, still firing on real unquoted
attributes and event handlers. Raw braces reverted so those values are escaped
again. Cost if wrong: a placeholder in an unquoted attribute inside something
that does not look like a tag would go unwarned — no such shape exists in the
three template formats.

**R48 — Ruling: the specimen plate gets the wide column; carried into Task 15.**
The implementer reported Table and Modal needing horizontal scroll and judged
it inherent. Right that it is pre-existing, wrong that it is inherent — I
measured it rather than accept either reading. At 1280px: main 1152px, but
main.entry is a 709px / 355px grid with the SPECIMEN in the narrow column,
leaving the iframe 179px. So the body text had the spotlight and the design's
one expressive moment had the sidebar — a direct inversion of "the element
itself centred and given generous room". Routed to Task 15 (the layout pass)
rather than Task 14 (content), with a Playwright assertion that the stage
exceeds half the main width so it cannot silently regress. Cost if wrong: the
prose measure narrows; capped at 42rem so it still reads as book text.
Task 14: implementer DONE (commit c3ea743; 31 example tests, 178/178). Per-
  entry browser verification for all ten. It found that text-input's and
  select's Tailwind tabs never referenced their colour control at all — a
  silent tab-disagreement that only the browser check could catch.
Task 14: fix round 1/5 dispatched — revert the raw-brace workaround, fix the
  warning heuristic underneath it.
Task 14: reviewer — spec ✅, quality Changes needed (1 Critical, 3 Important,
  3 Minor). Per-entry browser table confirmed all ten render with zero console
  errors and colour reaching all three tabs.

**R49 — Ruling: insideTag must be quote-aware; my R47 fix had a false
negative.** I asked the reviewer to probe for exactly this and it found one:
`<div title="a > b" class={{x}}>` stopped warning, because the
lastIndexOf(">") shortcut mistakes a literal > inside an earlier attribute
value for the tag's close. The same defeat silenced the EVENT-HANDLER warning,
which is the case where escaping provably cannot help — so my noise fix traded
away real coverage. Replaced with a scanner tracking quoted spans; verified
against nine shapes including script bodies, text content and self-closing svg.
Lesson: loosening a security check to remove noise needs a false-negative probe
in the same breath, not later.

**R50 — Ruling: the `variant` control must reach all three formats (Critical).**
The reviewer found `variant` referenced by html and react but ABSENT from the
tailwind template in 9 of 10 entries — switching Variant leaves the Tailwind
tab byte-identical. The implementer had fixed exactly this class for `colour`
on two entries and not generalised it. This breaks the site's central promise
("the same control values feed all three formats so the tabs always agree"):
someone copies Tailwind code that does not match what they configured. Fixed
by authoring the variant into the Tailwind templates AND adding a test for the
converse direction — the existing test asserts every placeholder is a known
control; the new one asserts every control is actually used, per format.
Cost if wrong: none; the test makes the whole class unreintroducible.
Task 14: also fixing — Modal has no role="dialog"/aria-modal in any format
  (these are specimens people copy, so an inaccessible pattern propagates);
  Table <th> missing scope="col"; Tab Bar missing tablist/tab roles and
  aria-current; Toast missing role="status".
Task 14: fix round 2/5 dispatched.
Task 14: fix round 2/5 (commit 7174b30; 190/190 — 10 "references every
  control" tests + 1 insideTag regression). Controller re-verified
  independently: every control is referenced in all three formats, and every
  select OPTION renders a distinct output in all three — so R50 is fixed in
  substance, not just in reference-counting.
Controller note: my first verification probe reported modal BAD. The probe was
  wrong, not the modal — it compared the control's default against
  options.at(-1), and modal's default IS the last option, so it diffed a value
  against itself. Caught by diagnosing before reporting. Worth recording
  because I nearly sent an implementer chasing a defect that did not exist:
  a failing check is a claim about the checker as much as the code.
Task 14: re-review — all findings ADDRESSED. The reviewer validated the new
  regression test properly: it fed the test the RECONSTRUCTED PRE-FIX Tailwind
  template and confirmed it flags missing:['variant'] — so the test catches the
  original defect rather than merely counting references. Modal's
  aria-labelledby targets a static id, so it stays valid as the title changes.
  insideTag probes: unterminated quote biases toward OVER-warning (safe
  direction); "<" in plain text latches inTag, but identically in the original
  code, so pre-existing, not a regression. 2000-quote adversarial input: 7ms,
  linear, no hang.
Task 14: complete (commits ad3dd0d..7174b30, 2 fix rounds, 190/190 suite)
Task 14: CARRIED INTO TASK 15 (one Minor, deliberately not a third round):
  tab-bar uses role="tablist"/role="tab" together with aria-current. Those are
  two different patterns — a tablist uses aria-selected + aria-controls, while
  aria-current="page" belongs on navigation links. It matches what I asked for
  literally, but it is incoherent ARIA in a specimen people will copy, so it
  should be one pattern or the other. Task 15 is the accessibility pass and is
  already driving Playwright.
Task 15: dispatched (sonnet) — responsive, accessibility, acceptance suite.
Task 15: implementer DONE (commit 57d7745; vitest 190/190, Playwright
  acceptance 10/10, stable across 30 sequential reruns).
Task 15: controller verified the two things that most needed it —
  (a) LAYOUT FIX, measured before and after at 1280px:
        before  specimen 355  plate 275  stage 227  iframe 179
        after   specimen 1104 plate 760  stage 712  iframe 664
      and innerScrollWidth now equals the frame width for table and modal, so
      the horizontal scrolling Task 14 reported is gone. Mobile at 390px: zero
      horizontal overflow on /, /e/button and /e/table; plate 342px.
  (b) REDUCED MOTION genuinely discriminates: 62 moving elements on / and 9 on
      /e/button with no emulation, 0 with. The test is not vacuous — it would
      fail loudly if a stray rule escaped the media block.
  Tab Bar ARIA now coherent: <nav> + aria-current, no tablist roles, identical
  across all three formats. Right pattern, since the glossary defines Tab Bar
  as "Navigation between related views".
Task 15: CONTROLLER COULD NOT REPRODUCE the implementer's justification for
  the one test it altered. It swapped test.use({reducedMotion:"reduce"}) for
  page.emulateMedia(...), claiming the context option is a no-op in this
  Playwright/Chromium/Windows combination. In my probe
  browser.newContext({reducedMotion:"reduce"}) DID work — 0 moving elements.
  The outcome is sound either way (the assertion discriminates), but the
  stated reason does not hold up, which usually means the original usage was
  mis-scoped rather than inert. Routed to the reviewer to settle.

**R51 — Ruling: the both-themes acceptance test was vacuous; make it
discriminate.** The single most important finding of Task 15, and my defect
(the test came from my brief). Traced tokens.css: the aurora stops --mint/
--blush/--sky/--lavender are defined once on :root and NEVER redefined per
theme, so getComputedStyle(::before).backgroundImage is byte-identical in light
and dark. Every other assertion in the loop — catalogue ref, stamp text,
visibility — is theme-independent too. The test would pass with the entire
[data-theme="dark"] block deleted, so the for-loop over ["light","dark"] was
decorative. Now captures plate ::before opacity, plate background and page
foreground per theme and asserts they differ. Cost if wrong: none. This is the
exact failure mode I asked the reviewer to hunt — a test that passes without
discriminating is worse than no test, because an acceptance suite is the
artifact people trust INSTEAD of re-checking.

**R52 — Ruling: cover spec check 4 in the acceptance suite.** Section 12 lists
eight checks; the suite's own header claimed to encode them but omitted
"exported markdown re-imports cleanly with no data loss". It IS covered by
vitest and was verified live in Task 13 — but the suite overstating its own
coverage is the problem, because that file is what someone reads to decide
whether the build meets its brief. Added an e2e test re-parsing the HTTP
markdown export with the seeder's own parser.

**R53 — Ruling: soften the misleading tooling comment.** The implementer's
swap to page.emulateMedia is correct and kept, but its comment asserts
test.use({reducedMotion}) "is a no-op in this Playwright/Chromium/Windows
combination" — and my probe showed newContext({reducedMotion:"reduce"}) works.
The likelier cause is a mis-scoped test.use. Wrong explanations in comments
outlive the code they describe.
Task 15: fix round 1/5 dispatched — 1 Critical, 1 Important, 2 Minor.
Task 15: fix round 1/5 (commit 73a7f65; vitest 190/190, Playwright 11/11). The
  implementer did the proof I asked for: it neutralised [data-theme="dark"],
  confirmed the theme test now FAILS, then restored and confirmed it passes.
  A test claiming to catch a regression, shown catching it.
Task 15: controller verified statically — theme test asserts opacity, plateBg
  and pageFg differ between themes; the re-import acceptance test exists;
  11 tests total. The emulateMedia comment is now honest: it states what was
  observed, admits the root cause was not isolated, AND records my
  counter-evidence that newContext({reducedMotion}) does work. That is the
  right shape for a comment about a tooling oddity.

**R54 — Ruling: guard the destructive remote schema step.** Found while
reviewing Task 16's brief before dispatch. `npm run db:remote` applies
schema.sql, which opens with DROP TABLE for all five tables — so it ERASES
every entry, revision and edit in production. Correct exactly once, on an empty
database, on the first deploy; catastrophic every time after. It sat in a
runbook with no warning at all, which is how a deploy step becomes a data-loss
incident six months later when someone re-runs "the deploy steps". Now requires
checking the remote entry count first, proceeding only on "no such table" or 0,
and exporting before deciding otherwise. Cost if wrong: one extra command on a
first deploy.

**R55 — Ruling: fix the broken production-seed curl.** The documented command
contained a literal backslash-n rather than a line continuation, so it would
not run as written. Introduced by my own earlier patch.

Also added a pre-flight note that the custom-domain binding needs the
clydeford.net zone in the Cloudflare account, with a workers.dev fallback, so a
missing zone is diagnosed as infrastructure rather than mistaken for a code
failure — and an explicit instruction not to fake the domain.
Task 16: dispatched (sonnet) — deployment. THE ONLY OUTWARD-FACING TASK.
Task 15: controller independently ran the three highest-risk acceptance tests
  in its own shell (the earlier attempt produced no output because I piped
  through `tail`, which buffers to completion — my command's fault):
    the Button plate in both themes ....... PASS (now discriminating, R51)
    exported markdown re-imports cleanly .. PASS (newly added, R52)
    reduced motion plays no animation ..... PASS
  3 passed in 1.3m, exit 0. Combined with the implementer's neutralisation
  proof, the theme test is confirmed to both pass when correct and fail when
  the dark block is removed.
Task 15: complete (commits 7174b30..73a7f65, 1 fix round, vitest 190/190 +
  Playwright 11/11)
Task 16: implementer DONE (commit ef6c86a). Guard check returned "no such
  table" (fresh DB) so the destructive schema step was safe; custom domain
  bound first try (zone exists); cron 0 3 * * * registered and double-confirmed
  via the Cloudflare API; seed succeeded in ONE atomic batch with exact counts
  {"categories":45,"entries":918,"core":61,"examples":10} — R11's batch-size
  risk did NOT materialise against production D1; 14 live Playwright checks
  passed against production.
Task 16: controller independently verified the LIVE site —
  /healthz ok; /api/index.json 918 entries; all ten authored examples present
  with has_example=1; R8 confirmed in production (/e/button = Button BTN-001
  Buttons & Actions, /e/button-element = button SEM-025 Semantic HTML
  Elements, same for select); markdown export re-parsed with the SEEDER'S OWN
  parser gives 45 categories / 918 rows / 918 unique; POST /api/seed returns
  409 (R36's fix — previously an uncaught 500).
Task 16: complete (commit ef6c86a). SITE LIVE at https://artifacts.clydeford.net
Task 16: open — the first R2 backup object cannot be verified until the cron
  fires at 03:00 UTC on 2026-08-19. Registration is confirmed; the object is
  not. Carry to the next session.

## Final whole-branch review (opus) — verdict: fix first, then ship

**R56 — CRITICAL, third stored XSS, live-exploitable.** controlHtml() in
public/js/tweak.js builds control markup by raw concatenation with ZERO
escaping and assigns via panel.innerHTML. c.label, c.options[], c.default,
c.presets[], c.min/max/step are all attacker-controlled, and validate() checks
only c.id and c.type. Editing is open and there is no CSP, so a hostile label
executes in the TOP-LEVEL origin — not the sandboxed iframe. I verified the
source myself rather than exploiting production. Why every prior review missed
it: both earlier XSS bugs were server-rendered, every XSS test is server-side,
and controlHtml had NO TEST AT ALL. Fixing at both layers — escape at render,
validate at write.

**R57 — the escaping story was six implementations, not three.** Byte-identical
5-char copies in layout.js, template.js, entry.js and palette.js; a DIVERGENT
3-char copy in export.js (missing " and '); and none in tweak.js. Duplication
is why two drifted, and the two that drifted are the two that are wrong.
Consolidating on a single escapeHtml exported from public/js/template.js — the
one module both runtimes already share. layout.js's stringify stays separate
on purpose: escape-by-default inside a tagged template with raw() as the
opt-out is a genuinely different contract. The reviewer's sharpest point: the
server-side rule "escaping is the default, raw() is the exception" never
crossed into the browser renderers, where innerHTML is the default and nothing
is the exception. The palette bug was that rule's first casualty; controlHtml
is the second.

**R58 — a category-less imported entry 500s its page AND bricks export
site-wide.** import.js never requires categories; entry.js and export.js both
dereference primary unguarded, so ONE bad payload makes /api/export.md return
500 for the whole corpus, permanently. Import is open.

**R59 — nested {{#if}} blocks leak.** Non-greedy body means an outer block
closes on the inner {{/if}}: render('{{#if a}}OUT{{#if b}}IN{{/if}}TAIL{{/if}}',
{a:false}) -> "TAIL{{/if}}". Latent (no authored example nests) but a
correctness bug, distinct from the O(n^2) perf note I had parked.

**R60 — import is the only path where a slug bypasses slugify**, and it reaches
a content-disposition filename, giving filename spoofing.

**R61 — RULING on the empty-catalogue reports from Steven.** He reported
"mostly seeing 'No specimen mounted yet'" and "lots of categories are empty".
Measured: tiers are {core: 61, reference: 857} — NOTHING is ever assigned
`useful`, yet TIERS.default is ["core","useful"], so the default view collapses
to core-only, hiding 857 of 918 entries and leaving 32 of 45 categories
completely empty. The design spec's "defaults to core and useful" assumed a
populated useful tier that no code path creates. My defect, in the spec and
carried through every task. No test caught it because every test asserts on
specific entries or counts, never on whether the default view is reasonable.
Ruled: default to all live tiers and relabel the filter honestly. The specimen
placeholder is separate and NOT a bug — 10 of 918 entries have authored
examples by design, and I verified all ten render live.
Deferred-item triage from the final review: all six judged fine to leave,
EXCEPT that the O(n^2) block note concealed the R59 correctness bug.
Final fix wave: commits 33693d8 (security + coherence) and 6a68a23 (tier
  default). 209/209 vitest, 11/11 Playwright, deployed to production.
Controller verified the fixes on the LIVE site and by exploitation:
  - tier fix live: / now renders 918 cards; previously-empty categories now
    populated (accessibility 19, semantic-html-elements 32, ui-fundamentals 20,
    motion-animation 23).
  - controlHtml was extracted to a new public/js/controls.js — a genuinely
    better fix than escaping in place, because tweak.js touches `document` at
    module scope and so could never be imported by the Workers test pool. That
    is WHY controlHtml had no test; the split removes the cause, not just the
    symptom.
  - deployed controls.js is byte-identical to local and escapes throughout.
  - EXPLOIT ATTEMPTED LOCALLY (never against production): POSTed the review's
    exact payload to a local wrangler dev, loaded the page in real Chromium.
    window.__pwned undefined, zero <img> nodes injected, label rendered as
    escaped text. Proof by exploitation, not by code reading.
  - local test row reset; production confirmed untouched (918 entries, 10 with
    examples, badge's controls_schema is the authored one).
