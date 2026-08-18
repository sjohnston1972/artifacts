import schema from "../../schema.sql?raw";

export async function applySchema(db) {
  const statements = schema
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const s of statements) {
    await db.prepare(s).run();
  }
}
