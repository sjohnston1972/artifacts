// Tiny placeholder engine shared by the Worker and the browser. Deliberately
// not a general templating language: {{id}}, {{{id}}}, and if/unless blocks
// are the whole surface.

const BLOCK_TOKEN_RE = /\{\{#(if|unless)\s+([\w.-]+)\}\}|\{\{\/(?:if|unless)\}\}/g;

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
  // Parsed with a recursive-descent walk rather than a non-greedy regex
  // loop: a non-greedy body (`[\s\S]*?`) closes an outer block on the
  // FIRST `{{/if}}` it meets, which is the INNER block's close when blocks
  // nest — leaking the outer's tail text (and a stray `{{/if}}`) even when
  // the outer condition is false. Recursion sidesteps the problem instead
  // of patching it: whichever block was opened most recently is exactly
  // the one the next close tag belongs to, so a plain recursive call
  // resolves nesting correctly without matching open/close kinds by hand.
  out = renderBlockNodes(parseBlocks(out), values);

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
    return escapeHtml(value);
  });

  return { output: out, warnings };
}

// Splits a template into a tree of plain-text strings and block nodes
// ({kind, id, body}), recursively, using the position of the NEXT close tag
// (of either kind) to end whichever block is currently open. That is sound
// because authored templates nest properly (LIFO): the next close tag met
// while reading a block's body can only belong to that block — any close
// belonging to a block nested inside it was already consumed by the
// recursive call that parsed that inner block.
function parseBlocks(template) {
  BLOCK_TOKEN_RE.lastIndex = 0;
  let pos = 0;

  function parse() {
    const nodes = [];
    for (;;) {
      BLOCK_TOKEN_RE.lastIndex = pos;
      const m = BLOCK_TOKEN_RE.exec(template);
      if (!m) {
        if (pos < template.length) nodes.push(template.slice(pos));
        pos = template.length;
        return nodes;
      }
      if (m.index > pos) nodes.push(template.slice(pos, m.index));
      pos = m.index + m[0].length;
      if (m[1]) {
        // Open tag: m[1] is "if"/"unless", m[2] is the condition id.
        nodes.push({ kind: m[1], id: m[2], body: parse() });
      } else {
        // Close tag: ends whichever block this recursive call is reading.
        return nodes;
      }
    }
  }

  return parse();
}

function renderBlockNodes(nodes, values) {
  let out = "";
  for (const node of nodes) {
    if (typeof node === "string") {
      out += node;
      continue;
    }
    const truthy = Boolean(values[node.id]);
    const show = node.kind === "if" ? truthy : !truthy;
    if (show) out += renderBlockNodes(node.body, values);
  }
  return out;
}

// One escaping rule for every context. Context-aware escaping was tried and
// proved unsound: single-quoted attributes, unquoted attributes, a `>` inside
// an earlier attribute value, and <script> blocks each defeated the scanner
// and produced a breakout. Escaping the full set everywhere is the only
// version that is correct without parsing the surrounding markup. The cost is
// that a quote in visible text copies as &quot; — valid, renders identically,
// and worth it.
//
// This module has no imports and is already shared by the Worker, the
// browser and the tests, so it is the single home for HTML escaping in this
// codebase — every other renderer imports this instead of keeping its own
// copy. (The one deliberate exception is src/render/layout.js's `stringify`,
// which is a different contract — escape-by-default inside a tagged
// template with `raw()` as the opt-out — see the comment there.)
export function escapeHtml(s) {
  return String(s ?? "")
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
  // Must actually be inside a tag. Without this guard the check fires on any
  // JavaScript assignment — `disabled = {{disabled}}` in a React template —
  // which is noise, and worse, pushes authors to silence a security warning
  // by switching to {{{raw}}} and turning escaping off.
  if (!insideTag(source, offset)) return false;
  let i = offset - 1;
  while (i >= 0 && source[i] === " ") i--;
  return i >= 0 && source[i] === "=";
}

// Scans forward tracking quoted spans. A lastIndexOf(">") shortcut is wrong:
// a literal `>` inside an earlier attribute value — `<div title="a > b"
// class={{x}}>` — reads as the tag's close, so the placeholder looks like text
// and BOTH warnings go silent. That false negative is worse than the noise the
// guard was added to remove, because it hides the event-handler case.
function insideTag(source, offset) {
  let inTag = false;
  let quote = null;
  for (let i = 0; i < offset; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (inTag && (ch === '"' || ch === "'")) {
      quote = ch;
      continue;
    }
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
  }
  return inTag;
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
  if (!insideTag(source, offset)) return false;
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
