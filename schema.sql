PRAGMA foreign_keys = ON;
DROP TABLE IF EXISTS revisions;
DROP TABLE IF EXISTS entry_categories;
DROP TABLE IF EXISTS entries;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  code        TEXT NOT NULL UNIQUE,   -- 3 letters, for catalogue refs
  sort_order  INTEGER NOT NULL
);

CREATE TABLE entries (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  aliases         TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
  definition      TEXT NOT NULL,
  notes           TEXT,
  controls_schema TEXT NOT NULL DEFAULT '[]',   -- JSON array, section 4
  templates       TEXT NOT NULL DEFAULT '{}',   -- JSON object, section 5
  tier            TEXT NOT NULL DEFAULT 'reference',
  has_example     INTEGER NOT NULL DEFAULT 0,
  catalogue_no    INTEGER NOT NULL,             -- position in primary category
  updated_at      TEXT NOT NULL,
  CHECK (tier IN ('core','useful','reference','deleted'))
);

CREATE TABLE entry_categories (
  entry_id    INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  is_primary  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (entry_id, category_id)
);

CREATE TABLE revisions (
  id         INTEGER PRIMARY KEY,
  entry_id   INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  snapshot   TEXT NOT NULL,        -- full JSON of the entry BEFORE the change
  changed_at TEXT NOT NULL
);

CREATE INDEX idx_entries_tier    ON entries(tier);
CREATE INDEX idx_entries_example ON entries(has_example);
CREATE INDEX idx_ec_category     ON entry_categories(category_id);
CREATE INDEX idx_revisions_entry ON revisions(entry_id, changed_at DESC);

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO meta (key, value) VALUES ('index_version', '1');
