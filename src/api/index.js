import { searchIndexRows, getIndexVersion } from "../db.js";
import { firstLine } from "../render/components.js";

export async function searchIndex(request, env) {
  const version = await getIndexVersion(env.DB);
  const etag = `W/"idx-${version}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }
  const rows = await searchIndexRows(env.DB);
  const body = JSON.stringify({
    version,
    entries: rows.map((r) => [
      r.name, r.slug, JSON.parse(r.aliases || "[]").join(" "),
      r.category_code, firstLine(r.definition), r.tier, r.has_example,
    ]),
  });
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-cache",
      etag,
    },
  });
}
