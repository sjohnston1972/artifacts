import { env } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import * as db from "../src/db.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

describe("listCategories", () => {
  it("returns 45 categories in sort order with counts", async () => {
    const cats = await db.listCategories(env.DB);
    expect(cats).toHaveLength(45);
    expect(cats[0].name).toBe("UI Fundamentals");
    expect(cats[0].entry_count).toBeGreaterThan(0);
  });
});

describe("getEntryBySlug", () => {
  it("parses JSON columns", async () => {
    const e = await db.getEntryBySlug(env.DB, "switch");
    expect(Array.isArray(e.aliases)).toBe(true);
    expect(Array.isArray(e.controls_schema)).toBe(true);
    expect(typeof e.templates).toBe("object");
  });
  it("includes categories with the primary flagged", async () => {
    const e = await db.getEntryBySlug(env.DB, "state");
    // State is defined in four sections. The "State" row in the Interaction
    // States table is that table's HEADER and yields no entry, so there is no
    // fifth category here.
    expect(e.categories.map((c) => c.name)).toEqual([
      "Workflow UI",
      "Design System Terminology",
      "Component Architecture",
      "Application State Terminology",
    ]);
    expect(e.categories.filter((c) => c.is_primary)).toHaveLength(1);
    expect(e.categories[0].name).toBe("Workflow UI");
  });
  it("returns null for an unknown slug", async () => {
    expect(await db.getEntryBySlug(env.DB, "no-such-thing")).toBeNull();
  });
});

describe("listEntries", () => {
  it("filters by tier", async () => {
    const rows = await db.listEntries(env.DB, { tiers: ["core"], limit: 500 });
    expect(rows).toHaveLength(61);
  });
  it("filters by category", async () => {
    const rows = await db.listEntries(env.DB, { categorySlug: "navigation", limit: 500 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.name.length > 0)).toBe(true);
  });
  it("searches name, alias and definition regardless of tier", async () => {
    const rows = await db.listEntries(env.DB, { q: "toast", tiers: ["core"], limit: 50 });
    expect(rows.some((r) => r.name === "Toast")).toBe(true);
    const byAlias = await db.listEntries(env.DB, { q: "snackbar", limit: 50 });
    expect(byAlias.some((r) => r.name === "Toast")).toBe(true);
  });
  it("searches within a category without a bind-count crash", async () => {
    // categorySlug + q together: SQLite numbering makes this the one
    // combination that can throw, and it is exactly what /c/:slug?q=... does.
    const rows = await db.listEntries(env.DB, {
      categorySlug: "navigation", q: "menu", limit: 50,
    });
    expect(Array.isArray(rows)).toBe(true);
  });
  it("filters to definition-only entries", async () => {
    const rows = await db.listEntries(env.DB, { definitionOnly: true, limit: 5 });
    expect(rows.every((r) => r.has_example === 0)).toBe(true);
  });
});

describe("listCategories excludes deleted", () => {
  it("does not count a soft-deleted entry toward its category", async () => {
    const before = (await db.listCategories(env.DB)).find((c) => c.slug === "navigation");
    const victim = (await db.listEntries(env.DB, { categorySlug: "navigation", limit: 1 }))[0];
    await db.saveEntry(env.DB, victim.slug, { tier: "deleted" });
    const after = (await db.listCategories(env.DB)).find((c) => c.slug === "navigation");
    expect(after.entry_count).toBe(before.entry_count - 1);
  });
});

describe("hydrate", () => {
  it("degrades to defaults rather than throwing on malformed JSON", async () => {
    await env.DB.prepare("UPDATE entries SET templates = ? WHERE slug = ?")
      .bind("{not json", "badge").run();
    const e = await db.getEntryBySlug(env.DB, "badge");
    expect(e.templates).toEqual({});
  });
});

describe("saveEntry", () => {
  it("creates a revision before writing", async () => {
    const before = await db.getEntryBySlug(env.DB, "button");
    await db.saveEntry(env.DB, "button", { definition: "Changed definition." });
    const revs = await db.listRevisions(env.DB, before.id);
    expect(revs).toHaveLength(1);
    const after = await db.getEntryBySlug(env.DB, "button");
    expect(after.definition).toBe("Changed definition.");
  });

  it("recomputes has_example from templates.html", async () => {
    await db.saveEntry(env.DB, "button", { templates: { html: "<button>Hi</button>" } });
    expect((await db.getEntryBySlug(env.DB, "button")).has_example).toBe(1);
    await db.saveEntry(env.DB, "button", { templates: {} });
    expect((await db.getEntryBySlug(env.DB, "button")).has_example).toBe(0);
  });

  it("never changes the slug, even on rename", async () => {
    await db.saveEntry(env.DB, "button", { name: "Push Button" });
    const e = await db.getEntryBySlug(env.DB, "button");
    expect(e.name).toBe("Push Button");
    expect(e.slug).toBe("button");
  });

  it("bumps the index version", async () => {
    const before = await db.getIndexVersion(env.DB);
    await db.saveEntry(env.DB, "button", { notes: "note" });
    expect(await db.getIndexVersion(env.DB)).not.toBe(before);
  });
});

describe("restoreRevision", () => {
  it("returns the previous text and is itself undoable", async () => {
    const original = await db.getEntryBySlug(env.DB, "card");
    await db.saveEntry(env.DB, "card", { definition: "Temporarily wrong." });
    const revs = await db.listRevisions(env.DB, original.id);
    await db.restoreRevision(env.DB, revs[0].id);
    const restored = await db.getEntryBySlug(env.DB, "card");
    expect(restored.definition).toBe(original.definition);
    const after = await db.listRevisions(env.DB, original.id);
    expect(after.length).toBe(revs.length + 1);
  });
});

describe("createEntry", () => {
  it("assigns the next catalogue number in the category", async () => {
    const cats = await db.listCategories(env.DB);
    const nav = cats.find((c) => c.slug === "navigation");
    const created = await db.createEntry(env.DB, { name: "Mega Menu Test", categoryId: nav.id });
    const peers = await db.listEntries(env.DB, { categorySlug: "navigation", limit: 500 });
    const max = Math.max(...peers.map((p) => p.catalogue_no));
    expect(created.catalogue_no).toBe(max);
    expect(created.slug).toBe("mega-menu-test");
  });
});
