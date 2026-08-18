// Tiny placeholder engine shared by the Worker and the browser. Deliberately
// not a general templating language: {{id}}, {{{id}}}, and if/unless blocks
// are the whole surface.

const BLOCK_RE = /\{\{#(if|unless)\s+([\w.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
const RAW_RE = /\{\{\{\s*([\w.-]+)\s*\}\}\}/g;
const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

export function render(template, values) {
  const warnings = [];
  const warned = new Set();

  const note = (id) => {
    if (!warned.has(id)) {
      warned.add(id);
      warnings.push(`unknown placeholder "${id}"`);
    }
  };

  let out = String(template);

  // Blocks first, so placeholders inside a removed block never resolve.
  let previous;
  do {
    previous = out;
    out = out.replace(BLOCK_RE, (_, kind, id, body) => {
      const truthy = Boolean(values[id]);
      const keep = kind === "if" ? truthy : !truthy;
      return keep ? body : "";
    });
  } while (out !== previous);

  out = out.replace(RAW_RE, (_, id) => {
    if (!(id in values)) { note(id); return ""; }
    return String(values[id]);
  });

  out = out.replace(VAR_RE, (match, id, offset, whole) => {
    if (!(id in values)) { note(id); return ""; }
    const value = String(values[id]);
    return inAttribute(whole, offset) ? escapeAttr(value) : escapeText(value);
  });

  return { output: out, warnings };
}

// A placeholder is in attribute context if the nearest unclosed `<` before it
// is followed by an odd number of quotes — i.e. we are inside a quoted
// attribute value within a tag.
function inAttribute(source, offset) {
  const open = source.lastIndexOf("<", offset);
  if (open === -1) return false;
  const close = source.lastIndexOf(">", offset);
  if (close > open) return false;
  const between = source.slice(open, offset);
  const quotes = (between.match(/"/g) || []).length;
  return quotes % 2 === 1;
}

function escapeText(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}

export function defaultsFor(schema) {
  const values = {};
  for (const control of schema || []) {
    if ("default" in control) {
      values[control.id] = control.default;
      continue;
    }
    switch (control.type) {
      case "number": values[control.id] = 0; break;
      case "toggle": values[control.id] = false; break;
      case "select": values[control.id] = control.options?.[0] ?? ""; break;
      case "color": values[control.id] = "#000000"; break;
      default: values[control.id] = "";
    }
  }
  return values;
}
