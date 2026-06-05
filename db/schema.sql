-- Daily AI Digest — NeonDB schema
-- Run once in the NeonDB SQL editor to initialize the database.

CREATE TABLE IF NOT EXISTS repos (
  id            bigint PRIMARY KEY,
  full_name     text NOT NULL,
  name          text NOT NULL,
  owner         text NOT NULL,
  html_url      text NOT NULL,
  description   text,
  language      text,
  topics        text[],
  license       text,
  created_at    timestamptz,
  updated_at    timestamptz,
  last_seen_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repo_snapshots (
  repo_id        bigint NOT NULL REFERENCES repos(id),
  snapshot_date  date NOT NULL,
  stars          integer,
  forks          integer,
  pushed_at      timestamptz,
  PRIMARY KEY (repo_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS repo_summaries (
  repo_id         bigint PRIMARY KEY REFERENCES repos(id),
  readme_sha      text,
  readme_excerpt  text,
  summary_zh      text,
  why_zh          text,
  quick_start_zh  jsonb,
  difficulty      text,
  difficulty_level integer,
  eta             text,
  item_type       text,
  models          text[],
  tagline         text,
  generated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digest_editions (
  digest_date    date PRIMARY KEY,
  edition        text,
  total_scanned  integer,
  curated_count  integer,
  payload        jsonb NOT NULL,
  generated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digest_items (
  digest_date  date NOT NULL,
  repo_id      bigint NOT NULL REFERENCES repos(id),
  rank         integer,
  score        numeric,
  models       text[],
  item_type    text,
  payload      jsonb NOT NULL,
  PRIMARY KEY (digest_date, repo_id)
);
