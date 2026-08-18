import { html, raw, layout } from "./layout.js";

export function renderHistoryPage({ entry, revisions }) {
  const body = html`
    <main id="main" class="history-page">
      <a class="backlink" href="/e/${entry.slug}">← ${entry.name}</a>
      <h1>History for ${entry.name}</h1>
      ${revisions.length === 0
        ? raw(html`<p class="empty">No revisions yet. Every save creates one.</p>`)
        : raw(html`
          <ul class="history-list">
            ${revisions.map((r) => raw(html`
              <li class="history-list__item">
                <div class="history-list__meta">
                  <time datetime="${r.changed_at}">${r.changed_at}</time>
                  <p class="history-list__summary">${r.summary}</p>
                </div>
                <button type="button" class="history-list__restore" data-restore-id="${r.id}">Restore</button>
              </li>`))}
          </ul>`)}
    </main>`;

  return layout({
    title: `History · ${entry.name}`,
    description: `Revision history for ${entry.name}.`,
    body: raw(body),
    scripts: ["/js/theme.js", "/js/edit.js"],
  });
}
