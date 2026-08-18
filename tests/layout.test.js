import { describe, it, expect } from "vitest";
import { layout, html, raw } from "../src/render/layout.js";
import { catalogueRef } from "../src/render/components.js";

describe("html tagged template", () => {
  it("escapes interpolated values", () => {
    expect(html`<p>${"<script>"}</p>`).toBe("<p>&lt;script&gt;</p>");
  });
  it("passes raw() values through", () => {
    expect(html`<p>${raw("<b>x</b>")}</p>`).toBe("<p><b>x</b></p>");
  });
  it("joins arrays without commas", () => {
    expect(html`${[raw("<li>a</li>"), raw("<li>b</li>")]}`).toBe("<li>a</li><li>b</li>");
  });
  it("escapes the apostrophe, so a single-quoted attribute is safe", () => {
    expect(html`<a t='${"x' onerror='alert(1)"}'>`)
      .toBe("<a t='x&#39; onerror=&#39;alert(1)'>");
  });
});

describe("catalogueRef", () => {
  it("renders a catalogue reference without a number as 000", () => {
    expect(catalogueRef("NAV", undefined)).toContain("NAV-000");
  });
});

describe("layout", () => {
  const doc = layout({ title: "Toast", description: "A brief message.", body: raw("<main>x</main>") });

  it("sets the document language and title", () => {
    expect(doc).toContain('<html lang="en-GB"');
    expect(doc).toContain("<title>Toast · UI Element Compendium</title>");
  });
  it("applies the stored theme before first paint", () => {
    // An inline head script is the only way to avoid a flash of the wrong theme.
    const headEnd = doc.indexOf("</head>");
    const script = doc.indexOf("compendium-theme");
    expect(script).toBeGreaterThan(-1);
    expect(script).toBeLessThan(headEnd);
  });
  it("links the stylesheets and no third-party origins", () => {
    expect(doc).toContain('href="/css/fonts.css"');
    expect(doc).toContain('href="/css/tokens.css"');
    expect(doc).toContain('href="/css/app.css"');
    expect(doc).not.toMatch(/https?:\/\/(?!artifacts\.clydeford\.net)/);
  });
  it("includes a skip link as the first focusable element", () => {
    expect(doc.indexOf('href="#main"')).toBeLessThan(doc.indexOf("<main"));
  });
});
