import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed, loadExamples } from "../src/seed/run.js";
import * as db from "../src/db.js";
import { render, defaultsFor } from "../public/js/template.js";
import source from "../web-development-ui-glossary-complete.md?raw";

const SLUGS = ["button", "card", "modal", "toast", "tab-bar", "badge",
               "text-input", "select", "accordion", "table"];

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
  await loadExamples(env.DB);
});

describe.each(SLUGS)("example: %s", (slug) => {
  it("is marked as having an example", async () => {
    expect((await db.getEntryBySlug(env.DB, slug)).has_example).toBe(1);
  });

  it("renders every template with no unknown placeholders", async () => {
    const entry = await db.getEntryBySlug(env.DB, slug);
    const values = defaultsFor(entry.controls_schema);
    for (const [format, tpl] of Object.entries(entry.templates)) {
      const { warnings } = render(tpl, values);
      expect({ format, warnings }).toEqual({ format, warnings: [] });
    }
  });

  it("uses the same control ids in every format", async () => {
    const entry = await db.getEntryBySlug(env.DB, slug);
    const ids = entry.controls_schema.map((c) => c.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const tpl of Object.values(entry.templates)) {
      const used = [...tpl.matchAll(/\{\{[#/]?(?:if |unless )?\s*([\w-]+)\s*\}?\}\}/g)]
        .map((m) => m[1]).filter((id) => !["if", "unless"].includes(id));
      for (const id of used) expect(ids).toContain(id);
    }
  });

  it("references every control in every format", async () => {
    const entry = await db.getEntryBySlug(env.DB, slug);
    const ids = entry.controls_schema.map((c) => c.id);
    for (const [format, tpl] of Object.entries(entry.templates)) {
      const used = new Set(
        [...tpl.matchAll(/\{\{[#/]?(?:if |unless )?\s*([\w-]+)\s*\}?\}\}/g)]
          .map((m) => m[1]).filter((id) => !["if", "unless"].includes(id))
      );
      const missing = ids.filter((id) => !used.has(id));
      expect({ slug, format, missing }).toEqual({ slug, format, missing: [] });
    }
  });
});

describe("colour changes reach every format", () => {
  it("puts a new hex into all three tabs", async () => {
    const entry = await db.getEntryBySlug(env.DB, "button");
    const values = { ...defaultsFor(entry.controls_schema), bg: "#E8A020" };
    for (const tpl of Object.values(entry.templates)) {
      expect(render(tpl, values).output).toContain("#E8A020");
    }
  });
});
