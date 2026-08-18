import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import source from "../web-development-ui-glossary-complete.md?raw";
import { saveEntry } from "../src/db.js";

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
    expect((body.match(/class="cat__code"/g) ?? []).length).toBe(45);
  });

  it("defaults to showing every tier, since `useful` is never assigned and the catalogue exists to be looked things up in", async () => {
    // `useful` is never assigned by any code path (the seeder produces only
    // core and reference), so a core+useful default silently collapsed to
    // core-only — hiding 857 of 918 entries and leaving 32 of 45 categories
    // completely empty. "Affordance" is reference tier and must now appear
    // by default.
    const body = await (await SELF.fetch("https://example.com/")).text();
    expect(body).toContain(">Button<");
    expect(body).toContain(">Affordance<");
  });

  it("shows a non-empty default view for a category with no core entries", async () => {
    // ENT/AIU/A11/... etc. — 32 of 45 categories had zero core-tier entries,
    // so the old core+useful default rendered them completely empty.
    // Accessibility (A11) is one of them.
    const body = await (await SELF.fetch("https://example.com/c/accessibility")).text();
    expect(body).toContain("A11-");
    expect((body.match(/class="card"/g) ?? []).length).toBeGreaterThan(0);
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

  it("shows every entry at tier=all rather than silently truncating", async () => {
    const body = await (await SELF.fetch("https://example.com/?tier=all")).text();
    expect((body.match(/class="card"/g) ?? []).length).toBe(918);
  });

  it("keeps the category scope when the no-JS form is submitted", async () => {
    const home = await (await SELF.fetch("https://example.com/")).text();
    expect(home).toContain('action="/"');
    const category = await (await SELF.fetch("https://example.com/c/navigation")).text();
    expect(category).toContain('action="/c/navigation"');
  });

  it("filters to entries that have an example", async () => {
    // The seeded corpus has has_example=0 for all 918 entries (authored
    // examples are a later task's job, not seed's). saveEntry is the only
    // sanctioned way to write an entry, so give one real entry an example
    // through it, then confirm the examples=some branch picks it up and
    // examples=none no longer shows it as "Definition only".
    const row = await env.DB.prepare("SELECT slug FROM entries WHERE name = 'Button'").first();
    await saveEntry(env.DB, row.slug, { templates: { html: "<button>Click me</button>" } });

    const some = await (await SELF.fetch("https://example.com/?tier=all&examples=some")).text();
    expect(some).toContain(">Button<");
    expect((some.match(/class="card"/g) ?? []).length).toBe(1);

    const none = await (await SELF.fetch("https://example.com/?tier=all&examples=none")).text();
    expect(none).not.toContain(">Button<");
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
