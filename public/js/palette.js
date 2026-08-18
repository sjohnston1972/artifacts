let index = null;
let dialog = null;
let input = null;
let list = null;
let active = 0;
let results = [];

async function loadIndex() {
  if (index) return index;
  const res = await fetch("/api/index.json");
  index = (await res.json()).entries;
  return index;
}

// Fetched as soon as this script runs rather than waiting for the first
// Cmd+K, so the common case — a visitor who pauses even briefly before
// typing — never sees the palette open with nothing to search yet. open()
// still awaits loadIndex() itself, so a visitor who is faster than the
// fetch is still handled correctly, just not instantly.
loadIndex();

function score(entry, q) {
  const [name, , aliases, , definition] = entry;
  const n = name.toLowerCase();
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (n.includes(q)) return 2;
  if (aliases.toLowerCase().includes(q)) return 3;
  if (definition.toLowerCase().includes(q)) return 4;
  return Infinity;
}

function search(q) {
  // index loads asynchronously (see open()), so a keystroke landing before
  // it resolves must not throw — it just yields no results yet.
  if (!index) return [];
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return index
    .map((e) => ({ e, s: score(e, needle) }))
    .filter((r) => r.s < Infinity)
    .sort((a, b) => a.s - b.s || a.e[0].length - b.e[0].length)
    .slice(0, 20)
    .map((r) => r.e);
}

function build() {
  dialog = document.createElement("div");
  dialog.className = "palette";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Search the compendium");
  dialog.innerHTML = `
    <div class="palette__box">
      <input class="palette__input" type="text" role="combobox"
             aria-expanded="true" aria-controls="palette-list"
             aria-autocomplete="list" placeholder="Search elements…">
      <ul class="palette__list" id="palette-list" role="listbox"></ul>
    </div>`;
  document.body.append(dialog);
  input = dialog.querySelector(".palette__input");
  list = dialog.querySelector(".palette__list");
  input.addEventListener("input", () => { results = search(input.value); active = 0; paint(); });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) { close(); return; }
    const item = e.target.closest(".palette__item");
    if (item) location.href = `/e/${results[Number(item.dataset.index)][1]}`;
  });
}

function paint() {
  list.innerHTML = results.map((e, i) => `
    <li id="palette-opt-${i}" role="option" aria-selected="${i === active}" data-index="${i}"
        class="palette__item${i === active ? " is-active" : ""}">
      <span class="palette__name">${escapeHtml(e[0])}</span>
      <span class="palette__code">${escapeHtml(e[3])}</span>
      <span class="palette__def">${escapeHtml(e[4])}</span>
    </li>`).join("");
  input.setAttribute("aria-activedescendant", results.length ? `palette-opt-${active}` : "");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let lastFocused = null;

async function open() {
  // The dialog opens and takes focus synchronously so keystrokes typed the
  // instant the shortcut fires land in the input rather than vanishing into
  // a still-loading document — the index fetch happens in parallel, and if
  // the visitor has already typed by the time it resolves, the search
  // re-runs against what's there.
  if (!dialog) build();
  lastFocused = document.activeElement;
  dialog.hidden = false;
  input.value = "";
  results = [];
  paint();
  input.focus();
  await loadIndex();
  if (input.value.trim()) { results = search(input.value); active = 0; paint(); }
}

function close() {
  dialog.hidden = true;
  lastFocused?.focus();
}

function isTyping(el) {
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

document.addEventListener("keydown", (e) => {
  const open_ = dialog && !dialog.hidden;
  if (!open_ && (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"))) {
    if (isTyping(document.activeElement)) return;
    e.preventDefault();
    open();
    return;
  }
  if (!open_) return;
  if (e.key === "Escape") { e.preventDefault(); close(); }
  if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, results.length - 1); paint(); }
  if (e.key === "ArrowUp") { e.preventDefault(); active = Math.max(active - 1, 0); paint(); }
  if (e.key === "Tab") { e.preventDefault(); input.focus(); }   // focus trap: only element is the input
  if (e.key === "Enter" && results[active]) {
    e.preventDefault();
    location.href = `/e/${results[active][1]}`;
  }
});

// Prefetch on hover makes cross-entry navigation feel instant without a SPA.
document.addEventListener("mouseover", (e) => {
  const link = e.target.closest("a[data-prefetch]");
  if (!link || link.dataset.prefetched) return;
  link.dataset.prefetched = "1";
  const l = document.createElement("link");
  l.rel = "prefetch";
  l.href = link.href;
  document.head.append(l);
});
