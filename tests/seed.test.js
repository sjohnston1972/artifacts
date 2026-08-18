import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import { CATEGORY_CODES, CORE_NAMES } from "../src/seed/tables.js";
import source from "../web-development-ui-glossary-complete.md?raw";

let result;
beforeAll(async () => {
  await applySchema(env.DB);
  result = await seed(env.DB, source);
});

describe("category codes table", () => {
  it("has one code per category", () => {
    expect(Object.keys(CATEGORY_CODES)).toHaveLength(45);
  });
  it("has no duplicate codes", () => {
    const codes = Object.values(CATEGORY_CODES);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("seed", () => {
  it("inserts 45 categories and 918 entries", () => {
    expect(result).toMatchObject({ categories: 45, entries: 918 });
  });

  it("marks every core name as core tier", async () => {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM entries WHERE tier='core'"
    ).first();
    expect(row.n).toBe(CORE_NAMES.length);
  });

  it("resolves every core name to exactly one entry", async () => {
    for (const name of CORE_NAMES) {
      const row = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM entries WHERE name = ?"
      ).bind(name).first();
      expect({ name, n: row.n }).toEqual({ name, n: 1 });
    }
  });

  it("starts every entry as definition-only", async () => {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM entries WHERE has_example = 1"
    ).first();
    expect(row.n).toBe(0);
  });

  it("gives every entry exactly one primary category", async () => {
    const { results } = await env.DB.prepare(
      "SELECT entry_id, SUM(is_primary) AS p FROM entry_categories GROUP BY entry_id HAVING p <> 1"
    ).all();
    expect(results).toEqual([]);
  });

  it("records secondary categories for merged terms", async () => {
    // State is defined in four sections: Workflow UI (primary), Design System
    // Terminology, Component Architecture, Application State Terminology. The
    // "State" row in the Interaction States table is that table's HEADER and
    // must not produce a fifth row here.
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM entry_categories ec JOIN entries e ON e.id = ec.entry_id WHERE e.name = 'State'"
    ).first();
    expect(row.n).toBe(4);
  });

  it("gives core components the clean slug, not the HTML tag", async () => {
    const button = await env.DB.prepare(
      "SELECT name, tier FROM entries WHERE slug = 'button'"
    ).first();
    expect(button).toEqual({ name: "Button", tier: "core" });
    const tag = await env.DB.prepare(
      "SELECT name FROM entries WHERE slug = 'button-element'"
    ).first();
    expect(tag.name).toBe("button");
  });

  it("applies curated aliases", async () => {
    const row = await env.DB.prepare(
      "SELECT aliases FROM entries WHERE name = 'Switch'"
    ).first();
    expect(JSON.parse(row.aliases)).toContain("Toggle");
  });

  it("refuses to run twice", async () => {
    await expect(seed(env.DB, source)).rejects.toThrow(/already seeded/i);
  });
});
