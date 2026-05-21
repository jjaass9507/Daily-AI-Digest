// Daily AI Digest — Production homepage
// App Store Today aesthetic: editorial hero, curated grid, filter/search/bookmarks

const {
  useState:   DA_useState,
  useEffect:  DA_useEffect,
  useMemo:    DA_useMemo,
  useCallback:DA_useCallback,
  useRef:     DA_useRef,
} = React;

const DA_COLORS = window.MODEL_COLORS;
const DA_DATA   = window.DIGEST_DATA;

const DA_HERO_BG = {
  Claude:  "radial-gradient(120% 100% at 20% 20%, #ff8a5c 0%, #ff5b30 35%, #c93f00 70%, #6a1f00 100%)",
  Gemini:  "radial-gradient(120% 100% at 20% 20%, #6dabff 0%, #2a6fdb 40%, #1d3fa6 75%, #0a1d52 100%)",
  ChatGPT: "radial-gradient(120% 100% at 20% 20%, #4fd3a3 0%, #137a5a 40%, #0a523c 75%, #022918 100%)",
  Multi:   "linear-gradient(120deg, #ff6b35 0%, #ff2d92 28%, #8b5cf6 56%, #2a9df4 84%, #00d9ff 100%)",
};

function DA_heroBg(pick) {
  return pick.models.length > 1 ? DA_HERO_BG.Multi : (DA_HERO_BG[pick.models[0]] || DA_HERO_BG.Claude);
}

// ── Bookmark hook ─────────────────────────────────────────────────────────────

function useBookmarks() {
  const [bookmarks, setBookmarks] = DA_useState(() => {
    try { return JSON.parse(localStorage.getItem("digest-bookmarks-v1") || "[]"); } catch { return []; }
  });
  const toggle = DA_useCallback((id) => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      localStorage.setItem("digest-bookmarks-v1", JSON.stringify(next));
      return next;
    });
  }, []);
  return [bookmarks, toggle];
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function DA_ModelChip({ model, dark = false, small = false }) {
  const c = DA_COLORS[model] || DA_COLORS.Claude;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: small ? 4 : 5,
      padding: small ? "2px 7px" : "3px 10px", borderRadius: 999,
      background: dark ? "rgba(255,255,255,0.18)" : c.bg,
      color: dark ? "#fff" : c.fg,
      fontSize: small ? 10.5 : 11.5, fontWeight: 600, letterSpacing: 0.1,
      backdropFilter: dark ? "blur(20px)" : "none",
      WebkitBackdropFilter: dark ? "blur(20px)" : "none",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: 999, background: dark ? "#fff" : c.fg, flex: "none" }} />
      {model}
    </span>
  );
}

function DA_BookmarkBtn({ id, bookmarks, onToggle, dark = false }) {
  const saved = bookmarks.includes(id);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(id); }}
      title={saved ? "移除收藏" : "加入收藏"}
      style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: 18, padding: "4px 6px", lineHeight: 1,
        color: saved ? "#ff3b30" : (dark ? "rgba(255,255,255,0.65)" : "var(--a-muted)"),
        transition: "transform 150ms, color 150ms",
        fontFamily: "inherit",
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.25)"}
      onMouseLeave={e => e.currentTarget.style.transform = ""}
    >{saved ? "♥" : "♡"}</button>
  );
}

// ── Hero card ─────────────────────────────────────────────────────────────────

function DA_HeroCard({ pick, onOpen, bookmarks, onToggleBookmark }) {
  return (
    <article
      onClick={() => onOpen(pick)}
      className="da-card-hover"
      style={{
        cursor: "pointer", borderRadius: 22, overflow: "hidden",
        background: "var(--a-surface)", boxShadow: "var(--a-shadow-lg)",
        border: "0.5px solid var(--a-line)",
      }}
    >
      <div style={{
        position: "relative", aspectRatio: "21 / 9",
        background: DA_heroBg(pick), padding: "32px 36px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        color: "white", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", right: -120, top: -80, width: 380, height: 380,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 60%)",
          filter: "blur(20px)", pointerEvents: "none",
        }} />
        <header style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "rgba(255,255,255,0.9)" }}>
            Today's Story · 今日首選
          </span>
          <span style={{ width: 24, height: 1, background: "rgba(255,255,255,0.5)" }} />
          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{pick.type}</span>
        </header>
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{
            fontFamily: "var(--a-display)",
            fontSize: "clamp(22px, 3vw, 38px)", lineHeight: 1.05, letterSpacing: -0.8,
            margin: "0 0 10px", fontWeight: 700, color: "white",
            textShadow: "0 1px 24px rgba(0,0,0,0.25)", maxWidth: "78%",
          }}>{pick.tagline}</h2>
          <p style={{
            fontSize: 14.5, lineHeight: 1.55, margin: 0,
            color: "rgba(255,255,255,0.92)", maxWidth: "62%", fontWeight: 450,
          }}>{pick.summary.slice(0, 110)}…</p>
        </div>
      </div>
      <div style={{
        padding: "18px 36px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, borderTop: "0.5px solid var(--a-line)", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: DA_heroBg(pick),
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontFamily: "var(--a-display)", fontSize: 18, fontWeight: 700,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)", flex: "none",
          }}>{pick.name[0].toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--a-mono)", fontSize: 12.5, color: "var(--a-fg-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pick.author}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--a-fg)", letterSpacing: -0.1, marginTop: 1 }}>{pick.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <DA_BookmarkBtn id={pick.id} bookmarks={bookmarks} onToggle={onToggleBookmark} />
          <div style={{ display: "flex", gap: 6 }}>
            {pick.models.map(m => <DA_ModelChip key={m} model={m} />)}
          </div>
          <button onClick={e => { e.stopPropagation(); onOpen(pick); }} style={{
            padding: "8px 18px", borderRadius: 999,
            background: "var(--a-accent)", color: "white",
            border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, fontFamily: "var(--a-sans)",
          }}>查看</button>
        </div>
      </div>
    </article>
  );
}

