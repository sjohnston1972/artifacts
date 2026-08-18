// Validates every examples/*.json against the contract the authored examples
// must satisfy. Run this before applying anything — it is the same set of
// checks tests/examples.test.js enforces for the original ten, but it works
// over the whole directory without needing each file wired into a test.
//
//   node scripts/check-examples.mjs
//
// Checks, per file:
//   1. parses, and has slug / controls_schema / templates
//   2. slug matches the filename
//   3. every template renders with ZERO warnings (so: no unknown placeholders,
//      no placeholder in an unquoted attribute, none in an event handler)
//   4. every control declared is referenced by EVERY format — the defect that
//      let `variant` silently do nothing in the Tailwind tab
//   5. every select option produces a DISTINCT rendered output per format,
//      so a referenced-but-ignored control cannot pass check 4 vacuously
//   6. all three formats present and non-empty

import fs from "node:fs";
import path from "node:path";

const { render, defaultsFor } = await import("../public/js/template.js");

// Boolean HTML attributes — presence alone makes them true.
const BOOL_ATTRS = [
  "checked", "disabled", "selected", "required", "readonly", "open", "hidden",
  "multiple", "autofocus", "novalidate", "loop", "muted", "controls",
  "playsinline", "reversed", "ismap", "async", "defer",
];
const BOOL_ATTR_RE = new RegExp(
  String.raw`\b(${BOOL_ATTRS.join("|")})\s*=\s*["']\{\{`, "g"
);

// Optional slug arguments scope the run to just those files. Authors working
// concurrently must scope to their own category, or one author can see
// another's half-written file and "fix" work that is not theirs.
//   node scripts/check-examples.mjs            -> everything
//   node scripts/check-examples.mjs hero grid  -> just those two
const only = new Set(process.argv.slice(2));
const dir = "examples";
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "PLAN.json")
  .filter((f) => only.size === 0 || only.has(f.replace(/\.json$/, "")));
const problems = [];

for (const file of files) {
  const label = file.replace(/\.json$/, "");
  let ex;
  try {
    ex = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  } catch (e) {
    problems.push([label, `unparseable JSON: ${e.message}`]);
    continue;
  }

  if (!ex.slug) problems.push([label, "missing slug"]);
  else if (ex.slug !== label) problems.push([label, `slug "${ex.slug}" does not match filename`]);
  if (!Array.isArray(ex.controls_schema) || ex.controls_schema.length === 0) {
    problems.push([label, "controls_schema missing or empty"]);
    continue;
  }
  if (!ex.templates || typeof ex.templates !== "object") {
    problems.push([label, "templates missing"]);
    continue;
  }

  for (const f of ["html", "tailwind", "react"]) {
    if (!ex.templates[f] || !String(ex.templates[f]).trim()) {
      problems.push([label, `template "${f}" missing or empty`]);
    }
  }

  const values = defaultsFor(ex.controls_schema);
  const ids = ex.controls_schema.map((c) => c.id);

  for (const [fmt, tpl] of Object.entries(ex.templates)) {
    const { warnings } = render(tpl, values);
    if (warnings.length) problems.push([label, `${fmt}: ${warnings.join("; ")}`]);

    const used = new Set(
      [...String(tpl).matchAll(/\{\{[#/]?(?:if |unless )?\s*([\w-]+)\s*\}?\}\}/g)]
        .map((m) => m[1])
        .filter((id) => !["if", "unless"].includes(id))
    );
    const missing = ids.filter((id) => !used.has(id));
    if (missing.length) problems.push([label, `${fmt}: never references ${missing.join(", ")}`]);
  }

  // HTML boolean attributes are PRESENCE-based: `checked="false"` is still
  // checked. Interpolating a toggle straight into one therefore renders a
  // specimen that contradicts its own control, and no other check here can
  // see it — the template is well-formed, every control is referenced, and
  // every option renders distinctly. Found by an author, not by a test.
  for (const [fmt, tpl] of Object.entries(ex.templates)) {
    const bad = [...String(tpl).matchAll(BOOL_ATTR_RE)].map((m) => m[1]);
    if (bad.length) {
      problems.push([label, `${fmt}: boolean attribute(s) interpolated instead of {{#if}}: ${[...new Set(bad)].join(", ")}`]);
    }
  }

  for (const c of ex.controls_schema.filter((c) => c.type === "select")) {
    for (const [fmt, tpl] of Object.entries(ex.templates)) {
      const outs = new Set(c.options.map((o) => render(tpl, { ...values, [c.id]: o }).output));
      if (outs.size !== c.options.length) {
        problems.push([label, `${fmt}: control "${c.id}" renders ${outs.size} distinct outputs for ${c.options.length} options`]);
      }
    }
  }
}

console.log(`checked ${files.length} example file(s)`);
if (problems.length === 0) {
  console.log("all clean");
} else {
  console.log(`${problems.length} problem(s):`);
  for (const [f, why] of problems.slice(0, 40)) console.log(`  ${f}: ${why}`);
  process.exit(1);
}
