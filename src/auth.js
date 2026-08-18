// The ONE place a future shared edit key gets checked. Every write route
// calls this. Implementing the key means filling in this function and
// changing nothing else — no accounts, no sessions, no user table.
export function requireWrite(request, env) {
  if (!env.EDIT_KEY) return null;           // open editing, as specified today
  const supplied = request.headers.get("x-edit-key")
    || cookie(request, "edit_key");
  if (supplied === env.EDIT_KEY) return null;
  return new Response("Editing is locked", { status: 401 });
}

function cookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
