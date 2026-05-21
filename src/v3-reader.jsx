// Variation C: Apple Intelligence — cinematic dark
// Prismatic glow, Siri-ring hero, glass cards, iridescent details.

const C_DATA = window.DIGEST_DATA;
const C_COLORS = window.MODEL_COLORS;

const C_IRIDESCENT = "linear-gradient(120deg, #ff6b35 0%, #ff2d92 28%, #8b5cf6 56%, #2a9df4 82%, #00d9ff 100%)";

function C_ModelChip({ model, dark = true }) {
  const c = C_COLORS[model] || C_COLORS.Claude;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px",
      borderRadius: 999,
      background: dark ? "rgba(255,255,255,0.10)" : c.bg,
      color: dark ? "#fff" : c.fg,
      fontSize: 11.5, fontWeight: 600, letterSpacing: 0.1,
      border: dark ? "0.5px solid rgba(255,255,255,0.18)" : `0.5px solid ${c.ring}`,
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: 999,
        background: dark ? c.fg : c.fg,
        boxShadow: dark ? `0 0 6px ${c.fg}` : "none",
      }} />
      {model}
    </span>
  );
}

function C_SiriRing({ size = 220 }) {
  // The Apple Intelligence-style prismatic ring/glow.
  return (
    <div style={{
      position: "relative", width: size, height: size,
      pointerEvents: "none",
    }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: 999,
        background: C_IRIDESCENT,
        filter: "blur(28px)", opacity: 0.55,
        animation: "c-spin 12s linear infinite",
      }} />
      <div style={{
        position: "absolute", inset: 14, borderRadius: 999,
        background: C_IRIDESCENT,
        filter: "blur(18px)", opacity: 0.85,
        animation: "c-spin 18s linear infinite reverse",
      }} />
      <div style={{
        position: "absolute", inset: 30, borderRadius: 999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }} />
      <div style={{
        position: "absolute", inset: 30, borderRadius: 999,
        background: "conic-gradient(from 90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
        animation: "c-spin 8s linear infinite",
      }} />
    </div>
  );
}

function C_FilterChip({ active, color, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 14px", borderRadius: 999,
      background: active ? "rgba(255,255,255,0.12)" : "transparent",
      border: active ? "0.5px solid rgba(255,255,255,0.30)" : "0.5px solid rgba(255,255,255,0.14)",
      color: active ? "white" : "rgba(255,255,255,0.72)",
      fontSize: 12.5, fontWeight: 500, cursor: "pointer",
      fontFamily: "var(--c-sans)",
      display: "inline-flex", alignItems: "center", gap: 7,
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      transition: "all 180ms",
    }}>
      {color && <span style={{ width: 6, height: 6, borderRadius: 999, background: color, boxShadow: `0 0 6px ${color}` }} />}
      {label}
    </button>
  );
}

