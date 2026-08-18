import { describe, it, expect } from "vitest";
import { generateAll, buildDocument } from "../public/js/generate.js";
import { controlHtml } from "../public/js/controls.js";

const templates = {
  html: '<button style="border-radius:{{radius}}px;background:{{bg}}">{{label}}</button>',
  tailwind: '<button class="rounded-[{{radius}}px]">{{label}}</button>',
  react: 'export function Button() { return <button>{{label}}</button>; }',
};

describe("generateAll", () => {
  it("produces one output per template", () => {
    const out = generateAll(templates, { radius: 8, bg: "#241430", label: "Save" });
    expect(Object.keys(out)).toEqual(["html", "tailwind", "react"]);
  });

  it("puts the same control value into every format", () => {
    const out = generateAll(templates, { radius: 16, bg: "#A8E6C1", label: "Save" });
    expect(out.html).toContain("16");
    expect(out.tailwind).toContain("16");
    expect(out.html).toContain("#A8E6C1");
    expect(out.html).toContain("Save");
    expect(out.tailwind).toContain("Save");
    expect(out.react).toContain("Save");
  });

  it("skips absent formats", () => {
    expect(Object.keys(generateAll({ html: "<b>{{x}}</b>" }, { x: "1" }))).toEqual(["html"]);
  });
});

describe("buildDocument", () => {
  it("wraps the html template in a full document", () => {
    const doc = buildDocument("<button>{{label}}</button>", { label: "Go" }, "light");
    expect(doc).toContain("<!doctype html>");
    expect(doc).toContain("<button>Go</button>");
  });

  it("reports its height to the parent", () => {
    expect(buildDocument("<b>x</b>", {}, "light")).toContain("postMessage");
  });

  it("carries the current theme through to the frame", () => {
    expect(buildDocument("<b>x</b>", {}, "dark")).toContain('data-theme="dark"');
  });
});

// controlHtml() is assigned via panel.innerHTML into the TOP-LEVEL page
// (not the sandboxed example iframe), and every field here comes straight
// from an entry's controls_schema, which is writeable via open editing and
// import. Before this test existed there was no coverage of controlHtml()
// at all — that is how the stored XSS survived every prior review.
describe("controlHtml — XSS", () => {
  const PAYLOAD = '<img src=x onerror=alert(1)>';

  function assertNeutralised(html) {
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html).toContain("&lt;img");
  }

  it("escapes a hostile label", () => {
    assertNeutralised(controlHtml({ id: "x", type: "text", label: PAYLOAD }));
  });

  it("escapes hostile select options", () => {
    const html = controlHtml({ id: "x", type: "select", options: [PAYLOAD, "ok"] });
    assertNeutralised(html);
  });

  it("escapes hostile color presets", () => {
    const html = controlHtml({ id: "x", type: "color", presets: [PAYLOAD] });
    assertNeutralised(html);
  });

  it("escapes a hostile default value across every control type", () => {
    assertNeutralised(controlHtml({ id: "x", type: "text", default: PAYLOAD }));
    assertNeutralised(controlHtml({ id: "x", type: "color", default: PAYLOAD }));
    assertNeutralised(controlHtml({ id: "x", type: "number", default: PAYLOAD }));
  });

  it("escapes a script-tag payload in a label", () => {
    const html = controlHtml({ id: "x", type: "text", label: '</label><script>alert(1)</script>' });
    expect(html.toLowerCase()).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
