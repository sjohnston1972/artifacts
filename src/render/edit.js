import { html, raw, layout } from "./layout.js";

// slug is deliberately never a field here: it is immutable (db.saveEntry's
// SET clause omits it) and this form must not be able to imply otherwise.
// has_example is likewise absent — it is derived from templates.html by
// saveEntry, never set directly.
const TIERS = ["core", "useful", "reference", "deleted"];
const TIER_LABELS = { core: "Core", useful: "Useful", reference: "Reference", deleted: "Deleted" };

export function renderEditPage({ entry }) {
  const body = html`
    <main id="main" class="edit-page">
      <a class="backlink" href="/e/${entry.slug}">← ${entry.name}</a>
      <h1>Edit ${entry.name}</h1>
      <p class="edit__error" role="alert" hidden></p>
      <form class="edit" data-mode="edit" action="/api/entries/${entry.slug}"
            data-after="/e/${entry.slug}" method="post">
        <div class="field">
          <label for="name">Name</label>
          <input id="name" name="name" type="text" value="${entry.name}" required>
        </div>

        <div class="field">
          <label for="aliases">Also known as (comma separated)</label>
          <input id="aliases" name="aliases" type="text" value="${entry.aliases.join(", ")}">
        </div>

        <div class="field">
          <label for="definition">Brief definition</label>
          <textarea id="definition" name="definition" rows="3" required>${entry.definition}</textarea>
        </div>

        <div class="field">
          <label for="notes">Notes</label>
          <textarea id="notes" name="notes" rows="5">${entry.notes ?? ""}</textarea>
        </div>

        <div class="field">
          <label for="tier">Tier</label>
          <select id="tier" name="tier">
            ${TIERS.map((t) => raw(html`
              <option value="${t}"${raw(t === entry.tier ? " selected" : "")}>${TIER_LABELS[t]}</option>`))}
          </select>
        </div>

        <div class="field">
          <label for="controls_schema">Controls schema (JSON array)</label>
          <textarea id="controls_schema" name="controls_schema" data-json rows="8"
                    spellcheck="false">${JSON.stringify(entry.controls_schema, null, 2)}</textarea>
        </div>

        <div class="field">
          <label for="templates">Templates (JSON object keyed by format)</label>
          <textarea id="templates" name="templates" data-json rows="12"
                    spellcheck="false">${JSON.stringify(entry.templates, null, 2)}</textarea>
        </div>

        <div class="edit__actions">
          <button type="submit">Save</button>
          <a href="/e/${entry.slug}/history">History</a>
        </div>
      </form>
    </main>`;

  return layout({
    title: `Edit ${entry.name}`,
    description: `Edit the ${entry.name} entry.`,
    body: raw(body),
    scripts: ["/js/theme.js", "/js/edit.js"],
  });
}

export function renderNewEntryPage({ categories }) {
  const body = html`
    <main id="main" class="edit-page">
      <a class="backlink" href="/">← Browse</a>
      <h1>New entry</h1>
      <p class="edit__error" role="alert" hidden></p>
      <form class="edit" data-mode="new" action="/api/entries" method="post">
        <div class="field">
          <label for="name">Name</label>
          <input id="name" name="name" type="text" required>
        </div>

        <div class="field">
          <label for="categoryId">Category</label>
          <select id="categoryId" name="categoryId" required>
            ${categories.map((c) => raw(html`<option value="${c.id}">${c.name}</option>`))}
          </select>
        </div>

        <div class="edit__actions">
          <button type="submit">Create</button>
        </div>
      </form>
    </main>`;

  return layout({
    title: "New entry",
    description: "Add a new entry to the compendium.",
    body: raw(body),
    scripts: ["/js/theme.js", "/js/edit.js"],
  });
}
