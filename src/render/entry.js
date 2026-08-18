import { html, raw, layout } from "./layout.js";
import { specimenPlate, tierBadge, definitionOnlyBadge, firstLine } from "./components.js";
import { defaultsFor, escapeHtml } from "../../public/js/template.js";

const FORMAT_LABELS = { html: "HTML + CSS", tailwind: "Tailwind CSS", react: "React" };

export function renderEntry({ entry }) {
  const formats = Object.keys(FORMAT_LABELS).filter((k) => entry.templates[k]?.trim());
  const values = defaultsFor(entry.controls_schema);
  // A category-less imported entry (import.js does not require categories)
  // must not 500 its own page — fall back to no backlink rather than
  // throwing on entry.categories[0].slug.
  const primary = entry.categories?.[0] ?? null;

  const body = html`
    <main id="main" class="entry">
      <header class="entry__header entry__prose">
        ${primary ? raw(html`<a class="backlink" href="/c/${primary.slug}">← ${primary.name}</a>`) : ""}
        <div class="entry__title">
          <h1>${entry.name}</h1>
          ${raw(tierBadge(entry.tier))}${raw(definitionOnlyBadge(entry.has_example))}
        </div>
        <p class="entry__def">${entry.definition}</p>
        ${entry.aliases.length ? raw(html`
          <p class="entry__aliases">Also known as ${entry.aliases.join(", ")}</p>`) : ""}
      </header>

      ${entry.has_example ? raw(exampleSection(entry, formats, values)) : raw(noExample(entry))}

      ${entry.notes ? raw(html`
        <section class="entry__section entry__prose">
          <h2>Also defined in other sections</h2>
          <div class="prose">${raw(notesToHtml(entry.notes))}</div>
        </section>`) : ""}

      <section class="entry__section entry__prose">
        <h2>Categories</h2>
        <ul class="chips">${entry.categories.map((c) => raw(html`
          <li><a class="chip" href="/c/${c.slug}"><span class="chip__code">${c.code}</span> ${c.name}</a></li>`))}</ul>
      </section>

      <section class="entry__section entry__actions entry__prose">
        <a href="/e/${entry.slug}/edit">Edit</a>
        <a href="/e/${entry.slug}/history">History</a>
        <a href="/e/${entry.slug}/export.html" download>Download standalone HTML</a>
      </section>
    </main>`;

  return layout({
    title: entry.name,
    description: firstLine(entry.definition),
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
      ${specimenPlate({
        entry,
        children: html`<iframe class="stage" title="Live example of ${entry.name}"
                        sandbox="allow-scripts" loading="lazy"></iframe>`,
      })}
      <div class="tweaks">
        <h2>Adjust</h2>
        <div class="tweaks__controls"></div>
        <button type="button" class="tweaks__reset">Reset</button>
      </div>
      <div class="code">
        <div class="code__tabs" role="tablist">
          ${formats.map((f, i) => raw(html`
            <button type="button" role="tab" class="code__tab" data-format="${f}"
                    id="tab-${entry.slug}-${f}" aria-controls="panel-${entry.slug}-${f}"
                    aria-selected="${i === 0 ? "true" : "false"}"
                    tabindex="${i === 0 ? "0" : "-1"}">${FORMAT_LABELS[f]}</button>`))}
        </div>
        ${formats.map((f, i) => raw(html`
          <div class="code__panel" role="tabpanel" data-format="${f}"
               id="panel-${entry.slug}-${f}" aria-labelledby="tab-${entry.slug}-${f}"${i === 0 ? "" : " hidden"}>
            <pre><code></code></pre>
            <button type="button" class="copy" data-copy>Copy</button>
          </div>`))}
      </div>
    </section>`;
}

function noExample(entry) {
  return html`
    <div class="entry__section">
      ${specimenPlate({
        entry,
        children: html`<p class="stage stage--empty">No specimen mounted yet.
          <a href="/e/${entry.slug}/edit">Write one</a>.</p>`,
      })}
    </div>`;
}

// notes is user-editable, so the raw text is HTML-escaped FIRST and only
// then are the (still-plain-asterisk) **bold** markers turned into
// <strong> tags. Doing it in the other order — matching **...** on the raw
// text and splicing in real <strong> tags before escaping — would let any
// HTML in the surrounding note text through unescaped, which is exactly the
// stored-XSS class the command-palette review caught earlier in this plan.
function notesToHtml(notes) {
  return String(notes)
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`)
    .join("");
}
