import { route } from "./router.js";
import { seed } from "./seed/run.js";
import * as db from "./db.js";
import { renderBrowse } from "./render/browse.js";
import { renderEntry } from "./render/entry.js";
import { searchIndex } from "./api/index.js";

const TIERS = {
  default: ["core", "useful"],
  core: ["core"],
  reference: ["reference"],
  all: ["core", "useful", "reference"],
};

const routes = [
  { method: "GET", pattern: "/healthz", handler: healthz },
  { method: "POST", pattern: "/api/seed", handler: seedRoute },
  { method: "GET", pattern: "/api/index.json", handler: searchIndex },
  { method: "GET", pattern: "/", handler: browse },
  { method: "GET", pattern: "/c/:slug", handler: browse },
  { method: "GET", pattern: "/e/:slug", handler: entryPage },
];

async function healthz() {
  return new Response("ok", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function seedRoute(request, env) {
  const markdown = await request.text();
  if (!markdown.trim()) {
    return Response.json({ error: "POST the glossary markdown as the body" }, { status: 400 });
  }
  const result = await seed(env.DB, markdown);
  return Response.json(result);
}

async function browse(request, env, ctx, params) {
  const url = new URL(request.url);
  const filters = {
    q: url.searchParams.get("q") || "",
    tier: url.searchParams.get("tier") || "default",
    examples: url.searchParams.get("examples") || "any",
  };
  const categories = await db.listCategories(env.DB);
  if (params.slug && !categories.some((c) => c.slug === params.slug)) {
    return new Response("Not found", { status: 404 });
  }
  const entries = await db.listEntries(env.DB, {
    categorySlug: params.slug,
    tiers: TIERS[filters.tier] ?? TIERS.default,
    definitionOnly: filters.examples === "none",
    q: filters.q || undefined,
    // Above the corpus size on purpose. A bare cap silently hid 418 of 918
    // specimens at tier=all, and `examples=some` filters in JS AFTER the
    // query, so a cap would under-report entries-with-examples too.
    limit: 2000,
  });
  const filtered = filters.examples === "some" ? entries.filter((e) => e.has_example) : entries;
  return htmlResponse(renderBrowse({
    categories, entries: filtered, filters, activeCategory: params.slug,
    total: categories.reduce((n, c) => n + c.entry_count, 0),
  }));
}

async function entryPage(request, env, ctx, params) {
  const entry = await db.getEntryBySlug(env.DB, params.slug);
  if (!entry) return new Response("Not found", { status: 404 });
  return htmlResponse(renderEntry({ entry }));
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const match = route(routes, request.method, url.pathname);
    if (!match) return env.ASSETS.fetch(request);
    try {
      return await match.handler(request, env, ctx, match.params);
    } catch (err) {
      console.error(err);
      return new Response("Internal error", { status: 500 });
    }
  },
};
