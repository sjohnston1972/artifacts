import { describe, it, expect } from "vitest";
import { generateAll, buildDocument } from "../public/js/generate.js";

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