function C_Card({ pick, onOpen, large = false }) {
  const accent = (C_COLORS[pick.models[0]] || C_COLORS.Claude).fg;
  return (
    <article
      onClick={() => onOpen(pick)}
      style={{
        cursor: "pointer",
        position: "relative",
        background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "0.5px solid rgba(255,255,255,0.10)",
        borderRadius: 22,
        padding: large ? "32px 32px 28px" : "22px 24px 20px",
        overflow: "hidden",
        transition: "border-color 220ms, transform 220ms cubic-bezier(.2,.7,.2,1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.28)";
        e.currentTarget.style.transform = "translateY(-2px)";
        const glow = e.currentTarget.querySelector(".c-card-glow");
        if (glow) glow.style.opacity = "0.75";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
        e.currentTarget.style.transform = "";
        const glow = e.currentTarget.querySelector(".c-card-glow");
        if (glow) glow.style.opacity = "0";
      }}
    >
      {/* Hover iridescent glow */}
      <div className="c-card-glow" style={{
        position: "absolute", inset: -1, borderRadius: 22,
        padding: 1,
        background: C_IRIDESCENT,
        opacity: 0, transition: "opacity 280ms",
        pointerEvents: "none",
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude",
      }} />

      {/* Accent corner glow */}
      <div style={{
        position: "absolute", right: -60, top: -60,
        width: 200, height: 200, borderRadius: 999,
        background: `radial-gradient(circle, ${accent}55, transparent 60%)`,
        filter: "blur(36px)",
        pointerEvents: "none",
      }} />

      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, position: "relative" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {pick.models.map(m => <C_ModelChip key={m} model={m} />)}
        </div>
        <span style={{
          fontFamily: "var(--c-mono)",
          fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase",
          color: "rgba(255,255,255,0.5)", fontWeight: 600,
        }}>{pick.type}</span>
      </header>

      <div style={{ fontFamily: "var(--c-mono)", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 6, position: "relative" }}>
        {pick.author} / <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 600 }}>{pick.name}</span>
      </div>

      <h3 style={{
        fontFamily: "var(--c-display)",
        fontSize: large ? 28 : 19, lineHeight: 1.15, letterSpacing: -0.4,
        margin: "0 0 12px", fontWeight: 700,
        color: "white", position: "relative",
        textWrap: "balance",
      }}>{pick.tagline}</h3>

      <p style={{
        fontSize: large ? 15 : 13.5, lineHeight: 1.55,
        color: "rgba(255,255,255,0.72)", margin: 0,
        position: "relative",
      }}>
        {pick.summary.slice(0, large ? 200 : 100)}…
      </p>

      <footer style={{
        marginTop: large ? 22 : 16,
        paddingTop: large ? 18 : 14,
        borderTop: "0.5px solid rgba(255,255,255,0.10)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "var(--c-mono)" }}>
          <span>★ {pick.stars.toLocaleString()}</span>
          <span style={{
            background: C_IRIDESCENT,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontWeight: 700,
          }}>+{pick.starsToday}</span>
          <span>{pick.eta}</span>
        </div>
        <span style={{
          width: 26, height: 26, borderRadius: 999,
          background: "rgba(255,255,255,0.10)",
          border: "0.5px solid rgba(255,255,255,0.20)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 13,
        }}>↗</span>
      </footer>
    </article>
  );
}

