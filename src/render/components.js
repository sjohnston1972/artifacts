import { html, raw } from "./layout.js";

export function catalogueRef(code, no) {
  return html`<span class="catalogue-ref">${code}-${String(no).padStart(3, "0")}</span>`;
}

export function tierBadge(tier) {
  if (tier === "core") return html`<span class="badge badge--core">Core</span>`;
  if (tier === "useful") return html`<span class="badge">Useful</span>`;
  return "";
}

export function definitionOnlyBadge(hasExample) {
  return hasExample ? "" : html`<span class="badge badge--quiet">Definition only</span>`;
}

export function firstLine(text) {
  return String(text || "").split("\n")[0];
}

export function entryCard(entry) {
  return raw(html`
    <a class="card" href="/e/${entry.slug}" data-prefetch>
      <span class="card__meta">
        ${raw(catalogueRef(entry.category_code, entry.catalogue_no))}
        <span class="card__cat">${entry.category_name}</span>
      </span>
      <h3 class="card__name">${entry.name}</h3>
      <p class="card__def">${firstLine(entry.definition)}</p>
      <span class="card__badges">
        ${raw(tierBadge(entry.tier))}${raw(definitionOnlyBadge(entry.has_example))}
      </span>
    </a>`);
}

// The signature element. The gradient leans toward one of the four aurora
// pastels based on the category, so navigation entries feel different from
// form entries (spec section 9).
export function specimenPlate({ entry, children }) {
  const lean = ["mint", "blush", "sky", "lavender"][(entry.categories?.[0]?.id ?? 0) % 4];
  return raw(html`
    <figure class="plate" data-lean="${lean}">
      <div class="plate__head">
        ${raw(catalogueRef(entry.categories?.[0]?.code ?? "UIF", entry.catalogue_no))}
        <span class="plate__stamp">${entry.categories?.[0]?.name ?? ""}</span>
      </div>
      <div class="plate__stage">${raw(children)}</div>
    </figure>`);
}
