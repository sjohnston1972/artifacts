import { describe, it, expect } from "vitest";
import { route } from "../src/router.js";

const routes = [
  { method: "GET", pattern: "/", handler: "browse" },
  { method: "GET", pattern: "/e/:slug", handler: "entry" },
  { method: "GET", pattern: "/e/:slug/history", handler: "history" },
  { method: "POST", pattern: "/api/entries/:slug", handler: "save" },
];

describe("route", () => {
  it("matches a static path", () => {
    expect(route(routes, "GET", "/")).toEqual({ handler: "browse", params: {} });
  });

  it("extracts a named parameter", () => {
    expect(route(routes, "GET", "/e/toast")).toEqual({
      handler: "entry",
      params: { slug: "toast" },
    });
  });

  it("prefers the longer pattern over the shorter prefix", () => {
    expect(route(routes, "GET", "/e/toast/history").handler).toBe("history");
  });

  it("distinguishes methods on the same path", () => {
    expect(route(routes, "GET", "/api/entries/toast")).toBeNull();
    expect(route(routes, "POST", "/api/entries/toast").handler).toBe("save");
  });

  it("returns null for an unknown path", () => {
    expect(route(routes, "GET", "/nope")).toBeNull();
  });

  it("decodes percent-encoded parameters", () => {
    expect(route(routes, "GET", "/e/data%20grid").params.slug).toBe("data grid");
  });
});
