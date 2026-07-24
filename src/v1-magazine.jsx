// Apple.com product-page style implementation for Daily AI Digest.

const { useEffect, useMemo, useState } = React;

const COLORS = window.MODEL_COLORS || {
  Claude: { fg: "#c96442", bg: "rgba(201,100,66,0.10)" },
  Gemini: { fg: "#2a6fdb", bg: "rgba(42,111,219,0.10)" },
  ChatGPT: { fg: "#137a5a", bg: "rgba(19,122,90,0.10)" },
};

const TYPE_LABELS = {
  Agent: "Agent",
  RAG: "RAG",
  Tool: "工具",
  Demo: "Demo",
};

const HERO_GRADIENTS = {
  Claude: "radial-gradient(120% 100% at 18% 12%, #ffb088 0%, #ff5b30 34%, #c93f00 68%, #4a1500 100%)",
  Gemini: "radial-gradient(120% 100% at 18% 12%, #8fbeff 0%, #2a6fdb 40%, #1d3fa6 74%, #061336 100%)",
  ChatGPT: "radial-gradient(120% 100% at 18% 12%, #67e8b9 0%, #137a5a 40%, #0a523c 74%, #021a10 100%)",
  Multi: "linear-gradient(125deg, #ff6b35 0%, #ff2d92 28%, #8b5cf6 56%, #2a9df4 82%, #00d9ff 100%)",
};

function heroBg(pick) {
  if (!pick) return HERO_GRADIENTS.Multi;
  return pick.models?.length > 1 ? HERO_GRADIENTS.Multi : (HERO_GRADIENTS[pick.models?.[0]] || HERO_GRADIENTS.Claude);
}

function ModelChip({ model, inverse = false }) {
  const color = COLORS[model] || COLORS.Claude;
  return (
    <span className={inverse ? "model-chip inverse" : "model-chip"} style={{ "--chip": color.fg, "--chip-bg": color.bg }} aria-label={`模型 ${model}`}>
      <span />
      {model}
    </span>
  );
}

