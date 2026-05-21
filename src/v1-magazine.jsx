// Variation A: App Store Today
// Apple's "Today" tab vibe — calendar masthead, editorial hero, curated rows.

const { useState: A_useState, useMemo: A_useMemo, useEffect: A_useEffect } = React;
const A_DATA = window.DIGEST_DATA;
const A_COLORS = window.MODEL_COLORS;

// Gradients keyed to model — used as card hero backgrounds (no SVG illustration)
const A_HERO_BG = {
  Claude:  "radial-gradient(120% 100% at 20% 20%, #ff8a5c 0%, #ff5b30 35%, #c93f00 70%, #6a1f00 100%)",
  Gemini:  "radial-gradient(120% 100% at 20% 20%, #6dabff 0%, #2a6fdb 40%, #1d3fa6 75%, #0a1d52 100%)",
  ChatGPT: "radial-gradient(120% 100% at 20% 20%, #4fd3a3 0%, #137a5a 40%, #0a523c 75%, #022918 100%)",
  Multi:   "linear-gradient(120deg, #ff6b35 0%, #ff2d92 28%, #8b5cf6 56%, #2a9df4 84%, #00d9ff 100%)",
};

function A_heroBgFor(pick) {
  return pick.models.length > 1 ? A_HERO_BG.Multi : A_HERO_BG[pick.models[0]] || A_HERO_BG.Claude;
}

function A_ModelChip({ model, dark = false }) {
  const c = A_COLORS[model] || A_COLORS.Claude;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px",
      borderRadius: 999,
      background: dark ? "rgba(255,255,255,0.18)" : c.bg,
      color: dark ? "#fff" : c.fg,
      fontSize: 11.5, fontWeight: 600, letterSpacing: 0.1,
      backdropFilter: dark ? "blur(20px) saturate(180%)" : "none",
      WebkitBackdropFilter: dark ? "blur(20px) saturate(180%)" : "none",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: dark ? "#fff" : c.fg }} />
      {model}
    </span>
  );
}

function A_Eyebrow({ children, color }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
      color: color || "var(--a-muted)", fontFamily: "var(--a-sans)",
    }}>{children}</div>
  );
}

