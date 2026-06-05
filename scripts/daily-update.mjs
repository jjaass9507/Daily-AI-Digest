// Daily AI Digest — scheduled update script
// Usage: node scripts/daily-update.mjs
// Env: GITHUB_TOKEN, ANTHROPIC_API_KEY, DATABASE_URL (optional), DIGEST_SIZE
// Writes digest.json locally; also writes to NeonDB when DATABASE_URL is set.

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';

// Load .env if present
try {
  for (const line of readFileSync('.env', 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
} catch {}

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const GITHUB_API = 'https://api.github.com';
const DIGEST_SIZE = parseInt(process.env.DIGEST_SIZE || '8', 10);
const { GITHUB_TOKEN, ANTHROPIC_API_KEY, DATABASE_URL } = process.env;

if (!ANTHROPIC_API_KEY) {
  console.error('[digest] ANTHROPIC_API_KEY is required');
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ─── GitHub helpers ───────────────────────────────────────────────────────────

async function ghFetch(url) {
  const headers = { Accept: 'application/vnd.github.v3+json' };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${url}`);
  return res.json();
}

async function searchRepos(query) {
  const since = new Date(Date.now() - 14 * 86400e3).toISOString().split('T')[0];
  const data = await ghFetch(
    `${GITHUB_API}/search/repositories?q=${encodeURIComponent(`${query} pushed:>${since}`)}&sort=stars&order=desc&per_page=10`
  );
  return data.items || [];
}

async function fetchReadme(fullName) {
  try {
    const data = await ghFetch(`${GITHUB_API}/repos/${fullName}/readme`);
    const raw = Buffer.from(data.content, 'base64').toString('utf-8');
    return { sha: data.sha, excerpt: raw.slice(0, 3000) };
  } catch {
    return { sha: null, excerpt: '' };
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreRepo(repo) {
  const ageSec = (Date.now() - new Date(repo.pushed_at).getTime()) / 1000;
  const recency = Math.max(0, 1 - ageSec / (14 * 86400));
  return (
    Math.log10(repo.stargazers_count + 1) * 2 +
    Math.log10(repo.forks_count + 1) +
    recency * 2 +
    Math.min((repo.topics || []).length, 5) * 0.1
  );
}

// ─── Classification (mirrors src/github-api.js) ───────────────────────────────

function detectModels(repo) {
  const t = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();
  const models = [];
  if (t.includes('claude') || t.includes('anthropic'))                                 models.push('Claude');
  if (t.includes('gemini') || t.includes('google-ai') || t.includes('googleai'))       models.push('Gemini');
  if (t.includes('chatgpt') || t.includes('openai') || /gpt[-]?[45]/.test(t))         models.push('ChatGPT');
  return models.length ? models : ['Claude'];
}

function detectStack(repo) {
  const known = ['TypeScript','JavaScript','Python','Go','Rust','Java','Ruby','Swift','Kotlin','C++','C#'];
  const stack = repo.language && known.includes(repo.language) ? [repo.language] : [];
  const techTopics = ['react','next.js','nextjs','vue','svelte','langchain','langgraph',
                      'fastapi','flask','express','bun','deno','docker','pytorch','tensorflow','mcp'];
  const fromTopics = (repo.topics || []).filter(t => techTopics.includes(t.toLowerCase())).slice(0, 3);
  return [...new Set([...stack, ...fromTopics])].slice(0, 4);
}

function makeCodePreview(repo) {
  const install =
    repo.language === 'Python'                                            ? '$ pip install -r requirements.txt' :
    (repo.language === 'TypeScript' || repo.language === 'JavaScript')   ? '$ npm install' :
    repo.language === 'Go'                                                ? '$ go mod download' :
    repo.language === 'Rust'                                              ? '$ cargo build' : '';
  return [`# ${repo.full_name}`, `$ git clone https://github.com/${repo.full_name}`, `$ cd ${repo.name}`, install]
    .filter(Boolean).join('\n');
}

// ─── Claude summary ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI curator for a daily digest of open-source AI projects.
Given a GitHub repo's metadata and README excerpt, return a JSON object with Chinese (Traditional) summaries.
Output ONLY valid JSON — no markdown fences, no extra text.

Required fields:
- tagline: string, ≤18 Chinese characters, short punchy title
- summary: string, 80-160 Chinese characters, what the project does
- whyValuable: string, 80-180 Chinese characters, why it is worth exploring today
- steps: array of 3-5 strings, Chinese quick-start steps
- difficulty: one of "入門" | "中階" | "進階"
- difficultyLevel: integer 1 | 2 | 3
- eta: e.g. "15 分鐘" | "45 分鐘" | "2 小時"
- type: one of "Agent" | "RAG" | "Tool" | "Demo"
- models: array containing one or more of "Claude" | "Gemini" | "ChatGPT"`;

async function generateSummary(repo, readmeExcerpt) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: JSON.stringify({
      full_name: repo.full_name, description: repo.description,
      language: repo.language, topics: repo.topics,
      stars: repo.stargazers_count, forks: repo.forks_count,
      readme_excerpt: readmeExcerpt,
    }) }],
  });
  const text = msg.content[0].text.trim();
  try { return JSON.parse(text); } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Invalid JSON for ${repo.full_name}`);
  }
}

