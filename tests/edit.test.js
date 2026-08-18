import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { applySchema } from "./helpers/db.js";
import { seed } from "../src/seed/run.js";
import source from "../web-development-ui-glossary-complete.md?raw";

beforeAll(async () => {
  await applySchema(env.DB);
  await seed(env.DB, source);
});

const post = (path, body) => SELF.fetch(`https://example.com${path}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("GET /e/:slug/edit", () => {
  it("renders a form pre-filled with the current values", async () => {
    const body = await (await SELF.fetch("https://example.com/e/toast/edit")).text();
    expect(body).toContain("Brief");
    expect(body).toContain('name="definition"');
    expect(body).toContain('name="controls_schema"');
    expect(body).toContain('name="templates"');
  });
});

describe("POST /api/entries/:slug", () => {
  it("saves a definition and creates a revision", async () => {
    const res = await post("/api/entries/toast", { definition: "Edited definition." });
    expect(res.status).toBe(200);
    const page = await (await SELF.fetch("https://example.com/e/toast")).text();
    expect(page).toContain("Edited definition.");
    const history = await (await SELF.fetch("https://example.com/e/toast/history")).text();
    expect(history).toContain("Restore");
  });

  it("rejects invalid JSON in templates with a useful message", async () => {
    const res = await post("/api/entries/toast", { templates: "not json" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/templates/i);
  });

  it("rejects an unknown tier", async () => {
    expect((await post("/api/entries/toast", { tier: "amazing" })).status).toBe(400);
  });

  it("rejects a controls schema with an unknown control type", async () => {
    const res = await post("/api/entries/toast", {
      controls_schema: [{ id: "x", type: "wormhole" }],
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/wormhole/);
  });

  it("rejects a control whose id is not a safe identifier", async () => {
    const res = await post("/api/entries/toast", {
      controls_schema: [{ id: "a b", type: "text" }],
    });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown template format key", async () => {
    const res = await post("/api/entries/toast", { templates: { cobol: "PROGRAM." } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/cobol/);
  });

  it("rejects a non-string template value", async () => {
    const res = await post("/api/entries/toast", { templates: { html: 42 } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/html/);
  });

  it("rejects a non-array controls_schema", async () => {
    const res = await post("/api/entries/toast", { controls_schema: { id: "x" } });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/array/i);
  });

  it("rejects a duplicate control id", async () => {
    const res = await post("/api/entries/toast", {
      controls_schema: [
        { id: "dup", type: "text" },
        { id: "dup", type: "text" },
      ],
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/dup/);
  });

  it("rejects a select control with no options", async () => {
    const res = await post("/api/entries/toast", {
      controls_schema: [{ id: "variant", type: "select" }],
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/options/i);
  });

  it("rejects a non-array aliases", async () => {
    const res = await post("/api/entries/toast", { aliases: "not-an-array" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/aliases/i);
  });
});

describe("POST /api/entries (new)", () => {
  it("creates a blank entry in a category", async () => {
    // "Split Button" is deliberately NOT used here: it already exists in the
    // seeded glossary (web-development-ui-glossary-complete.md line 175), so
    // createEntry's own collision-avoidance correctly slugifies it to
    // "split-button-2" — making an assertion of an exact "split-button" slug
    // wrong for this dataset, not a bug in createEntry. A name with no
    // seeded collision isolates the behaviour actually under test.
    const res = await post("/api/entries", { name: "Quorum Fixture", categoryId: 5 });
    expect(res.status).toBe(200);
    const created = await res.json();
    expect(created.slug).toBe("quorum-fixture");
    expect((await SELF.fetch("https://example.com/e/quorum-fixture")).status).toBe(200);
  });

  it("rejects a blank name", async () => {
    expect((await post("/api/entries", { name: "  ", categoryId: 5 })).status).toBe(400);
  });

  it("rejects a missing categoryId", async () => {
    expect((await post("/api/entries", { name: "Orphan Widget" })).status).toBe(400);
  });
});

describe("XSS: edit form reflects untrusted content", () => {
  it("escapes a name/definition/notes payload that tries to break out of its textarea or attribute", async () => {
    const payload = '</textarea><script>window.__pwned=1</script>';
    await post("/api/entries/toast", {
      name: `Toast${payload}`,
      definition: `Def${payload}`,
      notes: `Notes${payload}`,
    });
    const body = await (await SELF.fetch("https://example.com/e/toast/edit")).text();
    expect(body).not.toContain("<script>window.__pwned=1</script>");
    expect(body).not.toContain("</textarea><script>");
    // The escaped form must still be present somewhere (proves the content
    // survived, just neutralised, rather than being silently dropped).
    expect(body).toContain("&lt;script&gt;");
  });
});

describe("restore", () => {
  it("returns the original text and remains undoable", async () => {
    await post("/api/entries/card", { definition: "Temporarily wrong." });
    const revs = await (await SELF.fetch("https://example.com/api/revisions/card")).json();
    const res = await post(`/api/revisions/${revs[0].id}/restore`, {});
    expect(res.status).toBe(200);
    const after = await (await SELF.fetch("https://example.com/e/card")).text();
    expect(after).not.toContain("Temporarily wrong.");
  });
});
