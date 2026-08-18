const KEY = "compendium-theme";

// Applying a stored theme on load is done by layout.js's inline head
// script, synchronously, before first paint — a second, later application
// here would flash. That's why there is no applyStoredTheme() export in
// this module.
export function toggleTheme() {
  const root = document.documentElement;
  const current = root.dataset.theme
    || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  localStorage.setItem(KEY, next);
  return next;
}

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-theme-toggle]")) toggleTheme();
});