// ─── Star delta ───────────────────────────────────────────────────────────────

function loadSnapshot() {
  try { return JSON.parse(readFileSync(path.join(ROOT, '.stars-snapshot.json'), 'utf-8')); } catch { return {}; }
}

function saveSnapshot(snapshot) {
  writeFileSync(path.join(ROOT, '.stars-snapshot.json'), JSON.stringify(snapshot, null, 2));
}

function getStarDelta(snapshot, repoId, currentStars) {
  const today = new Date().toISOString().split('T')[0];
  const entry = snapshot[repoId];
  const delta = (entry && entry.date !== today) ? Math.max(0, currentStars - entry.stars) : 0;
  snapshot[repoId] = { stars: currentStars, date: today };
  return delta;
}

// ─── NeonDB writes ────────────────────────────────────────────────────────────

async function writeToNeonDB(sql, dbItems, digest) {
  const today = digest.date;
  console.log('[digest] Writing to NeonDB...');

  for (const { repo, excerpt, sha, ai, pick } of dbItems) {
    const id = repo.id;

    await sql`
      INSERT INTO repos (id, full_name, name, owner, html_url, description, language, topics, license, created_at, updated_at, last_seen_at)
      VALUES (${id}, ${repo.full_name}, ${repo.name}, ${repo.owner.login}, ${repo.html_url},
              ${repo.description || null}, ${repo.language || null}, ${repo.topics || []},
              ${repo.license?.spdx_id || null}, ${repo.created_at}, ${repo.updated_at}, now())
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name, description = EXCLUDED.description,
        language = EXCLUDED.language, topics = EXCLUDED.topics,
        updated_at = EXCLUDED.updated_at, last_seen_at = now()
    `;

    await sql`
      INSERT INTO repo_snapshots (repo_id, snapshot_date, stars, forks, pushed_at)
      VALUES (${id}, ${today}::date, ${repo.stargazers_count}, ${repo.forks_count}, ${repo.pushed_at})
      ON CONFLICT (repo_id, snapshot_date) DO UPDATE SET
        stars = EXCLUDED.stars, forks = EXCLUDED.forks, pushed_at = EXCLUDED.pushed_at
    `;

    if (ai) {
      await sql`
        INSERT INTO repo_summaries (repo_id, readme_sha, readme_excerpt, summary_zh, why_zh, quick_start_zh,
          difficulty, difficulty_level, eta, item_type, models, tagline, generated_at)
        VALUES (${id}, ${sha}, ${excerpt}, ${ai.summary}, ${ai.whyValuable},
          ${JSON.stringify(ai.steps)}::jsonb, ${ai.difficulty}, ${ai.difficultyLevel},
          ${ai.eta}, ${ai.type}, ${ai.models}, ${ai.tagline}, now())
        ON CONFLICT (repo_id) DO UPDATE SET
          readme_sha = EXCLUDED.readme_sha, readme_excerpt = EXCLUDED.readme_excerpt,
          summary_zh = EXCLUDED.summary_zh, why_zh = EXCLUDED.why_zh,
          quick_start_zh = EXCLUDED.quick_start_zh, difficulty = EXCLUDED.difficulty,
          difficulty_level = EXCLUDED.difficulty_level, eta = EXCLUDED.eta,
          item_type = EXCLUDED.item_type, models = EXCLUDED.models,
          tagline = EXCLUDED.tagline, generated_at = now()
      `;
    }
  }

  await sql`
    INSERT INTO digest_editions (digest_date, edition, total_scanned, curated_count, payload, generated_at)
    VALUES (${today}::date, ${digest.edition}, ${digest.totalScanned}, ${digest.curated},
            ${JSON.stringify(digest)}::jsonb, now())
    ON CONFLICT (digest_date) DO UPDATE SET
      edition = EXCLUDED.edition, total_scanned = EXCLUDED.total_scanned,
      curated_count = EXCLUDED.curated_count, payload = EXCLUDED.payload,
      generated_at = now()
  `;

  await sql`DELETE FROM digest_items WHERE digest_date = ${today}::date`;
  for (const { repo, pick } of dbItems) {
    await sql`
      INSERT INTO digest_items (digest_date, repo_id, rank, score, models, item_type, payload)
      VALUES (${today}::date, ${repo.id}, ${pick.rank}, ${pick.score}, ${pick.models}, ${pick.type},
              ${JSON.stringify(pick)}::jsonb)
    `;
  }

  console.log(`[digest] NeonDB updated (${dbItems.length} items)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[digest] Starting daily update...');

  const queries = [
    'claude anthropic in:name,description,topics',
    'gemini google-ai in:name,description,topics',
    'chatgpt openai in:name,description,topics',
    'ai agent mcp in:name,description,topics',
    'rag embedding vector in:name,description,topics',
  ];

  console.log('[digest] Searching GitHub...');
  const results = await Promise.allSettled(queries.map(q => searchRepos(q)));

  const seen = new Set();
  const allRepos = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') { console.warn('[digest] Query failed:', r.reason?.message); continue; }
    for (const repo of r.value) {
      if (!seen.has(repo.id) && !repo.fork) { seen.add(repo.id); allRepos.push(repo); }
    }
  }

  console.log(`[digest] ${allRepos.length} unique repos found`);
  allRepos.sort((a, b) => scoreRepo(b) - scoreRepo(a));
  const topRepos = allRepos.slice(0, DIGEST_SIZE);

  const snapshot = loadSnapshot();
  const picks = [];
  const dbItems = [];

  for (const repo of topRepos) {
    console.log(`[digest] Processing ${repo.full_name}...`);
    const { sha, excerpt } = await fetchReadme(repo.full_name);

    let ai = null;
    try { ai = await generateSummary(repo, excerpt); }
    catch (err) { console.warn(`[digest] Summary skipped for ${repo.full_name}: ${err.message}`); }

    const delta = getStarDelta(snapshot, String(repo.id), repo.stargazers_count);

    const pick = {
      id:              String(repo.id),
      rank:            picks.length + 1,
      name:            repo.name,
      author:          repo.owner.login,
      fullName:        repo.full_name,
      githubUrl:       repo.html_url,
      models:          ai?.models          || detectModels(repo),
      type:            ai?.type            || 'Demo',
      stars:           repo.stargazers_count,
      starsToday:      delta,
      forks:           repo.forks_count,
      difficulty:      ai?.difficulty      || '中階',
      difficultyLevel: ai?.difficultyLevel || 2,
      eta:             ai?.eta             || '45 分鐘',
      stack:           detectStack(repo),
      tagline:         ai?.tagline         || repo.description || repo.name,
      summary:         ai?.summary         || repo.description || '',
      whyValuable:     ai?.whyValuable     || '',
      steps:           ai?.steps           || [],
      codePreview:     makeCodePreview(repo),
      topics:          repo.topics || [],
      license:         repo.license?.spdx_id ?? null,
      updatedAt:       repo.updated_at,
      readmeSha:       sha,
      score:           scoreRepo(repo),
    };

    picks.push(pick);
    dbItems.push({ repo, excerpt, sha, ai, pick });
  }

  saveSnapshot(snapshot);

  // Build aggregates
  const modelCounts = { Claude: 0, Gemini: 0, ChatGPT: 0 };
  const typeCounts  = { Agent: 0, RAG: 0, Tool: 0, Demo: 0 };
  picks.forEach(p => {
    p.models.forEach(m => { if (m in modelCounts) modelCounts[m]++; });
    if (p.type in typeCounts) typeCounts[p.type]++;
  });

  const now  = new Date();
  const days = ['日','一','二','三','四','五','六'];
  const doy  = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400e3);
  const total = results.reduce((s, r) => s + (r.value?.length || 0), 0);

  const cutoff = Date.now() - 14 * 86400e3;
  const newlyReleased = allRepos
    .filter(r => new Date(r.created_at).getTime() > cutoff)
    .slice(0, 4)
    .map(r => ({ name: r.name, author: r.owner.login, tagline: r.description || r.name,
                 stars: r.stargazers_count, starsToday: 0, models: detectModels(r), type: 'Demo' }));

  const trending = picks
    .map(p => ({ name: p.name, delta: `+${p.starsToday || '?'}`,
                 pct: p.starsToday ? `+${((p.starsToday / p.stars) * 100).toFixed(1)}%` : '新上榜' }))
    .slice(0, 7);

  const digest = {
    date:         now.toISOString().split('T')[0],
    dateLabel:    `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · 週${days[now.getDay()]}`,
    edition:      `Vol. ${doy}`,
    totalScanned: total,
    curated:      picks.length,
    picks,
    newlyReleased,
    trending,
    modelCounts,
    typeCounts,
  };

  // Write digest.json (local fallback / for digest.json-based deploys)
  const outPath = path.join(ROOT, 'digest.json');
  writeFileSync(outPath, JSON.stringify(digest, null, 2));
  console.log(`[digest] Written ${outPath} (${picks.length} picks, ${total} scanned)`);

  // Write to NeonDB if configured
  if (DATABASE_URL) {
    const sql = neon(DATABASE_URL);
    await writeToNeonDB(sql, dbItems, digest);
  } else {
    console.log('[digest] DATABASE_URL not set — skipping NeonDB write');
  }
}

main().catch(err => {
  console.error('[digest] Fatal:', err);
  process.exit(1);
});
