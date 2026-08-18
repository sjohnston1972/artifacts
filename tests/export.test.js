import { env, SELF, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
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
