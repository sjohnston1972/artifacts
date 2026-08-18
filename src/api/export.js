import * as db from "../db.js";
import { render, defaultsFor, escapeHtml } from "../../public/js/template.js";

// One query for entries, one for category memberships (exportRows in
// db.js), assembled in JS. A per-entry getEntryBySlug loop would issue 2
// queries per row — 1,838 sequential D1 round trips for 918 entries, on
// every export request AND every nightly cron backup.
export async function exportJson(dbc) {
  const categories = await db.listCategories(dbc);
  const entries = await db.exportRows(dbc);
  return { version: 1, exported_at: new Date().toISOString(), categories, entries };
}

// A cell may not contain a bare pipe or the table breaks. Escaping keeps the
// markdown round-trip lossless; parseGlossary's cell() unescapes \| back to
// | on the way in.
function cell(text) {
  return String(text ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();
}

export async function exportMarkdown(dbc) {
  const { categories, entries } = await exportJson(dbc);
  const byCategory = new Map(categories.map((c) => [c.id, []]));
  for (const e of entries) {
    // A category-less imported entry has no primary — skip it rather than
    // throwing on primary.id, which used to 500 this route (and therefore
    // /api/export.md for the whole corpus) permanently until that one row
    // was fixed by hand.
    const primary = e.categories.find((c) => c.is_primary);
    if (primary) byCategory.get(primary.id)?.push(e);
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

// Downloaded and opened outside the site, unsandboxed — the one place
// render() output lands in a document that is NOT the sandboxed iframe. Every
// piece of entry-authored text is escaped for its context; only the rendered
// example markup itself is left raw, because rendering it IS the point.
export function exportEntryHtml(entry) {
  const values = defaultsFor(entry.controls_schema);
  const example = entry.templates.html ? render(entry.templates.html, values).output : "";
  const code = Object.entries(entry.templates)
    .map(([format, tpl]) => `<h2>${escapeHtml(format)}</h2><pre><code>${escapeHtml(
      render(tpl, values).output)}</code></pre>`).join("");
  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="script-src 'none'">
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