function C_Detail({ pick, onClose }) {
  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!pick) return null;
  return (
    <div onClick={onClose} style={{
      position: "absolute", inset: 0, zIndex: 30,
      background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      display: "flex", justifyContent: "flex-end",
      animation: "c-fade 220ms ease-out",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "min(680px, 92%)", height: "100%",
        background: "rgba(20,20,22,0.78)",
        borderLeft: "0.5px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        overflow: "auto",
        animation: "c-slide 320ms cubic-bezier(.2,.7,.2,1)",
        position: "relative",
      }}>
        {/* Iridescent edge accent */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 1,
          background: C_IRIDESCENT,
          opacity: 0.6,
        }} />
        <div style={{
          position: "sticky", top: 0, zIndex: 2,
          padding: "14px 28px",
          background: "rgba(20,20,22,0.7)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "0.5px solid rgba(255,255,255,0.10)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontFamily: "var(--c-mono)", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
            {pick.author}/<span style={{ color: "white", fontWeight: 600 }}>{pick.name}</span>
          </span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            border: "0.5px solid rgba(255,255,255,0.20)",
            color: "white", cursor: "pointer", fontSize: 14,
          }}>×</button>
        </div>

        {/* Hero */}
        <div style={{
          padding: "44px 36px 36px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", right: -80, top: -100,
            width: 360, height: 360, borderRadius: 999,
            background: C_IRIDESCENT, filter: "blur(80px)",
            opacity: 0.35, pointerEvents: "none",
          }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, position: "relative" }}>
            {pick.models.map(m => <C_ModelChip key={m} model={m} />)}
            <span style={{
              padding: "3px 10px", borderRadius: 999,
              background: "rgba(255,255,255,0.10)",
              border: "0.5px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 11.5, fontWeight: 600,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}>{pick.type}</span>
          </div>
          <h1 style={{
            fontFamily: "var(--c-display)",
            fontSize: 36, lineHeight: 1.08, letterSpacing: -0.8,
            margin: 0, fontWeight: 700, color: "white",
            textWrap: "balance",
            position: "relative",
          }}>{pick.tagline}</h1>

          <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <C_Stat label="Stars" value={pick.stars.toLocaleString()} sub={`+${pick.starsToday} today`} />
            <C_Stat label="難度" value={pick.difficulty} sub={`Level ${pick.difficultyLevel}/3`} />
            <C_Stat label="上手" value={pick.eta} sub="hands-on" />
          </div>
        </div>

        <div style={{ padding: "8px 36px 60px" }}>
          <C_Label>介紹</C_Label>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "rgba(255,255,255,0.85)", margin: "0 0 32px", letterSpacing: -0.05 }}>
            {pick.summary}
          </p>

          <C_Label>為什麼值得看</C_Label>
          <div style={{
            position: "relative",
            padding: "18px 22px",
            margin: "0 0 32px",
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            fontSize: 14.5, lineHeight: 1.65, color: "rgba(255,255,255,0.78)",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
              background: C_IRIDESCENT,
            }} />
            <span style={{ marginLeft: 6 }}>{pick.whyValuable}</span>
          </div>

          <C_Label>理解步驟</C_Label>
          <ol style={{ listStyle: "none", margin: "0 0 32px", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {pick.steps.map((s, i) => (
              <li key={i} style={{
                display: "grid", gridTemplateColumns: "32px 1fr",
                gap: 14, padding: "14px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,0.88)",
              }}>
                <span style={{
                  fontFamily: "var(--c-display)",
                  fontSize: 18, fontWeight: 700,
                  background: C_IRIDESCENT,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: -0.3, lineHeight: 1,
                  paddingTop: 4,
                }}>{String(i + 1).padStart(2, "0")}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          <C_Label>一眼看程式</C_Label>
          <pre style={{
            margin: 0, padding: "20px 22px",
            background: "rgba(0,0,0,0.5)",
            color: "rgba(255,255,255,0.88)",
            borderRadius: 14, border: "0.5px solid rgba(255,255,255,0.10)",
            fontFamily: "var(--c-mono)", fontSize: 12.5, lineHeight: 1.75,
            overflow: "auto",
          }}>{pick.codePreview}</pre>

          <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
            <button style={{
              padding: "10px 22px", borderRadius: 999,
              background: "white", color: "black",
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              fontFamily: "var(--c-sans)",
            }}>在 GitHub 開啟 ›</button>
            <button style={{
              padding: "10px 22px", borderRadius: 999,
              background: "rgba(255,255,255,0.08)", color: "white",
              border: "0.5px solid rgba(255,255,255,0.20)",
              cursor: "pointer",
              fontSize: 13, fontWeight: 500,
              fontFamily: "var(--c-sans)",
            }}>收藏</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function C_Stat({ label, value, sub }) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 14,
      background: "rgba(255,255,255,0.04)",
      border: "0.5px solid rgba(255,255,255,0.10)",
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "var(--c-display)", fontSize: 22, fontWeight: 700, color: "white", letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, fontFamily: "var(--c-mono)" }}>{sub}</div>
    </div>
  );
}

function C_Label({ children }) {
  return (
    <h3 style={{
      fontFamily: "var(--c-display)",
      fontSize: 11.5, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase",
      color: "rgba(255,255,255,0.5)", margin: "0 0 12px",
    }}>{children}</h3>
  );
}

function V3App({ themeMode = "dark", typeScale = 1, data = C_DATA }) {
  // This variation is intentionally always-dark — Apple Intelligence is a dark-canvas aesthetic.
  // We still respond to theme so the design canvas Tweak feels consistent.
  const [filter, setFilter] = React.useState({ kind: "all", value: null });
  const [open, setOpen] = React.useState(null);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    let list = data.picks;
    if (filter.kind === "model") list = list.filter(p => p.models.includes(filter.value));
    if (filter.kind === "type") list = list.filter(p => p.type === filter.value);
    if (query) list = list.filter(p => (p.name + p.tagline + p.summary).toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [filter, query, data.picks]);

  const [hero, ...rest] = filtered;

  return (
    <div style={{
      fontSize: `${16 * typeScale}px`,
      width: "100%", height: "100%",
      background: "#000",
      color: "white",
      fontFamily: "var(--c-sans)",
      overflow: "auto",
      letterSpacing: -0.01,
      position: "relative",
    }}>
      <style>{`
        @keyframes c-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes c-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes c-slide { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @keyframes c-rise { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      {/* Ambient bg */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.18), transparent 70%), radial-gradient(40% 30% at 80% 30%, rgba(0,217,255,0.10), transparent 70%), radial-gradient(40% 40% at 15% 25%, rgba(255,107,53,0.12), transparent 70%)",
      }} />

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        background: "rgba(0,0,0,0.55)",
        borderBottom: "0.5px solid rgba(255,255,255,0.10)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 36px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 999,
              background: C_IRIDESCENT,
              boxShadow: "0 0 14px rgba(139,92,246,0.6)",
            }} />
            <span style={{ fontFamily: "var(--c-display)", fontSize: 17, fontWeight: 600, letterSpacing: -0.3, color: "white" }}>
              Daily AI Digest
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: 0.3, marginLeft: 8 }}>
              {data.dateLabel} · {data.edition}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 12px", borderRadius: 999,
              background: "rgba(255,255,255,0.06)",
              border: "0.5px solid rgba(255,255,255,0.12)",
              fontSize: 12.5,
            }}>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋 repo、技術、模型…"
                style={{
                  border: "none", outline: "none", background: "transparent",
                  color: "white", fontSize: 12.5, fontFamily: "var(--c-sans)",
                  width: 200,
                }}
              />
              <span style={{ fontFamily: "var(--c-mono)", fontSize: 10.5, color: "rgba(255,255,255,0.4)" }}>⌘K</span>
            </div>
            <button style={{
              padding: "6px 14px", borderRadius: 999,
              background: "white", color: "black",
              border: "none", cursor: "pointer",
              fontSize: 12.5, fontWeight: 600,
              fontFamily: "var(--c-sans)",
            }}>訂閱</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        position: "relative", padding: "80px 36px 60px",
        textAlign: "center", overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
          <C_SiriRing size={200} />
        </div>
        <div style={{
          fontFamily: "var(--c-display)",
          fontSize: 13, fontWeight: 700,
          letterSpacing: 1.6, textTransform: "uppercase",
          color: "rgba(255,255,255,0.6)", marginBottom: 16,
        }}>每日 AI 開源精選 · POWERED BY INTELLIGENCE</div>
        <h1 style={{
          fontFamily: "var(--c-display)",
          fontSize: 76, lineHeight: 0.98, letterSpacing: -2.6,
          margin: "0 auto 22px", fontWeight: 700,
          color: "white", maxWidth: 980,
        }}>
          今天值得理解的<br />
          <span style={{
            background: C_IRIDESCENT,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>AI 應用</span>
        </h1>
        <p style={{
          fontFamily: "var(--c-display)",
          fontSize: 19, lineHeight: 1.45, letterSpacing: -0.2,
          color: "rgba(255,255,255,0.7)",
          margin: "0 auto 36px", maxWidth: 640,
          fontWeight: 400,
        }}>
          AI 幫你掃 <b style={{ color: "white" }}>{data.totalScanned.toLocaleString()}</b> 個 repo、整理 <b style={{ color: "white" }}>{data.curated}</b> 篇日報，附上理解步驟。
        </p>

        {/* Filter bar */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <C_FilterChip label={`全部 ${data.picks.length}`}
            active={filter.kind === "all"} onClick={() => setFilter({ kind: "all" })} />
          {Object.keys(data.modelCounts).map(m => (
            <C_FilterChip key={m} label={`${m} ${data.modelCounts[m]}`}
              color={C_COLORS[m].fg}
              active={filter.kind === "model" && filter.value === m}
              onClick={() => setFilter({ kind: "model", value: m })} />
          ))}
          <span style={{ width: 1, height: 22, background: "rgba(255,255,255,0.14)", margin: "0 4px", alignSelf: "center" }} />
          {Object.keys(data.typeCounts).map(t => (
            <C_FilterChip key={t} label={`${t} ${data.typeCounts[t]}`}
              active={filter.kind === "type" && filter.value === t}
              onClick={() => setFilter({ kind: "type", value: t })} />
          ))}
        </div>
      </section>

      {/* Picks grid (bento) */}
      <section style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 36px 60px" }}>
        {hero && (
          <div style={{ marginBottom: 16 }}>
            <C_Card pick={hero} onOpen={setOpen} large />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {rest.map(p => <C_Card key={p.id} pick={p} onOpen={setOpen} />)}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 80, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
            沒有符合條件的項目
          </div>
        )}
      </section>

      {/* Trending + New side by side */}
      <section style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "20px 36px 60px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 28 }}>
        <div>
          <C_SectionTitle eyebrow="FRESH" title="新發布的 repo" />
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(255,255,255,0.10)",
            borderRadius: 18,
            padding: "4px 22px",
          }}>
            {data.newlyReleased.map((r, i) => (
              <div key={r.name} style={{
                padding: "16px 0",
                borderTop: i === 0 ? "none" : "0.5px solid rgba(255,255,255,0.08)",
                display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--c-mono)", fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>{r.author}</div>
                  <div style={{ fontFamily: "var(--c-mono)", fontSize: 14, fontWeight: 600, color: "white", margin: "1px 0 4px", letterSpacing: -0.1 }}>{r.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{r.tagline}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    {r.models.map(m => <C_ModelChip key={m} model={m} />)}
                  </div>
                  <span style={{
                    fontFamily: "var(--c-mono)", fontSize: 12, fontWeight: 700,
                    background: C_IRIDESCENT,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>+{r.starsToday}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <C_SectionTitle eyebrow="TRENDING" title="今日趨勢" />
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "0.5px solid rgba(255,255,255,0.10)",
            borderRadius: 18,
            padding: "12px 18px",
          }}>
            {data.trending.map((t, i) => (
              <div key={t.name} style={{
                padding: "9px 4px",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <span style={{
                    fontFamily: "var(--c-display)",
                    fontSize: 17, fontWeight: 700, color: "rgba(255,255,255,0.45)",
                    width: 22, letterSpacing: -0.4,
                  }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{
                    fontFamily: "var(--c-mono)", fontSize: 12.5,
                    color: "rgba(255,255,255,0.92)", fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{t.name}</span>
                </div>
                <span style={{
                  fontFamily: "var(--c-mono)", fontSize: 12, fontWeight: 700,
                  background: C_IRIDESCENT,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>{t.delta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: "relative", maxWidth: 1280, margin: "0 auto", padding: "40px 36px 60px",
        borderTop: "0.5px solid rgba(255,255,255,0.10)",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20,
      }}>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>
          每日清晨 07:00 更新 · 由 AI 摘要、人工把關
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: "rgba(255,255,255,0.65)" }}>
          <a style={{ color: "inherit", textDecoration: "none" }} href="#">關於</a>
          <a style={{ color: "inherit", textDecoration: "none" }} href="#">運作方式</a>
          <a style={{ color: "inherit", textDecoration: "none" }} href="#">RSS</a>
          <a style={{ color: "inherit", textDecoration: "none" }} href="#">API</a>
        </div>
      </footer>

      {open && <C_Detail pick={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function C_SectionTitle({ eyebrow, title }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: "var(--c-display)", fontWeight: 700,
        fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase",
        background: C_IRIDESCENT,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        marginBottom: 6,
      }}>{eyebrow}</div>
      <h2 style={{
        fontFamily: "var(--c-display)",
        fontSize: 28, lineHeight: 1.1, letterSpacing: -0.6,
        margin: 0, fontWeight: 700, color: "white",
      }}>{title}</h2>
    </div>
  );
}

window.V3App = V3App;
