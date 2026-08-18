// Matches a request against a route table. Patterns are literal path
// segments plus `:name` captures. No regex in callers, no dependencies.
export function route(routes, method, pathname) {
  const parts = split(pathname);
  for (const r of routes) {
    if (r.method !== method) continue;
    const pattern = split(r.pattern);
    if (pattern.length !== parts.length) continue;
    const params = {};
    let matched = true;
    for (let i = 0; i < pattern.length; i++) {
      const seg = pattern[i];
      if (seg.startsWith(":")) {
        params[seg.slice(1)] = safeDecode(parts[i]);
      } else if (seg !== parts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: r.handler, params };
  }
  return null;
}

function split(path) {
  return path.split("/").filter((s) => s.length > 0);
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
