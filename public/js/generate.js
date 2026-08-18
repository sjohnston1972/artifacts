import { render } from "./template.js";

export function generateAll(templates, values) {
  const out = {};
  for (const [format, template] of Object.entries(templates)) {
    if (!template?.trim()) continue;
    out[format] = render(template, values).output;
  }
  return out;
}

// The iframe document. sandbox="allow-scripts" without allow-same-origin puts
// this in an opaque origin, so this script cannot reach the parent page.
export function buildDocument(htmlTemplate, values, theme) {
  const body = render(htmlTemplate, values).output;
  return `<!doctype html>
<html data-theme="${theme}">
<head><meta charset="utf-8">
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; }
  body {
    display: grid; place-items: center; min-height: 120px;
    padding: 24px; background: transparent;
    font-family: system-ui, sans-serif;
  }
</style></head>
<body>
${body}
<script>
  const report = () => parent.postMessage(
    { type: "height", value: document.documentElement.scrollHeight }, "*");
  new ResizeObserver(report).observe(document.body);
  report();
</script>
</body></html>`;
}
