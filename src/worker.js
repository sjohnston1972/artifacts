import { route } from "./router.js";
import { seed } from "./seed/run.js";

const routes = [
  { method: "GET", pattern: "/healthz", handler: healthz },
  { method: "POST", pattern: "/api/seed", handler: seedRoute },
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
