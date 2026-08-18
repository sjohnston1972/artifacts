const RAW = Symbol("raw");

export function raw(s) {
  return { [RAW]: String(s) };
}

function stringify(v) {
  if (v == null || v === false) return "";
  if (Array.isArray(v)) return v.map(stringify).join("");
  if (typeof v === "object" && RAW in v) return v[RAW];
  // Escapes the apostrophe too. No attribute in this codebase is
  // single-quoted today, but this is the sole escaping boundary for every
  // renderer in Tasks 8-14, and the entry example engine already lost two
  // rounds to exactly this gap. Closing it costs one replace.
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Every renderer builds markup with this, so escaping is the default and
// raw() is the deliberate exception.
export function html(strings, ...values) {
  return strings.reduce((acc, s, i) => acc + s + stringify(values[i]), "");
}

export function layout({ title, description = "", body, scripts = [], activeNav = "" }) {
  const scriptTags = scripts
    .map((src) => `<script type="module" src="${src}"></script>`)
    .join("");
  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${stringify(title)} · UI Element Compendium</title>
<meta name="description" content="${stringify(description)}">
<script>
  // Inline and synchronous: applying the theme after first paint would flash.
  try {
    var t = localStorage.getItem("compendium-theme");
    if (t) document.documentElement.dataset.theme = t;
  } catch (e) {}
</script>
<link rel="preload" href="/fonts/instrument-sans-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/tokens.css">
<link rel="stylesheet" href="/css/app.css">
</head>
<body data-nav="${stringify(activeNav)}">
<a class="skip-link" href="#main">Skip to content</a>
${stringify(body)}
${scriptTags}
</body>
</html>`;
}
