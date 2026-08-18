import { env, SELF, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import * as db from "../src/db.js";
import { seed } from "../src/seed/run.js";
import { parseGlossary } from "../src/seed/parse.js";
import worker from "../src/worker.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

describe("GET /api/export.json", () => {
  it("exports every category and entry", async () => {
    const body = await (await SELF.fetch("https://example.com/api/export.json")).json();
    expect(body.categories).toHaveLength(45);
    expect(body.entries).toHaveLength(918);
    expect(body.entries[0]).toHaveProperty("slug");
    expect(body.entries[0]).toHaveProperty("templates");
  });
});

describe("GET /api/export.md", () => {
  it("re-imports cleanly with no data loss", async () => {
    const md = await (await SELF.fetch("https://example.com/api/export.md")).text();
    // Parsed with the SAME parser the seeder uses — that is what makes this
    // a real round-trip rather than a test of a bespoke reader.
    const reparsed = parseGlossary(md);
    expect(reparsed.categories).toHaveLength(45);
    const total = reparsed.categories.reduce((n, c) => n + c.rows.length, 0);
    expect(total).toBe(918);   // one row per entry, under its primary category
    const names = reparsed.categories.flatMap((c) => c.rows.map((r) => r.term));
    expect(new Set(names).size).toBe(918);
    expect(names).toContain("Toast");
    expect(names).toContain("Master/Detail");
  });

  it("escapes pipe characters so tables stay well formed", async () => {
    const md = await (await SELF.fetch("https://example.com/api/export.md")).text();
    for (const line of md.split("\n").filter((l) => l.startsWith("|"))) {
      expect(line.split(/(?<!\\)\|/).length).toBe(4); // leading, term, def, trailing
    }
  });

  it("survives a definition containing a pipe", async () => {
    // No seeded definition contains "|", so the escape half of the round trip
    // is otherwise untested — deleting cell()'s escaping would go unnoticed.
    await db.saveEntry(env.DB, "toast", {
      definition: "Shows a | separated hint | inline.",
    });
    const md = await (await SELF.fetch("https://example.com/api/export.md")).text();
    const reparsed = parseGlossary(md);
    const rows = reparsed.categories.flatMap((c) => c.rows);
    const toast = rows.find((r) => r.term === "Toast");
    expect(toast.definition).toBe("Shows a | separated hint | inline.");
    expect(rows).toHaveLength(918);
  });
});

describe("GET /e/:slug/export.html", () => {
  it("returns a self-contained document with no external requests", async () => {
    const res = await SELF.fetch("https://example.com/e/toast/export.html");
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<!doctype html>");
    expect(body).not.toMatch(/<(script|link|img)[^>]+(src|href)="https?:/);
  });
});

describe("POST /api/import", () => {
  it("restores a deleted entry from a backup, including its categories", async () => {
    const backup = await (await SELF.fetch("https://example.com/api/export.json")).json();
    const before = backup.entries.find((e) => e.slug === "toast");
    expect(before).toBeDefined();

    // Deleted outright, not soft-deleted, to prove import can INSERT rows
    // back — not just UPDATE ones that still exist.
    await env.DB.prepare("DELETE FROM entries WHERE slug = ?").bind("toast").run();
    expect((await SELF.fetch("https://example.com/e/toast")).status).toBe(404);

    const res = await SELF.fetch("https://example.com/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(backup),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ created: 1 });

    const after = await (await SELF.fetch("https://example.com/api/export.json")).json();
    const restored = after.entries.find((e) => e.slug === "toast");
    expect(restored).toBeDefined();
    expect(restored.definition).toBe(before.definition);
    expect(restored.categories.map((c) => c.slug).sort())
      .toEqual(before.categories.map((c) => c.slug).sort());
  });

  it("imports an entry with no categories without breaking its own page or /api/export.md", async () => {
    // import.js never requires categories, and a category-less row used to
    // throw in entry.js (entry.categories[0].slug) and in export.js
    // (primary.id) — the latter 500ing /api/export.md for the WHOLE corpus,
    // permanently, until that one row was fixed by hand. This proves both
    // guards hold.
    const res = await SELF.fetch("https://example.com/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categories: [],
        entries: [{
          slug: "orphan-entry", name: "Orphan Entry", definition: "Has no category.",
        }],
      }),
    });
    expect(res.status).toBe(200);

    const page = await SELF.fetch("https://example.com/e/orphan-entry");
    expect(page.status).toBe(200);

    const md = await SELF.fetch("https://example.com/api/export.md");
    expect(md.status).toBe(200);
  });

  it("rejects an import entry whose categories is present but malformed", async () => {
    const res = await SELF.fetch("https://example.com/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categories: [],
        entries: [{
          slug: "bad-categories", name: "Bad Categories", definition: "x",
          categories: [{ id: "not-a-number" }],
        }],
      }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/categories/i);
  });

  it("normalises a hostile imported slug instead of writing it verbatim", async () => {
    // db.js binds entry.slug verbatim on write, and worker.js interpolates
    // it unescaped into a content-disposition filename — a quote in the
    // slug is filename spoofing on the exported HTML download.
    const res = await SELF.fetch("https://example.com/api/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categories: [],
        entries: [{
          slug: 'evil".html"; x="', name: "Evil Slug", definition: "x",
        }],
      }),
    });
    expect(res.status).toBe(200);

    const backup = await (await SELF.fetch("https://example.com/api/export.json")).json();
    const written = backup.entries.find((e) => e.name === "Evil Slug");
    expect(written).toBeDefined();
    expect(written.slug).toMatch(/^[a-z0-9-]+$/);
    expect(written.slug).not.toContain('"');
  });
});

describe("scheduled backup", () => {
  it("writes a dated object to R2 and prunes beyond 30", async () => {
    for (let d = 1; d <= 32; d++) {
      await env.BACKUPS.put(`backups/2026-01-${String(d).padStart(2, "0")}.json`, "{}");
    }
    const ctx = createExecutionContext();
    await worker.scheduled({ scheduledTime: Date.parse("2026-08-18T03:00:00Z") }, env, ctx);
    await waitOnExecutionContext(ctx);
    const listed = await env.BACKUPS.list({ prefix: "backups/" });
    expect(listed.objects.length).toBeLessThanOrEqual(30);
    expect(listed.objects.some((o) => o.key === "backups/2026-08-18.json")).toBe(true);
  });
});
