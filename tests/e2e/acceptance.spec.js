// One test per acceptance check in spec section 12. These encode the
// spec's own definition of "done" — do not soften an assertion to make a
// test pass; if a check genuinely cannot be met, that is a finding to
// report, not a test to relax.
import { test, expect } from "@playwright/test";

test("searching toast finds it and the page has definition, example, tweaks and a code tab", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Meta+k");
  await page.keyboard.type("toast");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/e\/toast/);
  await expect(page.locator(".entry__def")).not.toBeEmpty();
  await expect(page.locator("iframe.stage")).toBeVisible();
  await expect(page.locator(".tweaks__controls .ctl")).not.toHaveCount(0);
  await expect(page.getByRole("tab", { name: "HTML + CSS" })).toBeVisible();
});

test("the visible search box (not just Cmd+K) ranks an exact match first", async ({ page }) => {
  // Task 15's original acceptance test only ever drove the command palette,
  // which already scored relevance client-side. That let the server-side
  // search behind the plain <input id="q"> ship with no ranking at all —
  // ORDER BY e.name put "Notification Toast" ahead of the exact match
  // "Toast". Drive the visible box here so this path is actually covered.
  await page.goto("/");
  await page.fill("#q", "toast");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\?q=toast/);
  await expect(page.locator(".card__name").first()).toHaveText("Toast");
});

test("changing a colour updates the example and every code tab", async ({ page }) => {
  await page.goto("/e/button");
  await page.locator('.swatch[data-value="#E8A020"]').click();
  for (const tab of ["HTML + CSS", "Tailwind CSS", "React"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page.locator(".code__panel:not([hidden]) code")).toContainText("#E8A020");
  }
  const frame = page.frameLocator("iframe.stage");
  await expect(frame.locator("button")).toHaveCSS("background-color", "rgb(232, 160, 32)");
});

test("editing then restoring returns the original definition", async ({ page }) => {
  await page.goto("/e/card");
  const original = await page.locator(".entry__def").textContent();
  await page.goto("/e/card/edit");
  await page.fill('[name="definition"]', "Temporarily wrong.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator(".entry__def")).toHaveText("Temporarily wrong.");
  await page.goto("/e/card/history");
  await page.getByRole("button", { name: "Restore" }).first().click();
  await page.goto("/e/card");
  await expect(page.locator(".entry__def")).toHaveText(original.trim());
});

test("the specimen plate gets the room the design brief asks for", async ({ page }) => {
  // Regression guard: the entry grid once placed the specimen in a 355px
  // sidebar next to 709px of prose, leaving the iframe 179px wide.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/e/table");
  const widths = await page.evaluate(() => ({
    main: document.querySelector("main").getBoundingClientRect().width,
    stage: document.querySelector("iframe.stage").getBoundingClientRect().width,
  }));
  expect(widths.stage).toBeGreaterThan(widths.main * 0.5);
});

test("the site is usable one-handed on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // No horizontal scroll: the commonest one-handed failure.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.goto("/e/button");
  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  // Every control is a comfortable touch target.
  for (const ctl of await page.locator(".tweaks__controls input, .tweaks__controls select").all()) {
    const box = await ctl.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(40);
  }
});

test("a hostile URL fragment cannot corrupt the example or the code", async ({ page }) => {
  // The fragment is attacker-supplyable via a shared link. Unvalidated it
  // rendered `border-radius:NaNpx` in the example AND all three code tabs
  // while the slider clamped to its default — panel and specimen disagreeing.
  await page.goto("/e/button#radius=16");
  await expect(page.locator('[name="radius"]')).toHaveValue("16");
  await expect(page.locator(".code__panel:not([hidden]) code")).toContainText("16");

  for (const bad of ["NaN", "Infinity", "1e999"]) {
    await page.goto(`/e/button#radius=${bad}`);
    const code = await page.locator(".code__panel:not([hidden]) code").textContent();
    expect(code).not.toMatch(/NaN|Infinity/);
    const frame = page.frameLocator("iframe.stage");
    await expect(frame.locator("button")).not.toHaveCSS("border-radius", /NaN/);
  }

  // Out-of-range values clamp to the control's own max, so the slider and the
  // generated code agree by construction.
  await page.goto("/e/button#radius=9999");
  const slider = page.locator('[name="radius"]');
  const max = await slider.getAttribute("max");
  await expect(slider).toHaveValue(max);
  await expect(page.locator(".code__panel:not([hidden]) code")).toContainText(max);
});

