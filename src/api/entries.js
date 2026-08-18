import * as db from "../db.js";
import { requireWrite } from "../auth.js";

const CONTROL_TYPES = new Set(["text", "select", "color", "number", "toggle"]);
const TIERS = new Set(["core", "useful", "reference", "deleted"]);
const FORMATS = new Set(["html", "tailwind", "react"]);
const ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

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
    if (!Array.isArray(patch.controls_schema)) return "controls_schema must be an array";
    const seen = new Set();
    for (const c of patch.controls_schema) {
      if (!c || typeof c !== "object") return "each control must be an object";
      if (!ID_RE.test(c.id ?? "")) return `control id "${c.id}" must be a plain identifier`;
      if (seen.has(c.id)) return `duplicate control id "${c.id}"`;
      seen.add(c.id);
      if (!CONTROL_TYPES.has(c.type)) return `unknown control type "${c.type}"`;
      if (c.type === "select" && !(Array.isArray(c.options) && c.options.length)) {
        return `select control "${c.id}" needs an options array`;
      }
    }
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
  if (!String(body.name ?? "").trim()) return bad("name is required");
  if (!Number.isInteger(body.categoryId)) return bad("categoryId is required");
  return Response.json(await db.createEntry(env.DB, {
    name: String(body.name).trim(), categoryId: body.categoryId,
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
