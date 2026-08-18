document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-copy]");
  if (!button) return;
  const code = button.closest(".code__panel").querySelector("code").textContent;
  try {
    await navigator.clipboard.writeText(code);
    stamp(button, "Copied");
  } catch {
    stamp(button, "Press Ctrl+C");
  }
});

function stamp(button, message) {
  const original = button.textContent;
  button.textContent = message;
  button.classList.add("is-copied");
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove("is-copied");
  }, 1400);
}
