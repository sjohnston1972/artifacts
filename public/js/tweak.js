import { defaultsFor } from "./template.js";
import { generateAll, buildDocument } from "./generate.js";

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
    if (e.source === frame.contentWindow && e.data?.type === "height") {
      frame.style.height = `${e.data.value}px`;
    }
  });

  let timer = null;
  function onChange(e) {
    const control = schema.find((c) => c.id === e.target.name);
    if (!control) return;
    values[control.id] = readValue(control, e.target);
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

  function fromHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    const out = {};
    for (const c of schema) {
      if (!params.has(c.id)) continue;
      const raw = params.get(c.id);
      out[c.id] = c.type === "number" ? Number(raw)
        : c.type === "toggle" ? raw === "true" : raw;
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

function controlHtml(c) {
  const id = `ctl-${c.id}`;
  const label = `<label class="ctl__label" for="${id}">${c.label ?? c.id}</label>`;
  switch (c.type) {
    case "select":
      return `<div class="ctl">${label}<select id="${id}" name="${c.id}">${
        (c.options || []).map((o) => `<option value="${o}">${o}</option>`).join("")
      }</select></div>`;
    case "color":
      return `<div class="ctl">${label}
        <span class="ctl__colour">
          <input id="${id}" name="${c.id}" type="color" value="${c.default ?? "#000000"}">
          ${(c.presets || []).map((p) =>
            `<button type="button" class="swatch" data-for="${c.id}" data-value="${p}"
                     style="background:${p}" aria-label="Use ${p}"></button>`).join("")}
        </span></div>`;
    case "number":
      return `<div class="ctl">${label}<input id="${id}" name="${c.id}" type="range"
        min="${c.min ?? 0}" max="${c.max ?? 100}" step="${c.step ?? 1}"
        value="${c.default ?? 0}"><output>${c.default ?? 0}</output></div>`;
    case "toggle":
      return `<div class="ctl ctl--toggle"><input id="${id}" name="${c.id}" type="checkbox"
        ${c.default ? "checked" : ""}>${label}</div>`;
    default:
      return `<div class="ctl">${label}<input id="${id}" name="${c.id}" type="text"
        value="${c.default ?? ""}"></div>`;
  }
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
document.addEventListener("click", (e) => {
  const swatch = e.target.closest(".swatch");
  if (!swatch) return;
  const input = document.querySelector(`input[name="${swatch.dataset.for}"]`);
  input.value = swatch.dataset.value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
});