function StatBlock({ value, label, inverse = false }) {
  return (
    <div className={inverse ? "stat-block inverse" : "stat-block"}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function FeatureSection({ pick, index, total }) {
  const alt = index % 2 === 1;

  return (
    <section id={`pick-${index + 1}`} className={alt ? "feature-section alt" : "feature-section"}>
      <div className="section-inner">
        <div className="eyebrow-row">
          <span>NO. {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <i />
          <span>{TYPE_LABELS[pick.type] || pick.type}</span>
        </div>

        <h2>{pick.tagline || pick.name}</h2>
        <p className="section-summary">{pick.summary}</p>

        <div className="pill-row">
          {(pick.models || []).map((model) => <ModelChip key={model} model={model} />)}
          {(pick.stack || []).slice(0, 4).map((item) => <span className="stack-pill" key={item}>{item}</span>)}
        </div>

        <div className="product-visual" style={{ background: heroBg(pick) }}>
          <div className="visual-glow one" />
          <div className="visual-glow two" />
          <div className="visual-content">
            <div>
              <p>{pick.author}</p>
              <h3>{pick.name}</h3>
            </div>
            <div className="visual-stats">
              <StatBlock inverse value={(pick.stars || 0).toLocaleString()} label="GitHub 星數" />
              <StatBlock inverse value={`+${pick.starsToday || 0}`} label="今日增長" />
              <StatBlock inverse value={pick.difficulty || "中等"} label={`難度 ${pick.difficultyLevel || 2}/3`} />
              <StatBlock inverse value={pick.eta || "45 分鐘"} label="預估上手" />
            </div>
          </div>
        </div>

        <div className="feature-copy">
          <div>
            <h3>值得關注</h3>
            <p>{pick.whyValuable}</p>
          </div>
          <div>
            <h3>快速上手</h3>
            <ol>
              {(pick.steps || []).map((step, stepIndex) => (
                <li key={stepIndex}>
                  <span>{String(stepIndex + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {pick.codePreview && (
          <div className="code-panel">
            <h3>啟動指令</h3>
            <pre>{pick.codePreview}</pre>
          </div>
        )}

        <div className="action-row">
          <a href={pick.githubUrl} target="_blank" rel="noreferrer">打開 GitHub</a>
          <a href={`#pick-${Math.min(index + 2, total)}`}>下一個專案</a>
        </div>
      </div>
    </section>
  );
}

function DigestApp({ data, status, onRefresh, token, onTokenChange, onClearCache, editions, selectedDate, onSelectDate }) {
  const [query, setQuery] = useState("");
  const [activeModel, setActiveModel] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [showTop, setShowTop] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tokenDraft, setTokenDraft] = useState(token || "");
  const [dark, setDark] = useState(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("digest-theme") : null;
    if (saved === "dark") return true;
    if (saved === "light") return false;
    return typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
  });

  const picks = data?.picks || [];

  const availableModels = useMemo(() => {
    const set = new Set();
    picks.forEach((pick) => (pick.models || []).forEach((model) => set.add(model)));
    return [...set];
  }, [picks]);

  const availableTypes = useMemo(() => {
    const set = new Set();
    picks.forEach((pick) => { if (pick.type) set.add(pick.type); });
    return [...set];
  }, [picks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return picks.filter((pick) => {
      if (activeModel && !(pick.models || []).includes(activeModel)) return false;
      if (activeType && pick.type !== activeType) return false;
      if (!q) return true;
      return `${pick.name} ${pick.author} ${pick.summary} ${pick.type} ${(pick.models || []).join(" ")} ${(pick.stack || []).join(" ")}`.toLowerCase().includes(q);
    });
  }, [picks, query, activeModel, activeType]);

  const hasActiveFilter = Boolean(activeModel || activeType || query.trim());
  const clearFilters = () => { setActiveModel(null); setActiveType(null); setQuery(""); };

  const toggleTheme = () => setDark((v) => {
    const next = !v;
    try { localStorage.setItem("digest-theme", next ? "dark" : "light"); } catch (e) {}
    return next;
  });

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("digest-dark", dark);
  }, [dark]);
  const totalStars = picks.reduce((sum, pick) => sum + (pick.stars || 0), 0);
  const totalNewStars = picks.reduce((sum, pick) => sum + (pick.starsToday || 0), 0);

  return (
    <div className={dark ? "product-page dark" : "product-page"}>
      <style>{`
        .product-page {
          min-height: 100%;
          background: #ffffff;
          color: #1d1d1f;
          font-family: var(--a-sans);
        }
        .product-page * { letter-spacing: 0; }
        .product-nav {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255,255,255,0.78);
          border-bottom: 1px solid rgba(0,0,0,0.08);
          backdrop-filter: blur(22px) saturate(180%);
        }
        .nav-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 12px 24px;
          display: grid;
          grid-template-columns: auto minmax(180px, 1fr) auto;
          gap: 18px;
          align-items: center;
        }
        .brand {
          font-weight: 700;
          font-size: 18px;
          white-space: nowrap;
        }
        .search-box {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 999px;
          padding: 9px 16px;
          background: #f5f5f7;
          color: #1d1d1f;
          font-size: 14px;
          outline: none;
        }
        .nav-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          justify-content: flex-end;
        }
        button,
        .nav-actions a,
        .action-row a {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 999px;
          background: #ffffff;
          color: #1d1d1f;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          padding: 8px 15px;
          text-decoration: none;
          white-space: nowrap;
        }
        .primary-nav {
          background: #0071e3;
          border-color: #0071e3;
          color: #ffffff;
        }
        .edition-select {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 999px;
          background: #ffffff;
          color: #1d1d1f;
          font: inherit;
          font-size: 13px;
          padding: 8px 15px;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 28px;
          max-width: 160px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .settings-wrap {
          position: relative;
        }
        .settings-popover {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 320px;
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 14px;
          box-shadow: 0 18px 40px rgba(0,0,0,0.14);
          padding: 14px;
        }
        .settings-popover label {
          display: grid;
          gap: 8px;
          color: #6e6e73;
          font-size: 12px;
        }
        .settings-popover input {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 10px;
          padding: 9px 11px;
          font: inherit;
        }
        .settings-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }
        .product-hero {
          position: relative;
          overflow: hidden;
          padding: 112px 24px 96px;
          text-align: center;
          background: #ffffff;
        }
        .hero-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(70% 55% at 50% 0%, rgba(0,113,227,0.12), transparent 72%);
          pointer-events: none;
        }
        .hero-inner {
          position: relative;
          max-width: 1120px;
          margin: 0 auto;
        }
        .hero-kicker {
          color: #0071e3;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 18px;
        }
        .product-hero h1 {
          max-width: 980px;
          margin: 0 auto 28px;
          font-size: clamp(52px, 8vw, 104px);
          line-height: 0.96;
          font-weight: 800;
        }
        .hero-gradient-text {
          background: linear-gradient(120deg, #ff6b35 0%, #ff2d92 28%, #8b5cf6 56%, #2a9df4 84%, #00d9ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .hero-copy {
          max-width: 760px;
          margin: 0 auto 44px;
          color: #424245;
          font-size: clamp(18px, 2vw, 24px);
          line-height: 1.45;
        }
        .hero-cta {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 64px;
        }
        .hero-cta a,
        .hero-cta button {
          border: none;
          border-radius: 999px;
          padding: 12px 22px;
          font-size: 15px;
          text-decoration: none;
        }
        .hero-cta a {
          background: #0071e3;
          color: white;
        }
        .hero-cta button {
          background: #f5f5f7;
          color: #1d1d1f;
        }
        .hero-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid rgba(0,0,0,0.08);
          background: rgba(0,0,0,0.08);
        }
        .stat-block {
          background: #f5f5f7;
          padding: 26px 22px;
          text-align: left;
        }
        .stat-block strong {
          display: block;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1;
          font-weight: 800;
        }
        .stat-block span {
          display: block;
          margin-top: 10px;
          color: #6e6e73;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .stat-block.inverse {
          background: transparent;
          color: #ffffff;
          padding: 0;
        }
        .stat-block.inverse strong {
          font-size: 30px;
        }
        .stat-block.inverse span {
          color: rgba(255,255,255,0.76);
        }
        .feature-section {
          padding: 96px 24px;
          background: #f5f5f7;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        .feature-section.alt {
          background: #ffffff;
        }
        .section-inner {
          max-width: 1080px;
          margin: 0 auto;
        }
        .eyebrow-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
          color: #0071e3;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .eyebrow-row i {
          width: 32px;
          height: 1px;
          background: rgba(0,0,0,0.24);
        }
        .feature-section h2 {
          max-width: 940px;
          margin: 0 0 24px;
          font-size: clamp(38px, 5.6vw, 68px);
          line-height: 1.02;
          font-weight: 800;
        }
        .section-summary {
          max-width: 790px;
          margin: 0 0 40px;
          color: #424245;
          font-size: clamp(18px, 2vw, 23px);
          line-height: 1.45;
        }
        .pill-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 56px;
        }
        .model-chip,
        .stack-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 700;
          color: var(--chip);
          background: var(--chip-bg);
        }
        .model-chip span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--chip);
        }
        .model-chip.inverse {
          color: white;
          background: rgba(255,255,255,0.18);
        }
        .model-chip.inverse span {
          background: white;
        }
        .stack-pill {
          color: #424245;
          background: #f5f5f7;
        }
        .product-visual {
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          min-height: 330px;
          padding: 44px 48px;
          color: white;
          box-shadow: 0 28px 60px rgba(0,0,0,0.16);
          margin-bottom: 64px;
        }
        .visual-glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .visual-glow.one {
          right: -180px;
          top: -130px;
          width: 540px;
          height: 540px;
          background: radial-gradient(circle, rgba(255,255,255,0.35), transparent 60%);
          filter: blur(40px);
        }
        .visual-glow.two {
          left: -100px;
          bottom: -130px;
          width: 380px;
          height: 380px;
          background: radial-gradient(circle, rgba(0,0,0,0.4), transparent 60%);
          filter: blur(50px);
        }
        .visual-content {
          position: relative;
          min-height: 242px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .visual-content p {
          margin: 0 0 6px;
          font-family: var(--a-mono);
          font-size: 13px;
          opacity: 0.88;
        }
        .visual-content h3 {
          margin: 0;
          font-size: clamp(30px, 5vw, 52px);
          line-height: 1;
          font-weight: 800;
        }
        .visual-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
          max-width: 760px;
        }
        .feature-copy {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 48px;
          margin-bottom: 56px;
        }
        .feature-copy h3,
        .code-panel h3 {
          margin: 0 0 14px;
          color: #6e6e73;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .feature-copy p {
          margin: 0;
          color: #1d1d1f;
          font-size: 20px;
          line-height: 1.5;
          font-weight: 600;
        }
        .feature-copy ol {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .feature-copy li {
          display: grid;
          grid-template-columns: 36px 1fr;
          gap: 16px;
          padding: 13px 0;
          border-top: 1px solid rgba(0,0,0,0.1);
        }
        .feature-copy li:last-child {
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        .feature-copy li span {
          color: #0071e3;
          font-weight: 800;
          font-size: 18px;
        }
        .feature-copy li p {
          font-size: 15px;
          font-weight: 500;
          color: #424245;
        }
        .code-panel pre {
          margin: 0;
          overflow: auto;
          border-radius: 18px;
          background: #1d1d1f;
          color: #f5f5f7;
          padding: 22px 26px;
          font: 13px/1.75 var(--a-mono);
        }
        .action-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 40px;
        }
        .action-row a:first-child {
          background: #0071e3;
          border-color: #0071e3;
          color: white;
        }
        .bento-section {
          padding: 96px 24px;
          background: #ffffff;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        .bento-inner {
          max-width: 1080px;
          margin: 0 auto;
        }
        .bento-inner h2 {
          max-width: 720px;
          margin: 0 0 34px;
          font-size: clamp(38px, 5.6vw, 64px);
          line-height: 1.03;
          font-weight: 800;
        }
        .bento-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 18px;
        }
        .bento-card {
          border-radius: 24px;
          background: #f5f5f7;
          padding: 28px;
          min-height: 260px;
        }
        .bento-card h3 {
          margin: 0 0 16px;
          font-size: 22px;
        }
        .trend-row {
          display: grid;
          grid-template-columns: 34px 1fr auto;
          gap: 14px;
          padding: 12px 0;
          border-top: 1px solid rgba(0,0,0,0.08);
          align-items: center;
        }
        .trend-row:first-of-type {
          border-top: none;
        }
        .trend-row span:first-child {
          color: #86868b;
          font-weight: 800;
        }
        .trend-row strong {
          color: #0071e3;
        }
        .mix-row {
          margin-bottom: 16px;
        }
        .mix-row div {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 14px;
        }
        .mix-row i {
          display: block;
          height: 7px;
          border-radius: 999px;
          background: #e8e8ed;
          overflow: hidden;
        }
        .mix-row b {
          display: block;
          height: 100%;
          border-radius: 999px;
          background: #0071e3;
        }
        .empty-state {
          max-width: 720px;
          margin: 48px auto 0;
          padding: 44px;
          border-radius: 24px;
          background: #f5f5f7;
          color: #6e6e73;
          font-size: 18px;
        }
        .filter-bar {
          position: sticky;
          top: 61px;
          z-index: 15;
          background: rgba(255,255,255,0.88);
          border-top: 1px solid rgba(0,0,0,0.08);
          border-bottom: 1px solid rgba(0,0,0,0.08);
          backdrop-filter: blur(22px) saturate(180%);
        }
        .filter-inner {
          max-width: 1080px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .filter-groups {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          flex: 1;
          min-width: 0;
        }
        .filter-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .filter-group + .filter-group {
          padding-left: 10px;
          border-left: 1px solid rgba(0,0,0,0.1);
        }
        .filter-chip {
          border: 1px solid rgba(0,0,0,0.12);
          border-radius: 999px;
          background: #ffffff;
          color: #424245;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          white-space: nowrap;
          transition: background 140ms, color 140ms, border-color 140ms;
        }
        .filter-chip.model {
          color: var(--chip);
        }
        .filter-chip.model.active {
          background: var(--chip);
          border-color: var(--chip);
          color: #ffffff;
        }
        .filter-chip.type.active {
          background: #1d1d1f;
          border-color: #1d1d1f;
          color: #ffffff;
        }
        .filter-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #6e6e73;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .filter-clear {
          border: none;
          background: none;
          color: #0071e3;
          cursor: pointer;
          font: inherit;
          font-size: 13px;
          font-weight: 700;
          padding: 0;
        }
        .to-top {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 30;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.9);
          color: #1d1d1f;
          cursor: pointer;
          font-size: 20px;
          line-height: 1;
          box-shadow: 0 10px 30px rgba(0,0,0,0.16);
          backdrop-filter: blur(12px);
          opacity: 0;
          transform: translateY(12px);
          pointer-events: none;
          transition: opacity 220ms, transform 220ms;
        }
        .to-top.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        .overview-section {
          padding: 40px 24px;
          background: #ffffff;
          border-top: 1px solid rgba(0,0,0,0.08);
        }
        .overview-inner {
          max-width: 1080px;
          margin: 0 auto;
        }
        .overview-title {
          margin: 0 0 20px;
          font-size: 22px;
          font-weight: 800;
        }
        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px,1fr));
          gap: 14px;
        }
        .overview-card {
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 18px;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 16px;
          background: #f5f5f7;
          cursor: pointer;
          transition: transform 140ms, box-shadow 140ms, border-color 140ms;
        }
        .overview-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
          border-color: rgba(0,0,0,0.18);
        }
        .overview-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .overview-no {
          font-family: var(--a-mono);
          font-size: 12px;
          font-weight: 700;
          color: #86868b;
        }
        .overview-type {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          color: #0071e3;
        }
        .overview-name {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          line-height: 1.2;
        }
        .overview-tagline {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: #6e6e73;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .overview-card-foot {
          margin-top: auto;
          padding-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .overview-models {
          display: inline-flex;
          gap: 5px;
        }
        .overview-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }
        .overview-stars {
          font-size: 12px;
          font-weight: 700;
          color: #86868b;
        }
        @media (max-width: 860px) {
          .nav-inner {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .nav-actions {
            justify-content: flex-start;
            flex-wrap: wrap;
          }
          .product-hero {
            padding-top: 72px;
          }
          .hero-stats,
          .visual-stats,
          .feature-copy,
          .bento-grid {
            grid-template-columns: 1fr;
          }
          .product-visual {
            padding: 30px;
          }
          .filter-bar {
            position: static;
          }
          .overview-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .product-page.dark {
          background: #0a0a0c;
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark .product-nav {
          background: rgba(10,10,12,0.78);
          border-bottom-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .brand {
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark .search-box {
          border-color: rgba(255,255,255,0.12);
          background: #1c1c1f;
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark button,
        .product-page.dark .nav-actions a,
        .product-page.dark .action-row a {
          background: #1c1c1f;
          border-color: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark .primary-nav {
          background: #0071e3;
          border-color: #0071e3;
          color: #ffffff;
        }
        .product-page.dark .edition-select {
          background-color: #1c1c1f;
          border-color: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.92);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E");
        }
        .product-page.dark .filter-chip {
          background: #1c1c1f;
          border-color: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .filter-chip.type.active {
          background: rgba(255,255,255,0.92);
          border-color: rgba(255,255,255,0.92);
          color: #0a0a0c;
        }
        .product-page.dark .filter-clear {
          color: #0071e3;
        }
        .product-page.dark .filter-meta {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .settings-popover {
          background: #1c1c1f;
          border-color: rgba(255,255,255,0.12);
          box-shadow: 0 18px 40px rgba(0,0,0,0.5);
        }
        .product-page.dark .settings-popover label {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .settings-popover input {
          border-color: rgba(255,255,255,0.12);
          background: #0a0a0c;
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark .filter-bar {
          background: rgba(10,10,12,0.88);
          border-top-color: rgba(255,255,255,0.12);
          border-bottom-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .product-hero {
          background: #0a0a0c;
        }
        .product-page.dark .hero-copy {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .hero-cta button {
          background: #1c1c1f;
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark .hero-stats {
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.12);
        }
        .product-page.dark .stat-block {
          background: #1c1c1f;
        }
        .product-page.dark .stat-block span {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .feature-section {
          background: #1c1c1f;
          border-top-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .feature-section.alt {
          background: #111113;
        }
        .product-page.dark .eyebrow-row i {
          background: rgba(255,255,255,0.24);
        }
        .product-page.dark .section-summary {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .stack-pill {
          color: rgba(255,255,255,0.6);
          background: #0a0a0c;
        }
        .product-page.dark .feature-copy h3,
        .product-page.dark .code-panel h3 {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .feature-copy p {
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark .feature-copy li {
          border-top-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .feature-copy li:last-child {
          border-bottom-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .feature-copy li p {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .code-panel pre {
          background: #0a0a0c;
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark .bento-section {
          background: #161618;
          border-top-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .bento-card {
          background: #1c1c1f;
        }
        .product-page.dark .trend-row {
          border-top-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .trend-row span:first-child {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .mix-row i {
          background: rgba(255,255,255,0.12);
        }
        .product-page.dark .empty-state {
          background: #1c1c1f;
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .to-top {
          background: rgba(28,28,31,0.9);
          border-color: rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.92);
        }
        .product-page.dark .overview-section {
          background: #111113;
          border-top-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .overview-card {
          background: #1c1c1f;
          border-color: rgba(255,255,255,0.12);
        }
        .product-page.dark .overview-card:hover {
          border-color: rgba(255,255,255,0.22);
          box-shadow: 0 12px 28px rgba(0,0,0,0.5);
        }
        .product-page.dark .overview-tagline {
          color: rgba(255,255,255,0.6);
        }
        .product-page.dark .overview-no, .product-page.dark .overview-stars {
          color: rgba(255,255,255,0.5);
        }
      `}</style>

      <header className="product-nav">
        <div className="nav-inner">
          <div className="brand">Daily AI Digest</div>
          <input
            className="search-box"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋 repo、模型或技術棧"
          />
          <div className="nav-actions">
            {editions && editions.length > 0 && (
              <select
                className="edition-select"
                value={selectedDate || ""}
                onChange={(e) => onSelectDate(e.target.value || null)}
                title="選擇期數"
              >
                <option value="">今日最新</option>
                {editions.map((ed) => (
                  <option key={ed.digest_date} value={ed.digest_date}>
                    {ed.edition} · {ed.digest_date}
                  </option>
                ))}
              </select>
            )}
            <a href="#picks">今日精選</a>
            <button type="button" onClick={toggleTheme} aria-label={dark ? "切換淺色模式" : "切換深色模式"} title={dark ? "淺色模式" : "深色模式"}>
              {dark ? "☀︎" : "☾"}
            </button>
            <button type="button" onClick={onRefresh} disabled={status === "loading"}>重新整理</button>
            <div className="settings-wrap">
              <button type="button" onClick={() => setSettingsOpen((value) => !value)}>設定</button>
              {settingsOpen && (
                <div className="settings-popover">
                  <label>
                    GitHub token
                    <input
                      type="password"
                      value={tokenDraft}
                      placeholder="可選，貼上 token 可提高 API 額度"
                      onChange={(event) => setTokenDraft(event.target.value)}
                    />
                  </label>
                  <div className="settings-actions">
                    <button type="button" onClick={() => onTokenChange(tokenDraft)}>儲存</button>
                    <button type="button" onClick={onClearCache}>清除快取</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="product-hero">
          <div className="hero-bg" />
          <div className="hero-inner">
            <p className="hero-kicker">{data?.dateLabel || "正在載入"} · {data?.edition || "今日"}</p>
            <h1>
              今日值得追蹤的
              <br />
              <span className="hero-gradient-text">AI 開源專案。</span>
            </h1>
            <p className="hero-copy">
              從 GitHub 近期動態中挑出 Claude、Gemini、ChatGPT 相關 repo，用產品頁式閱讀體驗呈現趨勢、價值與上手路徑。
            </p>
            <div className="hero-cta">
              <a href="#picks">瀏覽今日精選</a>
              <button type="button" onClick={onRefresh} disabled={status === "loading"}>重新抓取 GitHub</button>
            </div>
            <div className="hero-stats">
              <StatBlock value={(data?.totalScanned || 0).toLocaleString()} label="掃描 repo" />
              <StatBlock value={data?.curated || 0} label="今日精選" />
              <StatBlock value={`+${totalNewStars.toLocaleString()}`} label="今日新增星數" />
              <StatBlock value={totalStars.toLocaleString()} label="精選總星數" />
            </div>
          </div>
        </section>

        {picks.length > 0 && (
          <div className="filter-bar">
            <div className="filter-inner">
              <div className="filter-groups">
                {availableModels.length > 0 && (
                  <div className="filter-group">
                    {availableModels.map((model) => {
                      const color = COLORS[model] || COLORS.Claude;
                      const active = activeModel === model;
                      return (
                        <button
                          key={model}
                          type="button"
                          aria-pressed={active}
                          className={active ? "filter-chip model active" : "filter-chip model"}
                          style={{ "--chip": color.fg }}
                          onClick={() => setActiveModel(active ? null : model)}
                        >
                          {model}
                        </button>
                      );
                    })}
                  </div>
                )}
                {availableTypes.length > 0 && (
                  <div className="filter-group">
                    {availableTypes.map((type) => {
                      const active = activeType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          aria-pressed={active}
                          className={active ? "filter-chip type active" : "filter-chip type"}
                          onClick={() => setActiveType(active ? null : type)}
                        >
                          {TYPE_LABELS[type] || type}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="filter-meta">
                <span>{filtered.length} / {picks.length} 個精選</span>
                {hasActiveFilter && (
                  <button type="button" className="filter-clear" onClick={clearFilters}>清除篩選</button>
                )}
              </div>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <section className="overview-section">
            <div className="overview-inner">
              <h2 className="overview-title">今日精選一覽</h2>
              <div className="overview-grid">
                {filtered.map((pick, i) => (
                  <button
                    type="button"
                    className="overview-card"
                    key={pick.id}
                    onClick={() => {
                      const el = document.getElementById(`pick-${i + 1}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    <div className="overview-card-top">
                      <span className="overview-no">{String(i + 1).padStart(2, "0")}</span>
                      <span className="overview-type">{TYPE_LABELS[pick.type] || pick.type}</span>
                    </div>
                    <h3 className="overview-name">{pick.name}</h3>
                    <p className="overview-tagline">{pick.tagline || pick.summary}</p>
                    <div className="overview-card-foot">
                      <span className="overview-models">
                        {(pick.models || []).map((m) => (
                          <span key={m} className="overview-dot" style={{ background: (COLORS[m] || COLORS.Claude).fg }} title={m} />
                        ))}
                      </span>
                      <span className="overview-stars">{(pick.stars || 0).toLocaleString()} ★</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {!data && <div className="empty-state">正在載入 GitHub 精選...</div>}
        {data && filtered.length === 0 && (
          <div className="empty-state">
            目前篩選條件下沒有符合的 repo。
            {hasActiveFilter && <> <button type="button" className="filter-clear" onClick={clearFilters}>清除篩選</button></>}
          </div>
        )}

        {filtered.length > 0 && (
          <div id="picks">
            {filtered.map((pick, index) => (
              <FeatureSection key={pick.id} pick={pick} index={index} total={filtered.length} />
            ))}
          </div>
        )}

        {data && (
          <section className="bento-section">
            <div className="bento-inner">
              <h2>把趨勢訊號整理成可行動的清單。</h2>
              <div className="bento-grid">
                <div className="bento-card">
                  <h3>今日趨勢</h3>
                  {(data.trending || []).slice(0, 7).map((item, index) => (
                    <div className="trend-row" key={`${item.name}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <span>{item.name}</span>
                      <strong>{item.delta}</strong>
                    </div>
                  ))}
                </div>
                <div className="bento-card">
                  <h3>模型分佈</h3>
                  {Object.entries(data.modelCounts || {}).map(([model, count]) => {
                    const total = Math.max(1, Object.values(data.modelCounts || {}).reduce((sum, value) => sum + value, 0));
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div className="mix-row" key={model}>
                        <div>
                          <span>{model}</span>
                          <strong>{count}</strong>
                        </div>
                        <i><b style={{ width: `${pct}%`, background: (COLORS[model] || COLORS.Claude).fg }} /></i>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <button
        type="button"
        className={showTop ? "to-top visible" : "to-top"}
        aria-label="回到頂部"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </div>
  );
}

window.DigestApp = DigestApp;
window.V1App = (props) => React.createElement(DigestApp, props);
