import { describe, it, expect } from "vitest";
import { render, defaultsFor } from "../public/js/template.js";

describe("render", () => {
  it("substitutes a simple placeholder", () => {
    expect(render("<b>{{label}}</b>", { label: "Save" }).output).toBe("<b>Save</b>");
  });

  it("escapes text content", () => {
    expect(render("<b>{{label}}</b>", { label: "<script>x</script>" }).output)
      .toBe("<b>&lt;script&gt;x&lt;/script&gt;</b>");
  });

  it("escapes the same value identically wherever it appears", () => {
    const out = render('<a title="{{t}}">{{t}}</a>', { t: 'a"b' }).output;
    expect(out).toBe('<a title="a&quot;b">a&quot;b</a>');
  });

  it("contains a value inside a single-quoted attribute", () => {
    const out = render("<img alt='{{x}}'>", { x: "' onerror='alert(1)" }).output;
    expect(out).toBe("<img alt='&#39; onerror=&#39;alert(1)'>");
  });

  it("is not fooled by a > inside an earlier attribute value", () => {
    const out = render('<a title="a>b {{t}}">x</a>', { t: 'x" onmouseover="alert(1)' }).output;
    expect(out).not.toContain('onmouseover="alert(1)"');
  });

  it("contains a value inside a script block", () => {
    const out = render('<script>var x = "{{x}}";</script>', { x: '";alert(1);var y="' }).output;
    expect(out).not.toContain('";alert(1);');
  });

  it("warns when a placeholder sits in an event-handler attribute", () => {
    // HTML decodes entities in attribute values before JS parses them, so
    // escaping cannot make this safe — the author must be told.
    const r = render('<button onclick="f(\'{{x}}\')">c</button>', { x: "a" });
    expect(r.warnings).toContain(
      'placeholder "x" sits in an event-handler attribute, where HTML escaping cannot make it safe'
    );
  });

  it("does not warn for an ordinary quoted attribute", () => {
    expect(render('<a title="{{t}}">x</a>', { t: "hi" }).warnings).toEqual([]);
  });

  it("warns when a placeholder sits in an unquoted attribute", () => {
    const r = render("<div class={{x}}>", { x: "a b" });
    expect(r.warnings).toContain('placeholder "x" sits in an unquoted attribute; wrap it in quotes');
  });

  it("never re-scans substituted content for placeholders", () => {
    // A raw value shaped like {{secret}} must stay literal, or a template
    // could pull in a key it never named.
    const r = render("{{{m}}}", { m: "{{secret}}", secret: "LEAKED" });
    expect(r.output).toBe("{{secret}}");
  });

  it("passes triple-brace values through raw", () => {
    expect(render("{{{markup}}}", { markup: "<i>x</i>" }).output).toBe("<i>x</i>");
  });

  it("renders numbers and booleans", () => {
    expect(render("{{r}}px", { r: 12 }).output).toBe("12px");
    expect(render("{{d}}", { d: false }).output).toBe("false");
  });

  it("includes an if block when the value is truthy", () => {
    expect(render("{{#if on}}YES{{/if}}", { on: true }).output).toBe("YES");
    expect(render("{{#if on}}YES{{/if}}", { on: false }).output).toBe("");
  });

  it("includes an unless block when the value is falsy", () => {
    expect(render("{{#unless on}}NO{{/unless}}", { on: false }).output).toBe("NO");
    expect(render("{{#unless on}}NO{{/unless}}", { on: true }).output).toBe("");
  });

  it("substitutes inside an if block", () => {
    expect(render("{{#if on}}<b>{{label}}</b>{{/if}}", { on: true, label: "Hi" }).output)
      .toBe("<b>Hi</b>");
  });

  it("renders an unknown id as empty and warns", () => {
    const r = render("<b>{{nope}}</b>", { label: "x" });
    expect(r.output).toBe("<b></b>");
    expect(r.warnings).toEqual(['unknown placeholder "nope"']);
  });

  it("does not warn twice for the same id", () => {
    expect(render("{{a}}{{a}}", {}).warnings).toHaveLength(1);
  });

  it("leaves a template with no placeholders untouched", () => {
    expect(render("<hr>", {}).output).toBe("<hr>");
  });
});

describe("defaultsFor", () => {
  it("builds a value object from a controls schema", () => {
    const schema = [
      { id: "label", type: "text", default: "Click me" },
      { id: "radius", type: "number", default: 8 },
      { id: "disabled", type: "toggle", default: false },
    ];
    expect(defaultsFor(schema)).toEqual({ label: "Click me", radius: 8, disabled: false });
  });

  it("ignores malformed schema entries instead of throwing", () => {
    expect(defaultsFor([null, { type: "text" }, { id: "ok", type: "text" }]))
      .toEqual({ ok: "" });
  });

  it("falls back sensibly when a default is missing", () => {
    expect(defaultsFor([
      { id: "a", type: "text" },
      { id: "b", type: "number" },
      { id: "c", type: "toggle" },
      { id: "d", type: "select", options: ["x", "y"] },
      { id: "e", type: "color" },
    ])).toEqual({ a: "", b: 0, c: false, d: "x", e: "#000000" });
  });
});