function A_HeroCard({ pick, onOpen }) {
  return (
    <article
      onClick={() => onOpen(pick)}
      style={{
        cursor: "pointer",
        borderRadius: 22,
        overflow: "hidden",
        background: "var(--a-surface)",
        boxShadow: "var(--a-shadow-lg)",
        border: "0.5px solid var(--a-line)",
        transition: "transform 280ms cubic-bezier(.2,.7,.2,1), box-shadow 280ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "var(--a-shadow-xl)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "var(--a-shadow-lg)";
      }}
    >
      {/* Hero band */}
      <div style={{
        position: "relative", aspectRatio: "21 / 9",
        background: A_heroBgFor(pick),
        padding: "32px 36px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        color: "white", overflow: "hidden",
      }}>
        {/* Apple-style ambient shapes */}
        <div style={{
          position: "absolute", right: -120, top: -80,
          width: 380, height: 380, borderRadius: 999,
          background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 60%)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", left: -60, bottom: -100,
          width: 280, height: 280, borderRadius: 999,
          background: "radial-gradient(circle, rgba(0,0,0,0.25), transparent 60%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }} />

        <header style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
          <A_Eyebrow color="rgba(255,255,255,0.95)">Today’s Story · 今日首選</A_Eyebrow>
          <span style={{ width: 24, height: 1, background: "rgba(255,255,255,0.5)" }} />
          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)", fontWeight: 500, letterSpacing: 0.5 }}>{pick.type}</span>
        </header>

        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{
            fontFamily: "var(--a-display)",
            fontSize: 38, lineHeight: 1.05, letterSpacing: -0.8,
            margin: "0 0 10px", fontWeight: 700, color: "white",
            textShadow: "0 1px 24px rgba(0,0,0,0.25)",
            maxWidth: "75%",
          }}>{pick.tagline}</h2>
          <p style={{
            fontSize: 14.5, lineHeight: 1.55, margin: 0,
            color: "rgba(255,255,255,0.92)", maxWidth: "62%",
            fontWeight: 450,
          }}>{pick.summary.slice(0, 110)}…</p>
        </div>
      </div>

      {/* Footer band */}
      <div style={{
        padding: "18px 36px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 20, borderTop: "0.5px solid var(--a-line)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 11,
            background: A_heroBgFor(pick),
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontFamily: "var(--a-display)",
            fontSize: 18, fontWeight: 700,
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}>{pick.name[0].toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--a-mono)", fontSize: 12.5,
              color: "var(--a-fg-2)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{pick.author}</div>
            <div style={{
              fontSize: 14, fontWeight: 600, color: "var(--a-fg)",
              letterSpacing: -0.1, marginTop: 1,
            }}>{pick.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {pick.models.map(m => <A_ModelChip key={m} model={m} />)}
          </div>
          <button onClick={(e) => { e.stopPropagation(); onOpen(pick); }} style={{
            padding: "8px 18px", borderRadius: 999,
            background: "var(--a-accent)", color: "white",
            border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, letterSpacing: 0.1,
            fontFamily: "var(--a-sans)",
            boxShadow: "0 1px 2px rgba(0,113,227,0.25)",
          }}>查看</button>
        </div>
      </div>
    </article>
  );
}

function A_PickCard({ pick, onOpen }) {
  return (
    <article
      onClick={() => onOpen(pick)}
      style={{
        cursor: "pointer",
        background: "var(--a-surface)",
        border: "0.5px solid var(--a-line)",
        borderRadius: 18,
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        transition: "transform 200ms cubic-bezier(.2,.7,.2,1), box-shadow 200ms",
        boxShadow: "var(--a-shadow)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "var(--a-shadow-lg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "var(--a-shadow)";
      }}
    >
      <div style={{
        position: "relative",
        aspectRatio: "16 / 9",
        background: A_heroBgFor(pick),
        padding: "16px 20px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        color: "white", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", right: -50, top: -40,
          width: 180, height: 180, borderRadius: 999,
          background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 60%)",
          filter: "blur(16px)",
        }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <A_Eyebrow color="rgba(255,255,255,0.9)">{pick.type}</A_Eyebrow>
          <div style={{ display: "flex", gap: 4 }}>
            {pick.models.map(m => <A_ModelChip key={m} model={m} dark />)}
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: "var(--a-mono)", marginBottom: 2 }}>
            {pick.author}
          </div>
          <h3 style={{
            fontFamily: "var(--a-display)",
            fontSize: 19, lineHeight: 1.15, letterSpacing: -0.3,
            margin: 0, fontWeight: 700,
          }}>{pick.tagline}</h3>
        </div>
      </div>
      <div style={{ padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <p style={{
          margin: 0, fontSize: 13, lineHeight: 1.55,
          color: "var(--a-fg-2)",
        }}>{pick.summary.slice(0, 84)}…</p>
        <div style={{
          marginTop: "auto",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, color: "var(--a-muted)",
        }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--a-mono)" }}>★ {pick.stars.toLocaleString()}</span>
            <span style={{ color: "var(--a-accent)", fontWeight: 600 }}>+{pick.starsToday}</span>
          </span>
          <span>{pick.eta}</span>
        </div>
      </div>
    </article>
  );
}

function A_ListRow({ pick, onOpen, divider }) {
  return (
    <button
      onClick={() => onOpen(pick)}
      style={{
        cursor: "pointer", border: "none", background: "transparent",
        textAlign: "left", padding: "14px 0",
        borderTop: divider ? "0.5px solid var(--a-line)" : "none",
        display: "grid",
        gridTemplateColumns: "52px 1fr auto",
        gap: 14, alignItems: "center", width: "100%",
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: A_heroBgFor(pick),
        color: "white", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--a-display)", fontSize: 22, fontWeight: 700,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      }}>{pick.name[0].toUpperCase()}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--a-muted)" }}>{pick.type}</span>
          {pick.models.slice(0, 2).map(m => {
            const c = A_COLORS[m];
            return <span key={m} style={{ fontSize: 11, color: c.fg, fontWeight: 600 }}>{m}</span>;
          })}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: "var(--a-fg)",
          letterSpacing: -0.1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{pick.tagline}</div>
        <div style={{ fontSize: 12, color: "var(--a-muted)", fontFamily: "var(--a-mono)", marginTop: 2 }}>
          {pick.name} · ★ {pick.stars.toLocaleString()} <span style={{ color: "var(--a-accent)", fontWeight: 600 }}>+{pick.starsToday}</span>
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onOpen(pick); }} style={{
        padding: "6px 14px", borderRadius: 999,
        background: "var(--a-pill-bg)", color: "var(--a-accent)",
        border: "none", cursor: "pointer",
        fontSize: 12, fontWeight: 600,
        fontFamily: "var(--a-sans)",
      }}>查看</button>
    </button>
  );
}

