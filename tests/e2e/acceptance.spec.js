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
  for (const theme of ["light", "dark"]) {
    await page.goto("/e/button");
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
    await expect(page.locator(".catalogue-ref")).toHaveText(/BTN-\d{3}/);
    await expect(page.locator(".plate__stamp")).toHaveText("Buttons & Actions");
    const gradient = await page.locator(".plate").evaluate((el) =>
      getComputedStyle(el, "::before").backgroundImage);
    expect(gradient).toContain("radial-gradient");
    await expect(page.locator(".plate")).toBeVisible();
  }
});

test("escape closes the palette and returns focus", async ({ page }) => {
  await page.goto("/");
  await page.locator("#q").focus();
  const before = await page.evaluate(() => document.activeElement.id);
  await page.keyboard.press("Escape");
  await page.evaluate(() => document.querySelector(".masthead__title").focus());
  await page.keyboard.press("Meta+k");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.activeElement.className)).toContain("masthead__title");
});

test.describe("reduced motion", () => {
  // The `reducedMotion` context option (test.use) is a no-op in this
  // Playwright/Chromium/Windows combination — matchMedia still reports
  // prefers-reduced-motion: no-preference after it (verified directly:
  // even on about:blank, test.use({ reducedMotion: "reduce" }) left
  // `(prefers-reduced-motion: no-preference)` matching true). The CDP-level
  // page.emulateMedia() call below sets the same media feature and was
  // confirmed to actually flip matchMedia, so it is used instead. The
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