// ── Pick card (grid) ──────────────────────────────────────────────────────────

function DA_PickCard({ pick, onOpen, bookmarks, onToggleBookmark }) {
  return (
    <article
      onClick={() => onOpen(pick)}
      className="da-card-hover"
      style={{
        cursor: "pointer", background: "var(--a-surface)",
        border: "0.5px solid var(--a-line)", borderRadius: 18, overflow: "hidden",
        display: "flex", flexDirection: "column", boxShadow: "var(--a-shadow)",
      }}
    >
      <div style={{
        position: "relative", aspectRatio: "16 / 9",
        background: DA_heroBg(pick), padding: "16px 20px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        color: "white", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", right: -50, top: -40, width: 180, height: 180,
          borderRadius: 999,
          background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 60%)",
          filter: "blur(16px)", pointerEvents: "none",
        }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>{pick.type}</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {pick.models.map(m => <DA_ModelChip key={m} model={m} dark small />)}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: "var(--a-mono)", marginBottom: 2 }}>{pick.author}</div>
          <h3 style={{ fontFamily: "var(--a-display)", fontSize: 18, lineHeight: 1.15, letterSpacing: -0.3, margin: 0, fontWeight: 700 }}>{pick.tagline}</h3>
        </div>
      </div>
      <div style={{ padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--a-fg-2)" }}>{pick.summary.slice(0, 84)}…</p>
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--a-muted)", fontFamily: "var(--a-mono)" }}>
            ★ {pick.stars.toLocaleString()}
            {pick.starsToday > 0 && <span style={{ color: "var(--a-accent)", fontWeight: 600 }}>+{pick.starsToday}</span>}
          </span>
          <DA_BookmarkBtn id={pick.id} bookmarks={bookmarks} onToggle={onToggleBookmark} />
        </div>
      </div>
    </article>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────

function DA_ListRow({ pick, onOpen, bookmarks, onToggleBookmark, divider }) {
  return (
    <div
      onClick={() => onOpen(pick)}
      style={{
        cursor: "pointer", padding: "14px 0",
        borderTop: divider ? "0.5px solid var(--a-line)" : "none",
        display: "grid", gridTemplateColumns: "52px 1fr auto",
        gap: 14, alignItems: "center",
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 12, flex: "none",
        background: DA_heroBg(pick), color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--a-display)", fontSize: 22, fontWeight: 700,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      }}>{pick.name[0].toUpperCase()}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--a-muted)" }}>{pick.type}</span>
          {(pick.models || []).slice(0, 2).map(m => {
            const c = DA_COLORS[m] || DA_COLORS.Claude;
            return <span key={m} style={{ fontSize: 11, color: c.fg, fontWeight: 600 }}>{m}</span>;
          })}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--a-fg)", letterSpacing: -0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {pick.tagline}
        </div>
        <div style={{ fontSize: 12, color: "var(--a-muted)", fontFamily: "var(--a-mono)", marginTop: 2 }}>
          {pick.name} · ★ {(pick.stars || 0).toLocaleString()}
          {pick.starsToday > 0 && <span style={{ color: "var(--a-accent)", fontWeight: 600 }}> +{pick.starsToday}</span>}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <DA_BookmarkBtn id={pick.id} bookmarks={bookmarks} onToggle={onToggleBookmark} />
        <button onClick={e => { e.stopPropagation(); onOpen(pick); }} style={{
          padding: "6px 14px", borderRadius: 999,
          background: "var(--a-pill-bg)", color: "var(--a-accent)",
          border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "var(--a-sans)",
        }}>查看</button>
      </div>
    </div>
  );
}

// ── Detail sheet ──────────────────────────────────────────────────────────────

