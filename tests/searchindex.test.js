import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import * as db from "../src/db.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

describe("GET /api/index.json", () => {
  it("returns all 918 entries in compact array form", async () => {
    const res = await SELF.fetch("https://example.com/api/index.json");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(918);
    expect(Array.isArray(body.entries[0])).toBe(true);
    expect(body.entries[0]).toHaveLength(7);
  });

  it("stays small enough to ship on every page", async () => {
    const text = await (await SELF.fetch("https://example.com/api/index.json")).text();
    expect(text.length).toBeLessThan(250_000);
  });

  it("sends an ETag and honours If-None-Match", async () => {
    const first = await SELF.fetch("https://example.com/api/index.json");
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    const second = await SELF.fetch("https://example.com/api/index.json", {
      headers: { "if-none-match": etag },
    });
    expect(second.status).toBe(304);
  });

  it("changes its ETag when an entry is written", async () => {
    const before = (await SELF.fetch("https://example.com/api/index.json")).headers.get("etag");
    await db.saveEntry(env.DB, "toast", { definition: "A brief, self-dismissing message." });
    const after = (await SELF.fetch("https://example.com/api/index.json")).headers.get("etag");
    expect(after).not.toBe(before);
  });

  it("omits deleted entries", async () => {
    await db.saveEntry(env.DB, "affordance", { tier: "deleted" });
    const body = await (await SELF.fetch("https://example.com/api/index.json")).json();
    expect(body.entries.some((e) => e[1] === "affordance")).toBe(false);
  });
});
