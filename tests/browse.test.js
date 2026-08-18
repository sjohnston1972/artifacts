import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

describe("GET /", () => {
  it("returns HTML", async () => {
    const res = await SELF.fetch("https://example.com/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });

  it("lists all 45 categories", async () => {
    const body = await (await SELF.fetch("https://example.com/")).text();
    expect(body).toContain("UI Fundamentals");
    expect(body).toContain("Internationalisation &amp; Localisation");
  });

  it("defaults to core and useful tiers only", async () => {
    const body = await (await SELF.fetch("https://example.com/")).text();
    expect(body).toContain(">Button<");
    // "Affordance" is reference tier and must not appear by default
    expect(body).not.toContain(">Affordance<");
  });

  it("shows every tier when asked", async () => {
    const body = await (await SELF.fetch("https://example.com/?tier=all")).text();
    expect(body).toContain(">Affordance<");
  });

  it("filters to definition-only entries", async () => {
    const body = await (await SELF.fetch("https://example.com/?examples=none")).text();
    expect(body).toContain("Definition only");
  });

  it("searches without JavaScript across every tier", async () => {
    const body = await (await SELF.fetch("https://example.com/?q=affordance")).text();
    expect(body).toContain(">Affordance<");
  });

  it("shows a charming empty state when nothing matches", async () => {
    const body = await (await SELF.fetch("https://example.com/?q=zzzznotathing")).text();
    expect(body).toMatch(/Nothing in the catalogue/i);
  });
});

describe("GET /c/:slug", () => {
  it("lists a single category", async () => {
    const res = await SELF.fetch("https://example.com/c/navigation");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Navigation");
    expect(body).toContain("NAV-");
  });

  it("404s an unknown category", async () => {
    const res = await SELF.fetch("https://example.com/c/nope");
    expect(res.status).toBe(404);
  });
});
