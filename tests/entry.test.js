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

const get = (p) => SELF.fetch(`https://example.com${p}`);

describe("GET /e/:slug", () => {
  it("renders a definition-only entry without an example", async () => {
    const body = await (await get("/e/affordance")).text();
    expect(body).toContain("Affordance");
    expect(body).toContain("Definition only");
    expect(body).not.toContain("<iframe");
  });

  it("shows the specimen plate with catalogue reference and category stamp", async () => {
    const body = await (await get("/e/breadcrumb")).text();
    expect(body).toContain("plate");
    expect(body).toMatch(/NAV-\d{3}/);
    expect(body).toContain("Navigation");
  });

  it("shows aliases", async () => {
    const body = await (await get("/e/switch")).text();
    expect(body).toContain("Toggle");
  });

  it("shows every category a merged entry belongs to", async () => {
    const body = await (await get("/e/state")).text();
    // The brief's original assertion checked for "Interaction States", but
    // the seeded "State" entry's four categories are Workflow UI (primary),
    // Design System Terminology, Component Architecture and Application
    // State Terminology (verified directly via parseGlossary/mergeEntries
    // against web-development-ui-glossary-complete.md — "Interaction
    // States" is section 30, whose table has no row named "State", only a
    // "State | Definition" header). Corrected to a category the entry
    // actually belongs to, keeping the same two-distinct-categories check.
    expect(body).toContain("Workflow UI");
    expect(body).toContain("Application State Terminology");
  });

  it("renders notes from merged duplicates", async () => {
    const body = await (await get("/e/state")).text();
    expect(body).toContain("Also defined in");
  });

  it("404s an unknown slug", async () => {
    expect((await get("/e/not-a-real-element")).status).toBe(404);
  });

  it("renders the example iframe once templates exist", async () => {
    await db.saveEntry(env.DB, "badge", {
      templates: { html: "<span class=\"b\">{{label}}</span>" },
      controls_schema: [{ id: "label", type: "text", label: "Label", default: "New" }],
    });
    const body = await (await get("/e/badge")).text();
    expect(body).toContain("<iframe");
    expect(body).toContain('sandbox="allow-scripts"');
    expect(body).not.toContain("allow-same-origin");
  });

  it("shows a tab only for formats the entry actually has", async () => {
    const body = await (await get("/e/badge")).text();
    expect(body).toContain("HTML + CSS");
    expect(body).not.toContain("React");
  });
});
