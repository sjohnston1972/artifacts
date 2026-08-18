import * as db from "../db.js";
import { requireWrite } from "../auth.js";
import { validateControlsSchema } from "./controlSchema.js";

const TIERS = new Set(["core", "useful", "reference", "deleted"]);
const FORMATS = new Set(["html", "tailwind", "react"]);

function bad(message) {
  return Response.json({ error: message }, { status: 400 });
}

function validate(patch) {
  if ("tier" in patch && !TIERS.has(patch.tier)) {
    return `unknown tier "${patch.tier}"`;
  }
  if ("templates" in patch) {
    if (typeof patch.templates !== "object" || patch.templates === null || Array.isArray(patch.templates)) {
      return "templates must be a JSON object keyed by format";
    }
    for (const key of Object.keys(patch.templates)) {
      if (!FORMATS.has(key)) return `unknown template format "${key}"`;
      if (typeof patch.templates[key] !== "string") return `template "${key}" must be a string`;
    }
  }
  if ("controls_schema" in patch) {
    const error = validateControlsSchema(patch.controls_schema);
    if (error) return error;
  }
  if ("aliases" in patch && !Array.isArray(patch.aliases)) return "aliases must be an array";
  return null;
}

export async function saveEntryRoute(request, env, ctx, params) {
  const locked = requireWrite(request, env);
  if (locked) return locked;
  let patch;
  try { patch = await request.json(); } catch { return bad("body must be JSON"); }
  const error = validate(patch);
  if (error) return bad(error);
  try {
    return Response.json(await db.saveEntry(env.DB, params.slug, patch));
  } catch (e) {
    return Response.json({ error: String(e.message) }, { status: 404 });
  }
}

export async function createEntryRoute(request, env) {
  const locked = requireWrite(request, env);
  if (locked) return locked;
  let body;
  try { body = await request.json(); } catch { return bad("body must be JSON"); }
  const name = String(body.name ?? "").trim();
  if (!name) return bad("name is required");
  // A name like "!!!" is non-blank but slugifies to "", which would produce an
  // entry with an empty slug and therefore no reachable URL.
  if (!/[a-z0-9]/i.test(name)) {
    return bad("name must contain at least one letter or number");
  }
  if (!Number.isInteger(body.categoryId)) return bad("categoryId is required");
  return Response.json(await db.createEntry(env.DB, {
    name, categoryId: body.categoryId,
  }));
}

export async function listRevisionsRoute(request, env, ctx, params) {
  const entry = await db.getEntryBySlug(env.DB, params.slug);
  if (!entry) return new Response("Not found", { status: 404 });
  return Response.json(await db.listRevisions(env.DB, entry.id));
}

export async function restoreRoute(request, env, ctx, params) {
  const locked = requireWrite(request, env);
  if (locked) return locked;
  try {
    return Response.json(await db.restoreRevision(env.DB, Number(params.id)));
  } catch (e) {
    return Response.json({ error: String(e.message) }, { status: 404 });
  }
}
