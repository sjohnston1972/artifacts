// Pure control-markup builder, split out of tweak.js so it can be unit
// tested without a DOM (tweak.js touches `document` at module scope to wire
// up the live specimen). Every interpolated field here — c.label, c.id,
// c.options[], c.default, c.presets[], c.min, c.max, c.step — is
// attacker-controlled: it comes straight from an entry's controls_schema,
// which is writeable via open editing (POST /api/entries/:slug) and import
// (POST /api/import). tweak.js assigns this HTML via panel.innerHTML in the
// TOP-LEVEL origin (not the sandboxed example iframe), so an unescaped
// field here is a stored XSS against every visitor who opens the entry.
// src/api/controlSchema.js rejects the wrong shapes at write time; this is
// the render-time half of the fix — escape unconditionally, so even a value
// that somehow slipped past validation can't break out of the markup.
import { escapeHtml } from "./template.js";

export function controlHtml(c) {
  const id = `ctl-${escapeHtml(c.id)}`;
  const name = escapeHtml(c.id);
  const label = `<label class="ctl__label" for="${id}">${escapeHtml(c.label ?? c.id)}</label>`;
  switch (c.type) {
    case "select":
      return `<div class="ctl">${label}<select id="${id}" name="${name}">${
        (c.options || []).map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("")
      }</select></div>`;
    case "color":
      return `<div class="ctl">${label}
        <span class="ctl__colour">
          <input id="${id}" name="${name}" type="color" value="${escapeHtml(c.default ?? "#000000")}">
          ${(c.presets || []).map((p) =>
            `<button type="button" class="swatch" data-for="${name}" data-value="${escapeHtml(p)}"
                     style="background:${escapeHtml(p)}" aria-label="Use ${escapeHtml(p)}"></button>`).join("")}
        </span></div>`;
    case "number":
      return `<div class="ctl">${label}<input id="${id}" name="${name}" type="range"
        min="${escapeHtml(c.min ?? 0)}" max="${escapeHtml(c.max ?? 100)}" step="${escapeHtml(c.step ?? 1)}"
        value="${escapeHtml(c.default ?? 0)}"><output>${escapeHtml(c.default ?? 0)}</output></div>`;
    case "toggle":
      return `<div class="ctl ctl--toggle"><input id="${id}" name="${name}" type="checkbox"
        ${c.default ? "checked" : ""}>${label}</div>`;
    default:
      return `<div class="ctl">${label}<input id="${id}" name="${name}" type="text"
        value="${escapeHtml(c.default ?? "")}"></div>`;
  }
}
