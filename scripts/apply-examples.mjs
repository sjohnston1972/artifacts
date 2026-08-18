// Applies examples/*.json to a running compendium.
//
// Why HTTP rather than bundling: loadExamples() used static imports, which is
// fine for ten files and untenable for ~900 — it would bloat the Worker bundle
// with content that is really data. Posting through the normal write API also
// means every applied example gets a revision, exactly like a human edit, and
// it works against the live site without a redeploy.
//
//   node scripts/apply-examples.mjs http://127.0.0.1:8787
//   node scripts/apply-examples.mjs https://artifacts.clydeford.net --only forms
//
// --only <substr>  apply just the files whose slug contains substr
// --dry            report what would change, write nothing

import fs from "node:fs";
import path from "node:path";

const base = process.argv[2];
if (!base) {
  console.error("usage: node scripts/apply-examples.mjs <base-url> [--only sub] [--dry]");
  process.exit(1);
}
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx > -1 ? process.argv[onlyIdx + 1] : null;
const dry = process.argv.includes("--dry");

const dir = "examples";
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "PLAN.json")
  .filter((f) => !only || f.includes(only));

let ok = 0;
const failed = [];

for (const file of files) {
  let ex;
  try {
    ex = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  } catch (e) {
    failed.push([file, `unparseable: ${e.message}`]);
    continue;
  }
  if (!ex.slug || !ex.templates || !ex.controls_schema) {
    failed.push([file, "missing slug/templates/controls_schema"]);
    continue;
  }
  if (dry) {
    ok++;
    continue;
  }
  const res = await fetch(`${base}/api/entries/${ex.slug}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      controls_schema: ex.controls_schema,
      templates: ex.templates,
    }),
  });
  if (res.ok) {
    ok++;
  } else {
    let detail = `${res.status}`;
    try {
      detail += " " + JSON.stringify(await res.json());
    } catch {}
    failed.push([ex.slug, detail]);
  }
}

console.log(`${dry ? "would apply" : "applied"}: ${ok}/${files.length}`);
if (failed.length) {
  console.log(`failed: ${failed.length}`);
  for (const [f, why] of failed.slice(0, 20)) console.log(`  ${f}: ${why}`);
  process.exit(1);
}
