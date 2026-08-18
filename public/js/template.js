// Tiny placeholder engine shared by the Worker and the browser. Deliberately
// not a general templating language: {{id}}, {{{id}}}, and if/unless blocks
// are the whole surface.

const BLOCK_RE = /\{\{#(if|unless)\s+([\w.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;

// ONE regex matching both raw and escaped placeholders, so substitution is a
// single pass. Two sequential passes would let a raw value shaped like
// {{other}} be re-scanned, pulling in a key the template never named.
const TOKEN_RE = /\{\{\{\s*([\w.-]+)\s*\}\}\}|\{\{\s*([\w.-]+)\s*\}\}/g;

export function render(template, values) {
  const warnings = [];
  const seen = new Set();
  const warn = (message) => {
    if (seen.has(message)) return;
    seen.add(message);
    warnings.push(message);
  };

  let out = String(template);

  // Blocks first, so placeholders inside a removed block never resolve.
  let previous;
  do {
    previous = out;
    out = out.replace(BLOCK_RE, (_, kind, id, body) => {
      const truthy = Boolean(values[id]);
      return (kind === "if" ? truthy : !truthy) ? body : "";
    });
  } while (out !== previous);

  // String.replace never re-examines text it inserted, so this single pass is
  // what makes injection-through-data impossible.
  out = out.replace(TOKEN_RE, (match, rawId, varId, offset, whole) => {
    const id = rawId ?? varId;
    if (!(id in values)) {
      warn(`unknown placeholder "${id}"`);
      return "";
    }
    const value = String(values[id]);
    if (rawId !== undefined) return value;
    if (inUnquotedAttribute(whole, offset)) {
      warn(`placeholder "${id}" sits in an unquoted attribute; wrap it in quotes`);
    }
    if (inEventHandler(whole, offset)) {
      warn(`placeholder "${id}" sits in an event-handler attribute, where HTML escaping cannot make it safe`);
    }
    return escape(value);
  });

  return { output: out, warnings };
}

// One escaping rule for every context. Context-aware escaping was tried and
// proved unsound: single-quoted attributes, unquoted attributes, a `>` inside
// an earlier attribute value, and <script> blocks each defeated the scanner
// and produced a breakout. Escaping the full set everywhere is the only
// version that is correct without parsing the surrounding markup. The cost is
// that a quote in visible text copies as &quot; — valid, renders identically,
// and worth it.
function escape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escaping cannot save an unquoted attribute — a space alone starts a new
// attribute — so this is surfaced as an authoring warning in the Edit view
// instead of being silently mis-escaped.
function inUnquotedAttribute(source, offset) {
  let i = offset - 1;
  while (i >= 0 && source[i] === " ") i--;
  return i >= 0 && source[i] === "=";
}

// HTML decodes character references in attribute values BEFORE JavaScript
// parses them, so `onclick="f(&#39;)"` hands the handler a real quote. No
// amount of HTML escaping fixes that — the value would need JS-string
// escaping, which depends on the surrounding JS. A <script> block is fine by
// contrast, because entities are NOT decoded there. So this is surfaced as an
// authoring warning rather than silently pretending to be safe.
// The value may legitimately contain the OTHER quote character, so match
// on the opening quote only.
const EVENT_ATTR_RE = /([A-Za-z_:][-\w:.]*)\s*=\s*(?:"[^"]*|'[^']*)$/;

function inEventHandler(source, offset) {
  const match = EVENT_ATTR_RE.exec(source.slice(0, offset));
  return Boolean(match) && /^on[a-z]+$/i.test(match[1]);
}

export function defaultsFor(schema) {
  const values = {};
  for (const control of schema || []) {
    if (!control || typeof control !== "object" || !control.id) continue;
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
