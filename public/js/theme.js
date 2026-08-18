const KEY = "compendium-theme";

export function applyStoredTheme() {
  const stored = localStorage.getItem(KEY);
  if (stored) document.documentElement.dataset.theme = stored;
}

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