function A_Detail({ pick, onClose }) {
  A_useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pick) return null;
  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 30,
      background: "rgba(0,0,0,0.36)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      animation: "a-fade 200ms ease-out",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(820px, 94%)",
        height: "92%",
        background: "var(--a-surface)",
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        boxShadow: "0 -12px 40px rgba(0,0,0,0.25)",
        overflow: "auto",
        animation: "a-rise 320ms cubic-bezier(.2,.7,.2,1)",
        position: "relative",
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          padding: "10px 0 8px",
          background: "color-mix(in oklab, var(--a-surface) 80%, transparent)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          display: "flex", justifyContent: "center",
          borderBottom: "0.5px solid var(--a-line)",
        }}>
          <button onClick={onClose} style={{
            width: 36, height: 5, borderRadius: 999,
            background: "var(--a-line-strong)",
            border: "none", cursor: "pointer",
          }} />
        </div>

        {/* Hero */}
        <div style={{
          position: "relative",
          padding: "44px 44px 56px",
          background: A_heroBgFor(pick),
          color: "white", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", right: -120, top: -80,
            width: 480, height: 480, borderRadius: 999,
            background: "radial-gradient(circle, rgba(255,255,255,0.30), transparent 60%)",
            filter: "blur(40px)",
          }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 18, position: "relative" }}>
            {pick.models.map(m => <A_ModelChip key={m} model={m} dark />)}
            <span style={{
              padding: "3px 10px", borderRadius: 999,
              background: "rgba(255,255,255,0.18)", color: "white",
              fontSize: 11.5, fontWeight: 600, backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}>{pick.type}</span>
          </div>
          <div style={{ fontFamily: "var(--a-mono)", fontSize: 13, color: "rgba(255,255,255,0.88)", marginBottom: 8, position: "relative" }}>
            {pick.author} / {pick.name}
          </div>
          <h1 style={{
            fontFamily: "var(--a-display)",
            fontSize: 44, lineHeight: 1.05, letterSpacing: -1,
            margin: 0, fontWeight: 700,
            textShadow: "0 1px 24px rgba(0,0,0,0.18)",
            position: "relative",
          }}>{pick.tagline}</h1>
        </div>

        <div style={{ padding: "36px 44px 64px" }}>
          {/* Stats row */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10, marginBottom: 36,
          }}>
            <A_Stat label="GitHub" value={pick.stars.toLocaleString()} sub={`今日 +${pick.starsToday}`} />
            <A_Stat label="難度" value={pick.difficulty} sub={`Level ${pick.difficultyLevel}/3`} />
            <A_Stat label="預估上手" value={pick.eta} sub="hands-on" />
          </div>

          <A_SectionLabel>介紹</A_SectionLabel>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "var(--a-fg)", margin: "0 0 36px", letterSpacing: -0.1 }}>
            {pick.summary}
          </p>

          <A_SectionLabel>為什麼值得看</A_SectionLabel>
          <div style={{
            padding: "20px 22px", margin: "0 0 36px",
            background: "var(--a-bg-soft)",
            borderRadius: 16,
            fontSize: 15.5, lineHeight: 1.6, color: "var(--a-fg-2)",
            letterSpacing: -0.05,
          }}>{pick.whyValuable}</div>

          <A_SectionLabel>理解步驟</A_SectionLabel>
          <ol style={{ listStyle: "none", margin: "0 0 36px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {pick.steps.map((s, i) => (
              <li key={i} style={{
                display: "flex", gap: 14,
                padding: "14px 16px",
                background: "var(--a-bg-soft)",
                borderRadius: 14,
                fontSize: 15, lineHeight: 1.6,
                color: "var(--a-fg)",
                letterSpacing: -0.05,
              }}>
                <span style={{
                  flex: "none", width: 26, height: 26, borderRadius: 999,
                  background: "var(--a-fg)", color: "var(--a-surface)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, fontFamily: "var(--a-display)",
                  marginTop: 1,
                }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{s}</span>
              </li>
            ))}
          </ol>

          <A_SectionLabel>一眼看程式</A_SectionLabel>
          <pre style={{
            margin: 0, padding: "20px 22px",
            background: "var(--a-code-bg)", color: "var(--a-code-fg)",
            borderRadius: 16, fontFamily: "var(--a-mono)", fontSize: 13, lineHeight: 1.75,
            overflow: "auto", border: "0.5px solid var(--a-line)",
          }}>{pick.codePreview}</pre>
        </div>
      </div>
    </div>
  );
}

function A_Stat({ label, value, sub }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: "var(--a-bg-soft)",
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "var(--a-muted)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--a-display)", fontSize: 22, fontWeight: 700, color: "var(--a-fg)", letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--a-muted)", marginTop: 4, fontFamily: "var(--a-mono)" }}>{sub}</div>
    </div>
  );
}

