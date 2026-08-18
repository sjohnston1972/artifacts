import { defaultsFor } from "./template.js";
import { generateAll, buildDocument } from "./generate.js";
import { controlHtml } from "./controls.js";

const root = document.querySelector(".specimen");
if (root) init(root);

function init(root) {
  const schema = JSON.parse(root.dataset.controls || "[]");
  const templates = JSON.parse(root.dataset.templates || "{}");
  const frame = root.querySelector("iframe.stage");
  const panel = root.querySelector(".tweaks__controls");
  const stage = root.querySelector(".plate__stage");

  const values = { ...defaultsFor(schema), ...fromHash() };

  // controlHtml() only knows each control's authored default, not the
  // hash-restored value computed just above (and not the reset-to-default
  // value either) — without this call every input would render its default
  // regardless of `values`, silently breaking hash restoration on reload.
  panel.innerHTML = schema.map(controlHtml).join("");
  syncInputs();
  panel.addEventListener("input", onChange);
  panel.addEventListener("change", onChange);
  root.querySelector(".tweaks__reset")?.addEventListener("click", () => {
    Object.assign(values, defaultsFor(schema));
    syncInputs();
    location.hash = "";
    paint();
  });

  const tabs = Array.from(root.querySelectorAll(".code__tab"));
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => selectTab(root, tab.dataset.format));
    tab.addEventListener("keydown", (e) => onTabKeydown(e, root, tabs));
  });

  addEventListener("message", (e) => {
    // Source check keeps other windows out; the clamp keeps our own frame
    // from blowing out the page layout with an absurd height.
    if (e.source !== frame.contentWindow || e.data?.type !== "height") return;
    const h = Number(e.data.value);
    if (!Number.isFinite(h)) return;
    frame.style.height = `${Math.min(Math.max(h, 80), 2000)}px`;
  });

  // A URL carrying a different #hash for the same entry (a shared link
  // pasted over the current one, or the address bar edited by hand) is a
  // same-document navigation: the browser does not reload, so nothing
  // above re-runs. Without this listener the page would keep showing
  // whatever tweak values it started with instead of the ones the link
  // actually encodes. writeHash() below uses history.replaceState, which
  // never fires "hashchange", so this cannot loop back on itself.
  addEventListener("hashchange", () => {
    Object.assign(values, defaultsFor(schema), fromHash());
    syncInputs();
    paint();
  });

  let timer = null;
  function onChange(e) {
    const control = schema.find((c) => c.id === e.target.name);
    if (!control) return;
    // A swatch button carries the exact-case hex it was authored with;
    // <input type="color"> silently lowercases any value assigned to it
    // (a browser normalisation, not something this app controls), so a
    // swatch click reads its own dataset instead of the input it just set.
    values[control.id] = e.detail?.swatchValue ?? readValue(control, e.target);
    if (control.type === "number") {
      const output = e.target.nextElementSibling;
      if (output?.tagName === "OUTPUT") output.textContent = values[control.id];
    }
    const immediate = control.type !== "text" && control.type !== "number";
    clearTimeout(timer);
    if (immediate) paint();
    else timer = setTimeout(paint, 80);
  }

  function paint() {
    const theme = document.documentElement.dataset.theme
      || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    frame.srcdoc = buildDocument(templates.html, values, theme);
    const code = generateAll(templates, values);
    for (const [format, text] of Object.entries(code)) {
      const el = root.querySelector(`.code__panel[data-format="${format}"] code`);
      if (el) el.textContent = text;
    }
    // A brief shimmer connects cause to effect; the CSS that animates it is
    // inside a prefers-reduced-motion: no-preference block, so this class is
    // inert when the visitor asks for less motion.
    stage.classList.remove("is-fresh");
    void stage.offsetWidth;
    stage.classList.add("is-fresh");
    writeHash();
  }

  function syncInputs() {
    for (const c of schema) {
      const el = panel.querySelector(`[name="${c.id}"]`);
      if (!el) continue;
      if (c.type === "toggle") el.checked = Boolean(values[c.id]);
      else el.value = values[c.id];
      if (c.type === "number") {
        const output = el.nextElementSibling;
        if (output?.tagName === "OUTPUT") output.textContent = values[c.id];
      }
    }
  }

  function writeHash() {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(values)) params.set(k, String(v));
    history.replaceState(null, "", `#${params}`);
  }

  // The fragment is attacker-supplyable via a shared link, so every value is
  // validated before it reaches render(). Numbers are the dangerous case:
  // "NaN", "Infinity" and "1e999" would otherwise render literally as
  // `border-radius:NaNpx` in the example and in all three code tabs, while
  // the range input silently clamped itself to its default — the panel
  // disagreeing with the specimen again.
  function fromHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const out = {};
    for (const c of schema) {
      if (!params.has(c.id)) continue;
      const raw = params.get(c.id).slice(0, 2000);
      if (c.type === "number") {
        const n = Number(raw);
        if (!Number.isFinite(n)) continue;
        const min = Number.isFinite(Number(c.min)) ? Number(c.min) : -Infinity;
        const max = Number.isFinite(Number(c.max)) ? Number(c.max) : Infinity;
        out[c.id] = Math.min(Math.max(n, min), max);
      } else if (c.type === "toggle") {
        out[c.id] = raw === "true";
      } else {
        out[c.id] = raw;
      }
    }
    return out;
  }

  paint();
}

function readValue(control, el) {
  if (control.type === "toggle") return el.checked;
  if (control.type === "number") return Number(el.value);
  return el.value;
}

function selectTab(root, format) {
  root.querySelectorAll(".code__tab").forEach((t) => {
    const active = t.dataset.format === format;
    t.setAttribute("aria-selected", String(active));
    t.tabIndex = active ? 0 : -1;
  });
  root.querySelectorAll(".code__panel").forEach((p) => {
    p.hidden = p.dataset.format !== format;
  });
}

// WAI-ARIA tabs pattern: Left/Right move focus between tabs and activate
// the newly focused one (automatic activation, matching the click behaviour
// above rather than requiring a second keypress to select).
function onTabKeydown(e, root, tabs) {
  const key = e.key;
  if (key !== "ArrowLeft" && key !== "ArrowRight") return;
  e.preventDefault();
  const index = tabs.indexOf(e.currentTarget);
  const delta = key === "ArrowRight" ? 1 : -1;
  const next = tabs[(index + delta + tabs.length) % tabs.length];
  next.focus();
  selectTab(root, next.dataset.format);
}

// Preset swatches write into the colour input and fire its change handler.
// The exact-case hex rides along as event detail because assigning it to
// input.value below loses the case immediately (see onChange).
document.addEventListener("click", (e) => {
  const swatch = e.target.closest(".swatch");
  if (!swatch) return;
  const input = document.querySelector(`input[name="${swatch.dataset.for}"]`);
  input.value = swatch.dataset.value;
  input.dispatchEvent(new CustomEvent("input", {
    bubbles: true,
    detail: { swatchValue: swatch.dataset.value },
  }));
});
