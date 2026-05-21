create table if not exists repos (
  id bigint primary key,
  full_name text not null unique,
  name text not null,
  owner text not null,
  html_url text not null,
  description text,
  language text,
  topics text[] not null default '{}',
  license text,
  created_at timestamptz,
  updated_at timestamptz,
  last_seen_at timestamptz not null default now()
);

create table if not exists repo_snapshots (
  repo_id bigint not null references repos(id) on delete cascade,
  snapshot_date date not null,
  stars integer not null,
  forks integer not null,
  pushed_at timestamptz,
  primary key (repo_id, snapshot_date)
);

create table if not exists repo_summaries (
  repo_id bigint primary key references repos(id) on delete cascade,
  readme_sha text,
  readme_excerpt text,
  summary_zh text not null,
  why_zh text not null,
  quick_start_zh jsonb not null,
  difficulty text not null,
  eta text not null,
  generated_at timestamptz not null default now()
);

create table if not exists digest_editions (
  digest_date date primary key,
  edition text not null,
  theme text not null,
  total_scanned integer not null default 0,
  curated_count integer not null default 0,
  payload jsonb not null,
  generated_at timestamptz not null default now()
);

create table if not exists digest_items (
  digest_date date not null references digest_editions(digest_date) on delete cascade,
  repo_id bigint not null references repos(id) on delete cascade,
  rank integer not null,
  score numeric not null default 0,
  models text[] not null default '{}',
  item_type text not null,
  payload jsonb not null,
  primary key (digest_date, repo_id)
);

create index if not exists digest_items_date_rank_idx on digest_items (digest_date, rank);
create index if not exists repo_snapshots_date_idx on repo_snapshots (snapshot_date);
