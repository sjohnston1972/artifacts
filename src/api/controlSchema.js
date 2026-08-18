// The one place controls_schema shape rules are enforced, shared by
// saveEntryRoute (src/api/entries.js) and importJson (src/api/import.js).
// Before this existed, entries.js checked only c.id and c.type (plus that a
// select has options) and import.js didn't check control shape at all —
// which is how an attacker-controlled label/options/presets/default/min/
// max/step reached controlHtml()'s innerHTML unescaped and unvalidated,
// producing a stored XSS reachable from either write path. Escaping at
// render (public/js/controls.js) is the other half of that fix; this is the
// half that stops an oversized or wrongly-typed payload from being written
// in the first place.

const CONTROL_TYPES = new Set(["text", "select", "color", "number", "toggle"]);
const ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

// A control field is rendered into an attribute or as visible text, never
// used as a computation input, so there is no legitimate reason for one to
// be megabytes long. Capping length keeps a control from carrying a
// payload-sized blob even though every render() path now escapes it.
const MAX_LEN = 200;

function isBoundedString(v) {
  return typeof v === "string" && v.length <= MAX_LEN;
}

function isStringArray(v) {
  return Array.isArray(v) && v.every(isBoundedString);
}

// default/min/max/step are used as HTML attribute values (a number range's
// min/max/step, a text input's value, a color swatch's value) — a string or
// a number is the only shape that makes sense there.
function isScalar(v) {
  return isBoundedString(v) || typeof v === "number";
}

// Returns an error string, or null if the schema is valid.
export function validateControlsSchema(schema) {
  if (!Array.isArray(schema)) return "controls_schema must be an array";
  const seen = new Set();
  for (const c of schema) {
    if (!c || typeof c !== "object") return "each control must be an object";
    if (!ID_RE.test(c.id ?? "")) return `control id "${c.id}" must be a plain identifier`;
    if (seen.has(c.id)) return `duplicate control id "${c.id}"`;
    seen.add(c.id);
    if (!CONTROL_TYPES.has(c.type)) return `unknown control type "${c.type}"`;
    if (c.type === "select" && !(Array.isArray(c.options) && c.options.length)) {
      return `select control "${c.id}" needs an options array`;
    }
    if ("label" in c && !isBoundedString(c.label)) {
      return `control "${c.id}" label must be a string of at most ${MAX_LEN} characters`;
    }
    if ("options" in c && !isStringArray(c.options)) {
      return `control "${c.id}" options must be an array of strings (each at most ${MAX_LEN} characters)`;
    }
    if ("presets" in c && !isStringArray(c.presets)) {
      return `control "${c.id}" presets must be an array of strings (each at most ${MAX_LEN} characters)`;
    }
    // A toggle's default is a genuine boolean — controlHtml() only ever
    // uses it as `c.default ? "checked" : ""`, never interpolated as text,
    // so it is not part of the XSS surface the string/number rule guards.
    if ("default" in c && c.type === "toggle") {
      if (typeof c.default !== "boolean") return `toggle control "${c.id}" default must be a boolean`;
    } else if ("default" in c && !isScalar(c.default)) {
      return `control "${c.id}" default must be a string or number`;
    }
    for (const field of ["min", "max", "step"]) {
      if (field in c && !isScalar(c[field])) {
        return `control "${c.id}" ${field} must be a string or number`;
      }
    }
  }
  return null;
}
