// Renders every example's HTML template in a real browser and reports the ones
// that come out broken. The text validator cannot see any of this: a specimen
// can reference every control, warn about nothing, and still paint an empty
// box, throw in the iframe, or collapse to zero height.
//
//   node scripts/render-examples.mjs            all
//   node scripts/render-examples.mjs hero grid  just those
//
// Flags, per example:
//   - a page error or console error inside the frame
//   - rendered content narrower/shorter than a few pixels (nothing painted)
//   - a body with no visible text AND no non-trivial element (blank specimen)

import fs from "node:fs";
import { chromium } from "@playwright/test";

const { render, defaultsFor } = await import("../public/js/template.js");
const { buildDocument } = await import("../public/js/generate.js");

const only = new Set(process.argv.slice(2));
const files = fs
  .readdirSync("examples")
  .filter((f) => f.endsWith(".json") && f !== "PLAN.json")
  .filter((f) => only.size === 0 || only.has(f.replace(/\.json$/, "")));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 660, height: 900 } });
const problems = [];

for (const file of files) {
  const slug = file.replace(/\.json$/, "");
  const ex = JSON.parse(fs.readFileSync(`examples/${file}`, "utf8"));
  const values = defaultsFor(ex.controls_schema);
  const doc = buildDocument(ex.templates.html, values, "light");

  const errs = [];
  const onErr = (e) => errs.push(String(e.message ?? e));
  const onConsole = (m) => {
    if (m.type() === "error") errs.push("console: " + m.text());
  };
  page.on("pageerror", onErr);
  page.on("console", onConsole);

  await page.setContent(doc, { waitUntil: "load" });
  const m = await page.evaluate(() => {
    const b = document.body;
    const r = b.getBoundingClientRect();
    const text = (b.innerText || "").trim();
    const painted = [...b.querySelectorAll("*")].filter((el) => {
      const box = el.getBoundingClientRect();
      return box.width > 2 && box.height > 2;
    }).length;
    return { w: Math.round(r.width), h: Math.round(r.height), textLen: text.length, painted };
  });

  page.off("pageerror", onErr);
  page.off("console", onConsole);

  if (errs.length) problems.push([slug, `error in frame: ${errs[0].slice(0, 90)}`]);
  else if (m.h < 8 || m.w < 8) problems.push([slug, `rendered ${m.w}x${m.h} — nothing painted`]);
  else if (m.painted === 0 && m.textLen === 0) problems.push([slug, "blank specimen: no text, no painted element"]);
}

await browser.close();

console.log(`rendered ${files.length} example(s) in a real browser`);
if (problems.length === 0) {
  console.log("all render");
} else {
  console.log(`${problems.length} problem(s):`);
  for (const [s, why] of problems.slice(0, 40)) console.log(`  ${s}: ${why}`);
  process.exit(1);
}
