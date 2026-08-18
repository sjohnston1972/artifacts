import { html, raw, layout } from "./layout.js";
import { entryCard } from "./components.js";

export function renderBrowse({ categories, entries, filters, activeCategory }) {
  const body = html`
    <header class="masthead">
      <h1 class="masthead__title">UI Element Compendium</h1>
      <p class="masthead__sub">${entries.length} specimens on display. Press
        <kbd>/</kbd> or <kbd>Cmd</kbd>+<kbd>K</kbd> to search.</p>
      <button class="theme-toggle" data-theme-toggle aria-label="Switch between light and dark themes">Theme</button>
    </header>
    <div class="browse">
      <nav class="browse__nav" aria-label="Categories">
        <h2 class="browse__navtitle">Categories</h2>
        <ul>
          ${categories.map((c) => raw(html`
            <li><a href="/c/${c.slug}" ${raw(c.slug === activeCategory ? 'aria-current="page"' : "")}>
              <span class="cat__code">${c.code}</span>
              <span class="cat__name">${c.name}</span>
              <span class="cat__count">${c.entry_count}</span>
            </a></li>`))}
        </ul>
      </nav>
      <main id="main" class="browse__main">
        <form class="searchbar" action="/" method="get" role="search">
          <label for="q" class="visually-hidden">Search the compendium</label>
          <input id="q" name="q" type="search" value="${filters.q ?? ""}"
                 placeholder="Search 918 elements…" autocomplete="off">
          <select name="tier" aria-label="Tier">
            <option value="default"${sel(filters.tier, "default")}>Core &amp; useful</option>
            <option value="core"${sel(filters.tier, "core")}>Core only</option>
            <option value="reference"${sel(filters.tier, "reference")}>Reference</option>
            <option value="all"${sel(filters.tier, "all")}>All tiers</option>
          </select>
          <select name="examples" aria-label="Examples">
            <option value="any"${sel(filters.examples, "any")}>Any</option>
            <option value="none"${sel(filters.examples, "none")}>Definition only</option>
            <option value="some"${sel(filters.examples, "some")}>Has an example</option>
          </select>
          <button type="submit">Search</button>
        </form>
        ${entries.length === 0 ? raw(emptyState(filters)) : raw(html`
          <ul class="browse-grid">${entries.map((e) => raw(html`<li>${entryCard(e)}</li>`))}</ul>`)}
      </main>
    </div>`;

  return layout({
    title: activeCategory ? categories.find((c) => c.slug === activeCategory)?.name ?? "Browse" : "Browse",
    description: "A searchable catalogue of user interface elements.",
    body: raw(body),
    scripts: ["/js/theme.js"],
  });
}

function sel(current, value) {
  return current === value ? " selected" : "";
}

function emptyState(filters) {
  if (filters.examples === "none") {
    return html`<p class="empty">Every specimen is mounted. Nothing left to catalogue.</p>`;
  }
  return html`<p class="empty">Nothing in the catalogue matches
    “${filters.q ?? ""}”. Try a shorter word, or browse by category.</p>`;
}
