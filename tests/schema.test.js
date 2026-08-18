import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";

beforeAll(async () => { await applySchema(env.DB); });

describe("schema", () => {
  it("creates all five tables", async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();
    const names = results.map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining(["categories", "entries", "entry_categories", "meta", "revisions"])
    );
  });

  it("rejects an invalid tier", async () => {
    await expect(
      env.DB.prepare(
        "INSERT INTO entries (name, slug, definition, tier, catalogue_no, updated_at) VALUES (?,?,?,?,?,?)"
      ).bind("X", "x", "d", "bogus", 1, "2026-08-18").run()
    ).rejects.toThrow();
  });

  it("enforces unique slugs", async () => {
    const ins = (slug) => env.DB.prepare(
      "INSERT INTO entries (name, slug, definition, catalogue_no, updated_at) VALUES (?,?,?,?,?)"
    ).bind("Dup", slug, "d", 1, "2026-08-18").run();
    await ins("dup-slug");
    await expect(ins("dup-slug")).rejects.toThrow();
  });

  it("seeds index_version", async () => {
    const row = await env.DB.prepare("SELECT value FROM meta WHERE key='index_version'").first();
    expect(row.value).toBe("1");
  });
});