function DA_DetailSheet({ pick, onClose, bookmarks, onToggleBookmark }) {
  DA_useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.42)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        animation: "da-fade 180ms ease-out",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "min(860px, 96%)", maxHeight: "92vh",
          background: "var(--a-surface)",
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          boxShadow: "0 -12px 40px rgba(0,0,0,0.28)",
          overflow: "auto",
          animation: "da-rise 300ms cubic-bezier(.2,.7,.2,1)",
        }}
      >
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          padding: "10px 0 8px",
          background: "color-mix(in oklab, var(--a-surface) 85%, transparent)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          display: "flex", justifyContent: "center",
          borderBottom: "0.5px solid var(--a-line)",
        }}>
          <button onClick={onClose} style={{ width: 36, height: 5, borderRadius: 999, background: "var(--a-line-strong)", border: "none", cursor: "pointer" }} />
        </div>

        <div style={{
          position: "relative", padding: "40px 44px 52px",
          background: DA_heroBg(pick), color: "white", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", right: -120, top: -80, width: 480, height: 480,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(255,255,255,0.28), transparent 60%)",
            filter: "blur(40px)", pointerEvents: "none",
          }} />
          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {pick.models.map(m => <DA_ModelChip key={m} model={m} dark />)}
              <span style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(255,255,255,0.18)", color: "white", fontSize: 11.5, fontWeight: 600 }}>{pick.type}</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onToggleBookmark(pick.id); }}
              style={{
                background: "rgba(255,255,255,0.18)", border: "none", cursor: "pointer",
                width: 36, height: 36, borderRadius: 999, fontSize: 18,
                color: bookmarks.includes(pick.id) ? "#ff3b30" : "rgba(255,255,255,0.8)",
                display: "flex", alignItems: "center", justifyContent: "center", flex: "none",
              }}
            >{bookmarks.includes(pick.id) ? "♥" : "♡"}</button>
          </div>
          <div style={{ fontFamily: "var(--a-mono)", fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 20, marginBottom: 8, position: "relative" }}>
            {pick.author} / {pick.name}
          </div>
          <h1 style={{
            fontFamily: "var(--a-display)",
            fontSize: "clamp(26px, 4vw, 42px)", lineHeight: 1.05, letterSpacing: -1,
            margin: 0, fontWeight: 700, position: "relative",
          }}>{pick.tagline}</h1>
        </div>

        <div style={{ padding: "36px 44px 72px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 32 }}>
            <DA_StatCard label="GitHub Stars" value={(pick.stars || 0).toLocaleString()} sub={"今日 +" + (pick.starsToday || 0)} />
            <DA_StatCard label="難度" value={pick.difficulty || "—"} sub={"Level " + (pick.difficultyLevel || 1) + "/3"} />
            <DA_StatCard label="預估上手" value={pick.eta || "—"} sub="hands-on time" />
          </div>

          {pick.stack && pick.stack.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <DA_SheetLabel>技術棧</DA_SheetLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {pick.stack.map(s => (
                  <span key={s} style={{
                    padding: "4px 12px", borderRadius: 999,
                    background: "var(--a-bg-soft)", color: "var(--a-fg-2)",
                    fontSize: 12.5, fontWeight: 500, fontFamily: "var(--a-mono)",
                    border: "0.5px solid var(--a-line)",
                  }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <DA_SheetLabel>介紹</DA_SheetLabel>
          <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--a-fg)", margin: "0 0 28px", letterSpacing: -0.1 }}>{pick.summary}</p>

          {pick.whyValuable && (
            <>
              <DA_SheetLabel>為什麼值得看</DA_SheetLabel>
              <div style={{ padding: "16px 20px", margin: "0 0 28px", background: "var(--a-bg-soft)", borderRadius: 14, fontSize: 15, lineHeight: 1.65, color: "var(--a-fg-2)", letterSpacing: -0.05 }}>
                {pick.whyValuable}
              </div>
            </>
          )}

          {pick.steps && pick.steps.length > 0 && (
            <>
              <DA_SheetLabel>理解步驟</DA_SheetLabel>
              <ol style={{ listStyle: "none", margin: "0 0 28px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {pick.steps.map((s, i) => (
                  <li key={i} style={{ display: "flex", gap: 14, padding: "13px 16px", background: "var(--a-bg-soft)", borderRadius: 14, fontSize: 14.5, lineHeight: 1.6, color: "var(--a-fg)" }}>
                    <span style={{ flex: "none", width: 26, height: 26, borderRadius: 999, background: "var(--a-fg)", color: "var(--a-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>{s}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {pick.codePreview && (
            <>
              <DA_SheetLabel>一眼看程式</DA_SheetLabel>
              <pre style={{ margin: "0 0 32px", padding: "20px 22px", background: "var(--a-code-bg)", color: "var(--a-code-fg)", borderRadius: 14, fontFamily: "var(--a-mono)", fontSize: 13, lineHeight: 1.75, overflow: "auto", border: "0.5px solid var(--a-line)" }}>
                {pick.codePreview}
              </pre>
            </>
          )}

          {pick.githubUrl && (
            <a
              href={pick.githubUrl} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 999,
                background: "var(--a-fg)", color: "var(--a-surface)",
                textDecoration: "none", fontSize: 14, fontWeight: 600,
                letterSpacing: -0.1, fontFamily: "var(--a-sans)",
              }}
            >
              在 GitHub 上查看 <span style={{ opacity: 0.55, fontSize: 12 }}>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function DA_StatCard({ label, value, sub }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 14, background: "var(--a-bg-soft)" }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--a-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--a-display)", fontSize: 22, fontWeight: 700, color: "var(--a-fg)", letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--a-muted)", marginTop: 4, fontFamily: "var(--a-mono)" }}>{sub}</div>
    </div>
  );
}

function DA_SheetLabel({ children }) {
  return (
    <h3 style={{ fontFamily: "var(--a-display)", fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--a-muted)", margin: "0 0 10px" }}>
      {children}
    </h3>
  );
}

// ── Settings popover ──────────────────────────────────────────────────────────

function DA_SettingsPopover({ open, onClose, token, onTokenChange, onRefresh, onClearCache, status }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "absolute", right: 16, top: 60,
          width: 288, borderRadius: 18,
          background: "var(--a-surface)",
          border: "0.5px solid var(--a-line)",
          boxShadow: "var(--a-shadow-xl)",
          padding: "20px",
          animation: "da-fade 150ms ease-out",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--a-fg)", marginBottom: 12 }}>GitHub 資料來源</div>
        <div style={{ fontSize: 11.5, color: "var(--a-muted)", lineHeight: 1.5, marginBottom: 8 }}>
          GitHub Token（選填）<br />
          <span style={{ fontSize: 11 }}>無 token：每小時 10 次搜尋；有 token：30 次</span>
        </div>
        <input
          type="password"
          placeholder="ghp_xxxxxxxxxxxx"
          value={token}
          onChange={e => onTokenChange && onTokenChange(e.target.value)}
          style={{
            width: "100%", padding: "8px 10px", borderRadius: 8,
            border: "1px solid var(--a-line-strong)",
            background: "var(--a-bg-soft)", color: "var(--a-fg)",
            fontFamily: "var(--a-mono)", fontSize: 11.5, outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={() => { onRefresh && onRefresh(); onClose(); }}
            disabled={status === "loading"}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              background: "var(--a-accent)", color: "white",
              border: "none", cursor: status === "loading" ? "default" : "pointer",
              fontSize: 12.5, fontWeight: 600, opacity: status === "loading" ? 0.6 : 1,
            }}
          >{status === "loading" ? "抓取中…" : "立即重新抓取"}</button>
          <button
            onClick={() => { onClearCache && onClearCache(); onRefresh && onRefresh(); onClose(); }}
            style={{
              padding: "8px 12px", borderRadius: 8,
              background: "var(--a-bg-soft)", color: "var(--a-fg-2)",
              border: "0.5px solid var(--a-line)", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
            }}
          >清除快取</button>
        </div>
        <div style={{
          marginTop: 10, fontSize: 11, paddingTop: 8, borderTop: "0.5px solid var(--a-line)",
          color: status === "ok" ? "#34c759" : status === "rate_limit" ? "#ff9f0a" : "var(--a-muted)",
        }}>
          {status === "ok"         && "● 資料已載入"}
          {status === "loading"    && "○ 抓取中…"}
          {status === "rate_limit" && "● 速率限制，請設定 Token 或稍後再試"}
          {status === "error"      && "● 載入失敗，請重試"}
        </div>
      </div>
    </div>
  );
}

// ── Nav button ────────────────────────────────────────────────────────────────

function DA_NavBtn({ children, title, onClick, disabled }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      style={{
        padding: "6px 8px", borderRadius: 8, background: "transparent",
        color: "var(--a-fg-2)", border: "none", cursor: disabled ? "default" : "pointer",
        fontSize: 16, fontFamily: "var(--a-sans)",
        opacity: disabled ? 0.45 : 1, transition: "background 150ms",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "var(--a-bg-soft)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >{children}</button>
  );
}

function DA_MiniStat({ n, label, accent, prefix }) {
  prefix = prefix || "";
  return (
    <div style={{ padding: "14px 18px", borderRadius: 14, background: "var(--a-surface)", border: "0.5px solid var(--a-line)", minWidth: 88, textAlign: "right" }}>
      <div style={{ fontFamily: "var(--a-display)", fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: accent ? "var(--a-accent)" : "var(--a-fg)" }}>
        {prefix}{(n || 0).toLocaleString()}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--a-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function DA_SectionHeader({ title, subtitle }) {
  return (
    <div>
      <h2 style={{ fontFamily: "var(--a-display)", fontSize: 28, lineHeight: 1.1, letterSpacing: -0.6, margin: 0, fontWeight: 700 }}>{title}</h2>
      {subtitle && <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--a-muted)", letterSpacing: -0.1 }}>{subtitle}</p>}
    </div>
  );
}

// ── Main DigestApp ────────────────────────────────────────────────────────────

function DigestApp({ data, status, onRefresh, token, onTokenChange, onClearCache }) {
  data   = data   || DA_DATA;
  status = status || "ok";
  token  = token  || "";

  const [theme, setTheme] = DA_useState(() => localStorage.getItem("digest-theme-v1") || "light");
  const [filterType,    setFilterType]    = DA_useState(null);
  const [filterModel,   setFilterModel]   = DA_useState(null);
  const [showBookmarks, setShowBookmarks] = DA_useState(false);
  const [searchOpen,    setSearchOpen]    = DA_useState(false);
  const [searchQ,       setSearchQ]       = DA_useState("");
  const [open,          setOpen]          = DA_useState(null);
  const [settingsOpen,  setSettingsOpen]  = DA_useState(false);
  const [subEmail,      setSubEmail]      = DA_useState("");
  const [subOk,         setSubOk]         = DA_useState(false);
  const searchRef = DA_useRef(null);
  const [bookmarks, toggleBookmark] = useBookmarks();

  DA_useEffect(() => { localStorage.setItem("digest-theme-v1", theme); }, [theme]);

  DA_useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current && searchRef.current.focus(), 50);
  }, [searchOpen]);

  DA_useEffect(() => {
    const fn = e => { if (e.key === "Escape" && searchOpen) { setSearchOpen(false); setSearchQ(""); } };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [searchOpen]);

  const filteredPicks = DA_useMemo(() => {
    let r = data.picks || [];
    if (showBookmarks) return r.filter(p => bookmarks.includes(p.id));
    if (filterType)  r = r.filter(p => p.type === filterType);
    if (filterModel) r = r.filter(p => (p.models || []).includes(filterModel));
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      r = r.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        (p.stack || []).some(s => s.toLowerCase().includes(q)) ||
        (p.models || []).some(m => m.toLowerCase().includes(q)) ||
        p.type.toLowerCase().includes(q)
      );
    }
    return r;
  }, [data, filterType, filterModel, searchQ, showBookmarks, bookmarks]);

  const isFiltered = !!(filterType || filterModel || showBookmarks || searchQ.trim());
  const [hero, ...rest] = filteredPicks;
  const gridPicks = rest.slice(0, 3);
  const listPicks = rest.slice(3);

  const clearFilters = () => { setFilterType(null); setFilterModel(null); setShowBookmarks(false); setSearchQ(""); setSearchOpen(false); };

  const Chip = (label, active, onClick, color) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: "5px 12px", borderRadius: 999,
        background: active ? (color || "var(--a-fg)") : "transparent",
        color: active ? (color ? "white" : "var(--a-bg)") : "var(--a-fg-2)",
        border: "none", cursor: "pointer", fontSize: 13,
        fontWeight: active ? 600 : 500, fontFamily: "var(--a-sans)",
        whiteSpace: "nowrap", transition: "background 150ms, color 150ms",
      }}
    >{label}</button>
  );

  const Divider = () => (
    <span style={{ width: 1, height: 16, background: "var(--a-line-strong)", margin: "0 4px", flex: "none", alignSelf: "center" }} />
  );

  return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--a-bg)", color: "var(--a-fg)", fontFamily: "var(--a-sans)", letterSpacing: -0.01 }}>
      <style>{`
        @keyframes da-fade { from { opacity:0 } to { opacity:1 } }
        @keyframes da-rise { from { transform:translateY(56px);opacity:0 } to { transform:translateY(0);opacity:1 } }
        .da-card-hover { transition:transform 220ms cubic-bezier(.2,.7,.2,1),box-shadow 220ms; }
        .da-card-hover:hover { transform:translateY(-2px); box-shadow:var(--a-shadow-lg) !important; }
        .da-nav-chips { display:flex; gap:2px; align-items:center; overflow-x:auto; scrollbar-width:none; }
        .da-nav-chips::-webkit-scrollbar { display:none; }
        .da-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .da-grid-main { display:grid; grid-template-columns:1fr 296px; gap:32px; }
        [data-theme="light"] {
          --a-bg:#fbfbfd; --a-bg-soft:#f5f5f7; --a-surface:#ffffff;
          --a-fg:#1d1d1f; --a-fg-2:#424245; --a-muted:#86868b;
          --a-line:rgba(0,0,0,0.08); --a-line-strong:rgba(0,0,0,0.20);
          --a-accent:#0071e3; --a-pill-bg:rgba(0,113,227,0.08);
          --a-code-bg:#f5f5f7; --a-code-fg:#1d1d1f;
          --a-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.04);
          --a-shadow-lg:0 2px 6px rgba(0,0,0,0.06),0 16px 40px rgba(0,0,0,0.08);
          --a-shadow-xl:0 4px 8px rgba(0,0,0,0.06),0 24px 60px rgba(0,0,0,0.12);
        }
        [data-theme="dark"] {
          --a-bg:#000; --a-bg-soft:#1d1d1f; --a-surface:#1d1d1f;
          --a-fg:#f5f5f7; --a-fg-2:#d2d2d7; --a-muted:#6e6e73;
          --a-line:rgba(255,255,255,0.10); --a-line-strong:rgba(255,255,255,0.25);
          --a-accent:#2997ff; --a-pill-bg:rgba(41,151,255,0.16);
          --a-code-bg:#0a0a0a; --a-code-fg:#f5f5f7;
          --a-shadow:0 1px 3px rgba(0,0,0,0.4),0 4px 16px rgba(0,0,0,0.3);
          --a-shadow-lg:0 2px 6px rgba(0,0,0,0.5),0 16px 40px rgba(0,0,0,0.5);
          --a-shadow-xl:0 4px 8px rgba(0,0,0,0.5),0 24px 60px rgba(0,0,0,0.6);
        }
        @media (max-width:1060px) { .da-grid-main { grid-template-columns:1fr !important; } }
        @media (max-width:768px)  { .da-grid-3 { grid-template-columns:repeat(2,1fr) !important; } }
        @media (max-width:520px)  { .da-grid-3 { grid-template-columns:1fr !important; } }
      `}</style>

      {/* ── Sticky nav ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        background: "color-mix(in oklab, var(--a-bg) 72%, transparent)",
        borderBottom: "0.5px solid var(--a-line)",
      }}>
        {searchOpen ? (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 24px", display: "flex", gap: 12, alignItems: "center" }}>
            <input
              ref={searchRef}
              type="text"
              placeholder="搜尋 repo、作者、技術棧…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              style={{
                flex: 1, padding: "9px 14px", borderRadius: 10,
                border: "1px solid var(--a-accent)", outline: "none",
                background: "var(--a-bg-soft)", color: "var(--a-fg)",
                fontSize: 14, fontFamily: "var(--a-sans)",
              }}
            />
            <button onClick={() => { setSearchOpen(false); setSearchQ(""); }} style={{
              padding: "7px 14px", borderRadius: 8,
              background: "var(--a-bg-soft)", color: "var(--a-fg-2)",
              border: "0.5px solid var(--a-line)", cursor: "pointer",
              fontSize: 13, fontWeight: 500, fontFamily: "var(--a-sans)",
            }}>取消</button>
          </div>
        ) : (
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 24px", display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{ fontFamily: "var(--a-display)", fontSize: 17, fontWeight: 600, letterSpacing: -0.3, flex: "none", cursor: "pointer" }}
              onClick={clearFilters}
            >
              <span style={{ color: "var(--a-accent)" }}>◐</span> Digest
            </span>
            <nav className="da-nav-chips" style={{ flex: 1 }}>
              {Chip("全部", !filterType && !filterModel && !showBookmarks, clearFilters)}
              <Divider />
              {["Agent","RAG","Tool","Demo"].map(t =>
                Chip(t, filterType === t, () => { setFilterType(filterType === t ? null : t); setFilterModel(null); setShowBookmarks(false); setSearchQ(""); })
              )}
              <Divider />
              {["Claude","Gemini","ChatGPT"].map(m =>
                Chip(m, filterModel === m, () => { setFilterModel(filterModel === m ? null : m); setFilterType(null); setShowBookmarks(false); setSearchQ(""); }, (DA_COLORS[m] || DA_COLORS.Claude).fg)
              )}
              <Divider />
              {Chip(
                bookmarks.length > 0 ? ("♡ 收藏 " + bookmarks.length) : "♡ 收藏",
                showBookmarks,
                () => { setShowBookmarks(!showBookmarks); setFilterType(null); setFilterModel(null); setSearchQ(""); }
              )}
            </nav>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flex: "none" }}>
              <DA_NavBtn title="搜尋" onClick={() => setSearchOpen(true)}>⌕</DA_NavBtn>
              <DA_NavBtn title={theme === "light" ? "暗色模式" : "亮色模式"} onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
                {theme === "light" ? "☽" : "○"}
              </DA_NavBtn>
              <DA_NavBtn title="重新整理" onClick={() => onRefresh && onRefresh()} disabled={status === "loading"}>↻</DA_NavBtn>
              <DA_NavBtn title="設定" onClick={() => setSettingsOpen(s => !s)}>⚙</DA_NavBtn>
            </div>
          </div>
        )}
      </header>

      <DA_SettingsPopover
        open={settingsOpen} onClose={() => setSettingsOpen(false)}
        token={token} onTokenChange={onTokenChange}
        onRefresh={onRefresh} onClearCache={onClearCache}
        status={status}
      />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 120px" }}>

        {/* Masthead — only when unfiltered */}
        {!isFiltered && (
          <section style={{ padding: "44px 0 28px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--a-accent)", letterSpacing: 0.2, marginBottom: 8 }}>
                  {data.dateLabel} · {data.edition}
                </div>
                <h1 style={{
                  fontFamily: "var(--a-display)",
                  fontSize: "clamp(44px, 6vw, 68px)", lineHeight: 0.98, letterSpacing: -2,
                  margin: 0, fontWeight: 700, color: "var(--a-fg)",
                }}>今日精選</h1>
                <p style={{ fontSize: 17, lineHeight: 1.5, color: "var(--a-fg-2)", margin: "12px 0 0", letterSpacing: -0.2, maxWidth: 580 }}>
                  掃了 {(data.totalScanned || 0).toLocaleString()} 個 GitHub repo，挑出 <strong>{data.curated}</strong> 個值得花時間理解的 AI 應用。
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <DA_MiniStat n={data.totalScanned} label="掃描" />
                <DA_MiniStat n={data.curated} label="精選" accent={true} />
                <DA_MiniStat n={(data.picks || []).reduce((s, p) => s + (p.starsToday || 0), 0)} label="今日新星" prefix="+" />
              </div>
            </div>
          </section>
        )}

        {/* Filter header */}
        {isFiltered && (
          <div style={{ padding: "28px 0 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontFamily: "var(--a-display)", fontSize: 28, fontWeight: 700, letterSpacing: -0.6, margin: 0 }}>
              {showBookmarks
                ? ("收藏（" + filteredPicks.length + "）")
                : searchQ.trim()
                  ? ("「" + searchQ + "」的搜尋結果")
                  : (filterType || filterModel)}
            </h2>
            <button onClick={clearFilters} style={{
              padding: "6px 14px", borderRadius: 999,
              background: "var(--a-bg-soft)", color: "var(--a-muted)",
              border: "0.5px solid var(--a-line)", cursor: "pointer",
              fontSize: 12.5, fontWeight: 500, fontFamily: "var(--a-sans)",
            }}>清除篩選</button>
          </div>
        )}

        {/* Empty state */}
        {filteredPicks.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>{showBookmarks ? "🔖" : "🔍"}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "var(--a-fg)", marginBottom: 8 }}>
              {showBookmarks ? "尚無收藏" : "沒有找到匹配結果"}
            </div>
            <div style={{ fontSize: 15, color: "var(--a-muted)", marginBottom: 24, lineHeight: 1.5 }}>
              {showBookmarks ? "點卡片上的 ♡ 來收藏你感興趣的專案" : "試試其他關鍵字或篩選條件"}
            </div>
            <button onClick={clearFilters} style={{
              padding: "10px 22px", borderRadius: 999, background: "var(--a-accent)", color: "white",
              border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "var(--a-sans)",
            }}>查看全部</button>
          </div>
        ) : (
          <>
            {hero && (
              <section style={{ marginBottom: 20 }}>
                <DA_HeroCard pick={hero} onOpen={setOpen} bookmarks={bookmarks} onToggleBookmark={toggleBookmark} />
              </section>
            )}

            <div className="da-grid-main">
              <div>
                {gridPicks.length > 0 && (
                  <section style={{ marginBottom: 48 }}>
                    <DA_SectionHeader title="本日推薦" subtitle={"精選 " + filteredPicks.length + " 個值得 fork 的 AI 應用"} />
                    <div className="da-grid-3" style={{ marginTop: 20 }}>
                      {gridPicks.map(p => (
                        <DA_PickCard key={p.id} pick={p} onOpen={setOpen} bookmarks={bookmarks} onToggleBookmark={toggleBookmark} />
                      ))}
                    </div>
                  </section>
                )}

                {listPicks.length > 0 && (
                  <section style={{ marginBottom: 48 }}>
                    <DA_SectionHeader title={isFiltered ? "其他結果" : "更多精選"} subtitle={"共 " + (isFiltered ? filteredPicks.length : (data.picks || []).length) + " 個"} />
                    <div style={{ marginTop: 20, background: "var(--a-surface)", border: "0.5px solid var(--a-line)", borderRadius: 18, padding: "4px 24px", boxShadow: "var(--a-shadow)" }}>
                      {listPicks.map((p, i) => (
                        <DA_ListRow key={p.id} pick={p} onOpen={setOpen} bookmarks={bookmarks} onToggleBookmark={toggleBookmark} divider={i > 0} />
                      ))}
                    </div>
                  </section>
                )}

                {/* New releases — unfiltered only */}
                {!isFiltered && (data.newlyReleased || []).length > 0 && (
                  <section style={{ marginBottom: 48 }}>
                    <DA_SectionHeader title="新發布的 repo" subtitle="近兩週剛從零起步的新專案" />
                    <div style={{ marginTop: 20, background: "var(--a-surface)", border: "0.5px solid var(--a-line)", borderRadius: 18, padding: "4px 24px", boxShadow: "var(--a-shadow)" }}>
                      {data.newlyReleased.map((r, i) => (
                        <DA_ListRow
                          key={r.name}
                          pick={{
                            ...r, id: r.name,
                            summary: r.tagline, difficulty: "—", difficultyLevel: 1,
                            eta: "—", steps: [], codePreview: "", stack: [], whyValuable: "",
                            githubUrl: "https://github.com/" + r.author + "/" + r.name,
                          }}
                          onOpen={setOpen}
                          bookmarks={bookmarks}
                          onToggleBookmark={toggleBookmark}
                          divider={i > 0}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Sidebar — unfiltered only */}
              {!isFiltered && (
                <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  <div style={{ background: "var(--a-surface)", border: "0.5px solid var(--a-line)", borderRadius: 18, padding: "20px 22px", boxShadow: "var(--a-shadow)" }}>
                    <div style={{ fontFamily: "var(--a-display)", fontSize: 17, fontWeight: 700, letterSpacing: -0.3, marginBottom: 14 }}>今日趨勢</div>
                    {(data.trending || []).map((t, i) => (
                      <div key={t.name} style={{ padding: "9px 0", borderTop: i === 0 ? "none" : "0.5px solid var(--a-line)", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontFamily: "var(--a-display)", fontWeight: 700, fontSize: 15, color: "var(--a-muted)", width: 18, textAlign: "right", flex: "none" }}>{i + 1}</span>
                        <span style={{ fontFamily: "var(--a-mono)", fontSize: 12.5, color: "var(--a-fg)", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                        <span style={{ fontFamily: "var(--a-mono)", fontSize: 12.5, color: "var(--a-accent)", fontWeight: 600, flex: "none" }}>{t.delta}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "var(--a-surface)", border: "0.5px solid var(--a-line)", borderRadius: 18, padding: "20px 22px", boxShadow: "var(--a-shadow)" }}>
                    <div style={{ fontFamily: "var(--a-display)", fontSize: 17, fontWeight: 700, letterSpacing: -0.3, marginBottom: 14 }}>模型分佈</div>
                    {Object.entries(data.modelCounts || {}).map(([model, count]) => {
                      const total = Object.values(data.modelCounts || {}).reduce((a, b) => a + b, 0);
                      const pct   = total ? Math.round((count / total) * 100) : 0;
                      const c     = DA_COLORS[model] || DA_COLORS.Claude;
                      return (
                        <div key={model} style={{ marginBottom: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12.5, color: "var(--a-fg-2)", fontWeight: 500 }}>
                            <span>{model}</span>
                            <span style={{ fontFamily: "var(--a-mono)", color: "var(--a-muted)" }}>{count}</span>
                          </div>
                          <div style={{ height: 5, borderRadius: 999, background: "var(--a-bg-soft)" }}>
                            <div style={{ height: "100%", borderRadius: 999, width: pct + "%", background: c.fg, transition: "width 600ms cubic-bezier(.2,.7,.2,1)" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ background: "var(--a-surface)", border: "0.5px solid var(--a-line)", borderRadius: 18, padding: "20px 22px", boxShadow: "var(--a-shadow)" }}>
                    <div style={{ fontFamily: "var(--a-display)", fontSize: 17, fontWeight: 700, letterSpacing: -0.3, marginBottom: 14 }}>類型分佈</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {Object.entries(data.typeCounts || {}).map(([type, count]) => (
                        <div
                          key={type}
                          onClick={() => { setFilterType(filterType === type ? null : type); setFilterModel(null); setShowBookmarks(false); }}
                          style={{
                            padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                            background: "var(--a-bg-soft)",
                            border: filterType === type ? "1.5px solid var(--a-accent)" : "0.5px solid transparent",
                            transition: "border-color 150ms",
                          }}
                        >
                          <div style={{ fontFamily: "var(--a-display)", fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: "var(--a-fg)" }}>{count}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--a-muted)", marginTop: 2 }}>{type}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </aside>
              )}
            </div>
          </>
        )}

        {/* Subscribe */}
        <section style={{
          marginTop: 16, padding: "48px 40px",
          background: "linear-gradient(135deg, #1d1d1f 0%, #2c2c2e 100%)",
          borderRadius: 24, color: "white", textAlign: "center",
        }}>
          <div style={{ fontFamily: "var(--a-display)", fontSize: 28, fontWeight: 700, letterSpacing: -0.6, marginBottom: 10 }}>每天第一個知道</div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.58)", marginBottom: 28, lineHeight: 1.5 }}>
            訂閱每日 AI 精選，每天早上直接寄到你的信箱
          </div>
          {subOk ? (
            <div style={{ fontSize: 16, color: "#34c759", fontWeight: 600 }}>✓ 已訂閱，明天見！</div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); if (subEmail.includes("@")) setSubOk(true); }}
              style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}
            >
              <input
                type="email" placeholder="your@email.com" required
                value={subEmail} onChange={e => setSubEmail(e.target.value)}
                style={{
                  flex: "1 1 200px", minWidth: 0, padding: "11px 16px", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)",
                  color: "white", fontSize: 14, fontFamily: "var(--a-sans)", outline: "none",
                }}
              />
              <button type="submit" style={{
                padding: "11px 24px", borderRadius: 12, background: "white", color: "#1d1d1f",
                border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "var(--a-sans)", flex: "none",
              }}>訂閱</button>
            </form>
          )}
        </section>

        {/* Footer */}
        <footer style={{ padding: "36px 0 16px", borderTop: "0.5px solid var(--a-line)", marginTop: 48 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontSize: 13, color: "var(--a-muted)" }}>
              <span style={{ fontFamily: "var(--a-display)", fontSize: 15, fontWeight: 600, color: "var(--a-fg)", marginRight: 10 }}>
                <span style={{ color: "var(--a-accent)" }}>◐</span> Daily AI Digest
              </span>
              每日從 GitHub 精選有價值的 AI 應用
            </div>
            <div style={{ display: "flex", gap: 20, fontSize: 13, color: "var(--a-muted)" }}>
              <a href="https://github.com/topics/claude-ai" target="_blank" rel="noopener noreferrer" style={{ color: "var(--a-muted)", textDecoration: "none" }}>GitHub</a>
              <span style={{ cursor: "pointer" }} onClick={() => onRefresh && onRefresh()}>重新整理</span>
              <span style={{ cursor: "pointer" }} onClick={() => { onClearCache && onClearCache(); onRefresh && onRefresh(); }}>清除快取</span>
            </div>
          </div>
        </footer>
      </main>

      {open && (
        <DA_DetailSheet
          pick={open} onClose={() => setOpen(null)}
          bookmarks={bookmarks} onToggleBookmark={toggleBookmark}
        />
      )}
    </div>
  );
}

window.DigestApp = DigestApp;
window.V1App = function(props) { return React.createElement(DigestApp, { data: props.data }); };