function A_SectionLabel({ children }) {
  return (
    <h3 style={{
      fontFamily: "var(--a-display)",
      fontSize: 13, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
      color: "var(--a-muted)", margin: "0 0 12px",
    }}>{children}</h3>
  );
}

function V1App({ themeMode = "light", typeScale = 1 }) {
  const data = A_DATA;
  const [open, setOpen] = A_useState(null);
  const [hero, p2, p3, p4, p5] = data.picks;

  return (
    <div data-theme={themeMode} style={{
      fontSize: `${17 * typeScale}px`,
      width: "100%", height: "100%",
      position: "relative",
      background: "var(--a-bg)",
      color: "var(--a-fg)",
      fontFamily: "var(--a-sans)",
      overflow: "auto",
      letterSpacing: -0.01,
    }}>
      <style>{`
        @keyframes a-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes a-rise { from { transform: translateY(60px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        [data-theme="light"] {
          --a-bg: #fbfbfd;
          --a-bg-soft: #f5f5f7;
          --a-surface: #ffffff;
          --a-fg: #1d1d1f;
          --a-fg-2: #424245;
          --a-muted: #86868b;
          --a-line: rgba(0,0,0,0.08);
          --a-line-strong: rgba(0,0,0,0.20);
          --a-accent: #0071e3;
          --a-pill-bg: rgba(0,113,227,0.08);
          --a-code-bg: #f5f5f7;
          --a-code-fg: #1d1d1f;
          --a-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
          --a-shadow-lg: 0 2px 6px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.08);
          --a-shadow-xl: 0 4px 8px rgba(0,0,0,0.06), 0 24px 60px rgba(0,0,0,0.12);
        }
        [data-theme="dark"] {
          --a-bg: #000000;
          --a-bg-soft: #1d1d1f;
          --a-surface: #1d1d1f;
          --a-fg: #f5f5f7;
          --a-fg-2: #d2d2d7;
          --a-muted: #86868b;
          --a-line: rgba(255,255,255,0.10);
          --a-line-strong: rgba(255,255,255,0.25);
          --a-accent: #2997ff;
          --a-pill-bg: rgba(41,151,255,0.16);
          --a-code-bg: #0a0a0a;
          --a-code-fg: #f5f5f7;
          --a-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
          --a-shadow-lg: 0 2px 6px rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.5);
          --a-shadow-xl: 0 4px 8px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.6);
        }
      `}</style>

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        background: "color-mix(in oklab, var(--a-bg) 72%, transparent)",
        borderBottom: "0.5px solid var(--a-line)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <span style={{ fontFamily: "var(--a-display)", fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
              <span style={{ color: "var(--a-accent)" }}>◐</span> Digest
            </span>
            <nav style={{ display: "flex", gap: 22, fontSize: 13, color: "var(--a-fg-2)" }}>
              <a style={navLink} href="#">今日</a>
              <a style={navLink} href="#">應用</a>
              <a style={navLink} href="#">Agent</a>
              <a style={navLink} href="#">RAG</a>
              <a style={navLink} href="#">趨勢</a>
              <a style={navLink} href="#">歷史</a>
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={pillBtn}>⌕ 搜尋</button>
            <button style={{ ...pillBtn, background: "var(--a-fg)", color: "var(--a-bg)", borderColor: "transparent" }}>訂閱</button>
          </div>
        </div>
      </header>

      {/* Calendar masthead */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 32px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
          <div>
            <div style={{
              fontSize: 14, fontWeight: 600, color: "var(--a-accent)",
              letterSpacing: 0.2, textTransform: "uppercase",
              marginBottom: 8,
            }}>週四 · 5 月 21 日</div>
            <h1 style={{
              fontFamily: "var(--a-display)",
              fontSize: 68, lineHeight: 0.98, letterSpacing: -2,
              margin: 0, fontWeight: 700, color: "var(--a-fg)",
            }}>今日精選</h1>
            <p style={{
              fontSize: 19, lineHeight: 1.45, color: "var(--a-fg-2)",
              margin: "12px 0 0", letterSpacing: -0.2, maxWidth: 620,
            }}>
              掃了 {data.totalScanned.toLocaleString()} 個 GitHub repo，挑出 {data.curated} 個值得花時間理解的 AI 應用。
            </p>
          </div>
          <div style={{
            display: "flex", gap: 10,
          }}>
            <A_MiniStat n={data.totalScanned} label="掃描" />
            <A_MiniStat n={data.curated} label="精選" accent />
            <A_MiniStat n={data.picks.reduce((s, p) => s + p.starsToday, 0)} label="今日新星" prefix="+" />
          </div>
        </div>
      </section>

      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px 8px" }}>
        <A_HeroCard pick={hero} onOpen={setOpen} />
      </section>

      {/* Top picks row */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px 8px" }}>
        <A_SectionHeader title="本日推薦" subtitle="精選 4 個現在最值得 fork 的專案" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 22 }}>
          {[p2, p3, p4].map(p => <A_PickCard key={p.id} pick={p} onOpen={setOpen} />)}
        </div>
      </section>

      {/* Two-column lower */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 32px 8px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32 }}>
        <div>
          <A_SectionHeader title="新發布的 repo" subtitle="今天剛從 0 star 起步的新專案" />
          <div style={{
            marginTop: 22, padding: "4px 24px",
            background: "var(--a-surface)",
            border: "0.5px solid var(--a-line)",
            borderRadius: 18,
            boxShadow: "var(--a-shadow)",
          }}>
            {data.newlyReleased.map((r, i) => (
              <A_ListRow
                key={r.name}
                pick={{ ...r, name: r.name, stars: r.stars, starsToday: r.starsToday, eta: "—" }}
                onOpen={() => {}}
                divider={i > 0}
              />
            ))}
          </div>
        </div>
        <aside>
          <A_SectionHeader title="今日趨勢" subtitle="星數成長最快的 repo" />
          <div style={{
            marginTop: 22, padding: "20px 22px",
            background: "var(--a-surface)",
            border: "0.5px solid var(--a-line)",
            borderRadius: 18,
            boxShadow: "var(--a-shadow)",
          }}>
            {data.trending.map((t, i) => (
              <div key={t.name} style={{
                padding: "10px 0",
                borderTop: i === 0 ? "none" : "0.5px solid var(--a-line)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--a-display)", fontWeight: 700, fontSize: 18, color: "var(--a-muted)", width: 22, textAlign: "right" }}>{i + 1}</span>
                  <span style={{ fontFamily: "var(--a-mono)", fontSize: 13, color: "var(--a-fg)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                </div>
                <span style={{ fontFamily: "var(--a-mono)", fontSize: 13, color: "var(--a-accent)", fontWeight: 600 }}>{t.delta}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {/* Top 5 detail row */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 32px 80px" }}>
        <A_SectionHeader title="更多精選" subtitle={`今天總共挑了 ${data.picks.length} 個`} />
        <div style={{
          marginTop: 22,
          background: "var(--a-surface)",
          border: "0.5px solid var(--a-line)",
          borderRadius: 18,
          padding: "4px 24px",
          boxShadow: "var(--a-shadow)",
        }}>
          {data.picks.map((p, i) => (
            <A_ListRow key={p.id} pick={p} onOpen={setOpen} divider={i > 0} />
          ))}
        </div>
      </section>

      {open && <A_Detail pick={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function A_MiniStat({ n, label, accent, prefix = "" }) {
  return (
    <div style={{
      padding: "14px 18px", borderRadius: 14,
      background: "var(--a-surface)",
      border: "0.5px solid var(--a-line)",
      minWidth: 96, textAlign: "right",
    }}>
      <div style={{
        fontFamily: "var(--a-display)",
        fontSize: 22, fontWeight: 700, letterSpacing: -0.5,
        color: accent ? "var(--a-accent)" : "var(--a-fg)",
      }}>{prefix}{n.toLocaleString()}</div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "var(--a-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function A_SectionHeader({ title, subtitle }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
      <div>
        <h2 style={{
          fontFamily: "var(--a-display)",
          fontSize: 32, lineHeight: 1.1, letterSpacing: -0.8,
          margin: 0, fontWeight: 700,
        }}>{title}</h2>
        {subtitle && <p style={{ margin: "6px 0 0", fontSize: 15, color: "var(--a-muted)", letterSpacing: -0.1 }}>{subtitle}</p>}
      </div>
      <a style={{
        fontSize: 14, color: "var(--a-accent)", fontWeight: 500,
        textDecoration: "none",
      }} href="#">查看全部 ›</a>
    </div>
  );
}

const navLink = {
  color: "var(--a-fg-2)", textDecoration: "none", fontWeight: 500,
};

const pillBtn = {
  padding: "6px 14px", borderRadius: 999,
  background: "transparent", color: "var(--a-fg)",
  border: "0.5px solid var(--a-line-strong)",
  fontSize: 13, fontWeight: 500, cursor: "pointer",
  fontFamily: "var(--a-sans)",
};

window.V1App = V1App;
