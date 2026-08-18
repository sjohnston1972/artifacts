import { route } from "./router.js";

const routes = [
  { method: "GET", pattern: "/healthz", handler: healthz },
];

async function healthz() {
  return new Response("ok", {
    headers: { "content-type": "text/plain; charset=utf-8" },
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