test("Cmd+K navigates without the mouse from any page", async ({ page }) => {
  await page.goto("/e/affordance");
  await page.keyboard.press("Meta+k");
  await page.keyboard.type("modal");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/e\/modal/);
});

test("the Button plate shows its gradient, reference and stamp in both themes", async ({ page }) => {
  const seen = {};
  for (const theme of ["light", "dark"]) {
    await page.goto("/e/button");
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await expect(page.locator(".catalogue-ref")).toHaveText(/BTN-\d{3}/);
    await expect(page.locator(".plate__stamp")).toHaveText("Buttons & Actions");
    await expect(page.locator(".plate")).toBeVisible();
    seen[theme] = await page.locator(".plate").evaluate((el) => ({
      gradient: getComputedStyle(el, "::before").backgroundImage,
      opacity: getComputedStyle(el, "::before").opacity,
      plateBg: getComputedStyle(el).backgroundColor,
      pageFg: getComputedStyle(document.body).color,
    }));
    expect(seen[theme].gradient).toContain("radial-gradient");
  }
  // Without these three, the loop is decorative: the aurora stops are defined
  // once on :root and never per theme, so backgroundImage is byte-identical in
  // light and dark. Every other assertion above is theme-independent too, so
  // the test would pass with the whole [data-theme="dark"] block deleted.
  // These read the properties that genuinely change.
  expect(seen.dark.opacity).not.toBe(seen.light.opacity);
  expect(seen.dark.plateBg).not.toBe(seen.light.plateBg);
  expect(seen.dark.pageFg).not.toBe(seen.light.pageFg);
});

test("exported markdown re-imports cleanly with no data loss", async ({ page, request }) => {
  // Spec section 12's fourth acceptance check. Re-parsed with parseGlossary —
  // the very parser the seeder uses — so this is a real round trip rather than
  // a test of a bespoke reader written to agree with the writer.
  const { parseGlossary } = await import("../../src/seed/parse.js");
  const md = await (await request.get("/api/export.md")).text();
  const json = await (await request.get("/api/export.json")).json();
  const reparsed = parseGlossary(md);
  const names = reparsed.categories.flatMap((c) => c.rows.map((r) => r.term)).sort();
  const expected = json.entries.map((e) => e.name).sort();
  expect(names).toEqual(expected);
  expect(reparsed.categories).toHaveLength(json.categories.length);
});

test("escape closes the palette and returns focus", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.querySelector(".masthead__title").focus());
  await page.keyboard.press("Meta+k");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.activeElement.className)).toContain("masthead__title");
});

test.describe("reduced motion", () => {
  // The `reducedMotion` context option (test.use) did not take effect in my
  // testing — matchMedia kept reporting prefers-reduced-motion: no-preference
  // after it, even on about:blank with no app code involved. Root cause not
  // isolated (review independently confirmed browser.newContext({
  // reducedMotion: "reduce" }) does work, so the option is not categorically
  // inert here — my test.use usage was likely mis-scoped rather than the
  // mechanism itself being broken). The CDP-level page.emulateMedia() call
  // below reliably flips the media query, so it is used instead. The
  // assertion itself — zero moving elements — is unchanged.
  test("plays no animation anywhere", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of ["/", "/e/button", "/e/button/edit"]) {
      await page.goto(path);
      const moving = await page.evaluate(() =>
        [...document.querySelectorAll("*")].filter((el) => {
          const s = getComputedStyle(el);
          const dur = (v) => v.split(",").some((d) => parseFloat(d) > 0);
          return dur(s.transitionDuration) || dur(s.animationDuration);
        }).length);
      expect({ path, moving }).toEqual({ path, moving: 0 });
    }
  });
});
