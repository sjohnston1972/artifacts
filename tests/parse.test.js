import { describe, it, expect } from "vitest";
import { parseGlossary, mergeEntries, slugify } from "../src/seed/parse.js";
import source from "../web-development-ui-glossary-complete.md?raw";

const parsed = parseGlossary(source);
const merged = mergeEntries(parsed);

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Toggle Button")).toBe("toggle-button");
  });
  it("strips backticks from semantic HTML terms", () => {
    expect(slugify("`html`")).toBe("html");
  });
  it("collapses runs of punctuation to one hyphen", () => {
    expect(slugify("Master/Detail")).toBe("master-detail");
    expect(slugify("Internationalisation (i18n)")).toBe("internationalisation-i18n");
  });
  it("trims leading and trailing hyphens", () => {
    expect(slugify("  Tab Bar  ")).toBe("tab-bar");
  });
});

describe("parseGlossary", () => {
  it("finds exactly the 45 sections that contain a term table", () => {
    expect(parsed.categories).toHaveLength(45);
  });

  it("skips the nine guidance sections", () => {
    const numbers = parsed.categories.map((c) => c.sectionNumber);
    for (const skipped of [39, 40, 41, 42, 44, 45, 46, 47, 48]) {
      expect(numbers).not.toContain(skipped);
    }
  });

  it("keeps source order", () => {
    expect(parsed.categories[0].name).toBe("UI Fundamentals");
    expect(parsed.categories[3].name).toBe("Navigation");
    expect(parsed.categories.at(-1).name).toBe("Internationalisation & Localisation");
  });

  it("reads 1,001 term rows in total", () => {
    const total = parsed.categories.reduce((n, c) => n + c.rows.length, 0);
    expect(total).toBe(1001);
  });

  it("treats the row before the separator as a header, whatever it is called", () => {
    // Section 30 is headed `| State | Definition |` and section 43 `| Pattern | Definition |`.
    // Neither header may appear as a term, but both words ARE real terms elsewhere.
    const states = parsed.categories.find((c) => c.name === "Interaction States");
    expect(states.rows.find((r) => r.definition === "Definition")).toBeUndefined();
    const allTerms = parsed.categories.flatMap((c) => c.rows.map((r) => r.term));
    expect(allTerms).toContain("State");
    expect(allTerms).toContain("Pattern");
  });

  it("strips backticks from term names", () => {
    const semantic = parsed.categories.find((c) => c.name === "Semantic HTML Elements");
    expect(semantic.rows.map((r) => r.term)).toContain("html");
    expect(semantic.rows.every((r) => !r.term.includes("`"))).toBe(true);
  });

  it("never splits a term on a slash", () => {
    const allTerms = parsed.categories.flatMap((c) => c.rows.map((r) => r.term));
    expect(allTerms).toContain("Master/Detail");
    expect(allTerms).toContain("Min/Max Width");
    expect(allTerms).not.toContain("Detail");
    expect(allTerms).not.toContain("Max Width");
  });
});

describe("mergeEntries", () => {
  it("produces 918 unique entries from 1,001 rows", () => {
    expect(merged.entries).toHaveLength(918);
  });

  it("gives every entry a unique slug", () => {
    const slugs = merged.entries.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("merges the four senses of State into one entry", () => {
    const state = merged.entries.find((e) => e.name === "State");
    expect(state.categories).toHaveLength(4);
    expect(state.categories).toContain(state.primaryCategory);
    // The first occurrence (Workflow UI) supplies the definition; the other
    // three go to notes.
    expect(state.definition).toBe("Current workflow condition.");
    expect(state.notes).toContain("**Design System Terminology:**");
    expect(state.notes).toContain("**Component Architecture:**");
    expect(state.notes).toContain("**Application State Terminology:**");
    expect(state.notes.match(/\*\*/g)).toHaveLength(6);
    // The "State" row in the Interaction States table is that table's HEADER.
    // If header detection regresses to matching on text, that row becomes a
    // fifth category here — so this negative assertion is the real test.
    expect(state.notes).not.toContain("**Interaction States:**");
  });

  it("marks exactly one primary category per entry", () => {
    for (const e of merged.entries) {
      expect(e.categories).toContain(e.primaryCategory);
    }
  });

  it("numbers entries from 1 within each primary category", () => {
    const nav = merged.entries.filter((e) => e.primaryCategory === 4);
    const numbers = nav.map((e) => e.catalogueNo).sort((a, b) => a - b);
    expect(numbers[0]).toBe(1);
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it("preserves the definition of the first occurrence", () => {
    const pattern = merged.entries.find((e) => e.name === "Pattern");
    expect(pattern.definition).toBe(
      "Reusable solution to a recurring interaction or layout problem."
    );
  });
});
