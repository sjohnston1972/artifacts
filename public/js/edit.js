// Drives the edit form, the new-entry form, and the Restore buttons on the
// history page. No framework: FormData in, JSON out, errors shown inline —
// and crucially, a rejected submission never clears what was typed.

for (const form of document.querySelectorAll("form.edit")) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    let payload;
    try {
      payload = form.dataset.mode === "new"
        ? {
            name: data.get("name"),
            categoryId: Number(data.get("categoryId")),
          }
        : {
            name: data.get("name"),
            aliases: String(data.get("aliases") || "")
              .split(",").map((s) => s.trim()).filter(Boolean),
            definition: data.get("definition"),
            notes: data.get("notes"),
            tier: data.get("tier"),
            controls_schema: JSON.parse(data.get("controls_schema") || "[]"),
            templates: JSON.parse(data.get("templates") || "{}"),
          };
    } catch (err) {
      showError(form, `That JSON will not parse: ${err.message}`);
      return;
    }

    const res = await fetch(form.action, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      if (form.dataset.mode === "new") {
        const created = await res.json();
        location.href = `/e/${created.slug}/edit`;
      } else {
        location.href = form.dataset.after;
      }
      return;
    }

    let message = "That did not save.";
    try {
      message = (await res.json()).error || message;
    } catch { /* non-JSON error body: keep the generic message */ }
    showError(form, message);
  });
}

function showError(form, message) {
  const box = form.parentElement.querySelector(".edit__error");
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
  // The blur-time JSON check moves focus natively via reportValidity(); this
  // path (client-side parse failure and server-side rejection alike) must
  // do the same so keyboard and screen-reader users land on the message
  // rather than a silently-updated box off the current focus.
  box.tabIndex = -1;
  box.focus();
}

// Pretty-print JSON textareas on blur and surface parse errors as native
// field validity, without ever overwriting the field on a failed parse.
for (const field of document.querySelectorAll("textarea[data-json]")) {
  field.addEventListener("blur", () => {
    if (!field.value.trim()) {
      field.setCustomValidity("");
      return;
    }
    try {
      const parsed = JSON.parse(field.value);
      field.value = JSON.stringify(parsed, null, 2);
      field.setCustomValidity("");
    } catch (err) {
      field.setCustomValidity(err.message);
      field.reportValidity();
    }
  });
}

// Restore buttons on the history page.
document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-restore-id]");
  if (!button) return;
  button.disabled = true;
  try {
    const res = await fetch(`/api/revisions/${button.dataset.restoreId}/restore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    if (res.ok) {
      const restored = await res.json();
      location.href = `/e/${restored.slug}`;
      return;
    }
    const body = await res.json().catch(() => ({}));
    alert(body.error || "Restore failed.");
  } finally {
    button.disabled = false;
  }
});
