// Variation B: Apple.com Product Page
// Scroll-driven full-bleed sections. Bento grids. Big stats moments.

const B_DATA = window.DIGEST_DATA;
const B_COLORS = window.MODEL_COLORS;

const B_HERO_GRAD = {
  Claude:  "radial-gradient(120% 100% at 20% 20%, #ffb088 0%, #ff5b30 35%, #c93f00 70%, #4a1500 100%)",
  Gemini:  "radial-gradient(120% 100% at 20% 20%, #8fbeff 0%, #2a6fdb 40%, #1d3fa6 75%, #061336 100%)",
  ChatGPT: "radial-gradient(120% 100% at 20% 20%, #67e8b9 0%, #137a5a 40%, #0a523c 75%, #021a10 100%)",
  Multi:   "linear-gradient(125deg, #ff6b35 0%, #ff2d92 28%, #8b5cf6 56%, #2a9df4 82%, #00d9ff 100%)",
};

function B_heroBg(pick) {
  return pick.models.length > 1 ? B_HERO_GRAD.Multi : B_HERO_GRAD[pick.models[0]] || B_HERO_GRAD.Claude;
}

function B_ModelChip({ model, dark }) {
  const c = B_COLORS[model] || B_COLORS.Claude;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 999,
      background: dark ? "rgba(255,255,255,0.18)" : c.bg,
      color: dark ? "#fff" : c.fg,
      fontSize: 12, fontWeight: 600, letterSpacing: 0.1,
      backdropFilter: dark ? "blur(20px) saturate(180%)" : "none",
      WebkitBackdropFilter: dark ? "blur(20px) saturate(180%)" : "none",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: dark ? "#fff" : c.fg }} />
      {model}
    </span>
  );
}

function B_FeatureSection({ pick, idx, total }) {
  const alt = idx % 2 === 1;
  return (
    <section style={{
      padding: "96px 56px 96px",
      background: alt ? "var(--b-bg)" : "var(--b-bg-soft)",
      borderTop: "0.5px solid var(--b-line)",
    }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <span style={{
            fontFamily: "var(--b-display)", fontWeight: 700,
            fontSize: 13, letterSpacing: 1.4, textTransform: "uppercase",
            color: "var(--b-accent)",
          }}>NO. {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <span style={{ width: 30, height: 1, background: "var(--b-line-strong)" }} />
          <span style={{
            fontFamily: "var(--b-display)", fontWeight: 600,
            fontSize: 12.5, letterSpacing: 0.8, textTransform: "uppercase",
            color: "var(--b-muted)",
          }}>{pick.type}</span>
        </div>

        {/* Hero */}
        <h2 style={{
          fontFamily: "var(--b-display)",
          fontSize: 64, lineHeight: 1.02, letterSpacing: -1.8,
          fontWeight: 700, margin: "0 0 24px",
          color: "var(--b-fg)",
          maxWidth: 920,
        }}>{pick.tagline}</h2>

        <p style={{
          fontFamily: "var(--b-display)",
          fontSize: 22, lineHeight: 1.45, letterSpacing: -0.3,
          color: "var(--b-fg-2)", margin: "0 0 40px",
          fontWeight: 400, maxWidth: 780,
        }}>{pick.summary}</p>

        {/* Pill bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 56, flexWrap: "wrap" }}>
          {pick.models.map(m => <B_ModelChip key={m} model={m} />)}
          {pick.stack.slice(0, 4).map(s => (
            <span key={s} style={{
              padding: "4px 12px", borderRadius: 999,
              background: "var(--b-pill-bg)", color: "var(--b-fg-2)",
              fontSize: 12, fontWeight: 500,
              fontFamily: "var(--b-mono)",
            }}>{s}</span>
          ))}
        </div>

        {/* Visual + Stats card */}
        <div style={{
          position: "relative",
          aspectRatio: "21 / 8",
          background: B_heroBg(pick),
          borderRadius: 28,
          padding: "44px 48px",
          color: "white", overflow: "hidden",
          marginBottom: 64,
          boxShadow: "var(--b-shadow-xl)",
        }}>
          <div style={{
            position: "absolute", right: -180, top: -120,
            width: 540, height: 540, borderRadius: 999,
            background: "radial-gradient(circle, rgba(255,255,255,0.35), transparent 60%)",
            filter: "blur(40px)",
          }} />
          <div style={{
            position: "absolute", left: -80, bottom: -120,
            width: 380, height: 380, borderRadius: 999,
            background: "radial-gradient(circle, rgba(0,0,0,0.4), transparent 60%)",
            filter: "blur(50px)",
          }} />
          <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "var(--b-mono)", fontSize: 13, opacity: 0.88, marginBottom: 6 }}>{pick.author}</div>
              <div style={{ fontFamily: "var(--b-display)", fontSize: 32, fontWeight: 700, letterSpacing: -0.6 }}>{pick.name}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, maxWidth: 720 }}>
              <B_StatInverse value={pick.stars.toLocaleString()} label="GitHub Stars" />
              <B_StatInverse value={`+${pick.starsToday}`} label="今日新增" highlight />
              <B_StatInverse value={pick.difficulty} label={`難度 ${pick.difficultyLevel}/3`} />
              <B_StatInverse value={pick.eta} label="預估上手" />
            </div>
          </div>
        </div>

        {/* Two col: Why + Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 48, marginBottom: 56 }}>
          <div>
            <h3 style={B_SECTION_H}>為什麼值得看</h3>
            <p style={{
              fontFamily: "var(--b-display)",
              fontSize: 21, lineHeight: 1.45, letterSpacing: -0.2,
              color: "var(--b-fg)", margin: 0, fontWeight: 500,
            }}>“{pick.whyValuable}”</p>
          </div>
          <div>
            <h3 style={B_SECTION_H}>理解步驟</h3>
            <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {pick.steps.map((s, i) => (
                <li key={i} style={{
                  display: "grid", gridTemplateColumns: "32px 1fr",
                  gap: 16, padding: "12px 0",
                  borderTop: "0.5px solid var(--b-line)",
                  borderBottom: i === pick.steps.length - 1 ? "0.5px solid var(--b-line)" : "none",
                  fontSize: 15.5, lineHeight: 1.55,
                  color: "var(--b-fg)", letterSpacing: -0.05,
                }}>
                  <span style={{
                    fontFamily: "var(--b-display)",
                    fontSize: 18, fontWeight: 700,
                    color: "var(--b-accent)",
                    letterSpacing: -0.3,
                  }}>{String(i + 1).padStart(2, "0")}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Code preview */}
        <div>
          <h3 style={B_SECTION_H}>一眼看程式</h3>
          <pre style={{
            margin: 0, padding: "22px 26px",
            background: "var(--b-code-bg)", color: "var(--b-code-fg)",
            borderRadius: 18, fontFamily: "var(--b-mono)", fontSize: 13.5, lineHeight: 1.75,
            overflow: "auto", border: "0.5px solid var(--b-line)",
          }}>{pick.codePreview}</pre>
        </div>

        <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
          <button style={B_PRIMARY_BTN}>在 GitHub 開啟 ›</button>
          <button style={B_GHOST_BTN}>加入收藏</button>
          <button style={B_GHOST_BTN}>分享</button>
        </div>
      </div>
    </section>
  );
}

function B_StatInverse({ value, label, highlight }) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--b-display)",
        fontSize: 30, fontWeight: 700, letterSpacing: -0.8,
        lineHeight: 1, color: highlight ? "#ffe6da" : "white",
      }}>{value}</div>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase",
        color: "rgba(255,255,255,0.75)", marginTop: 6,
      }}>{label}</div>
    </div>
  );
}

const B_SECTION_H = {
  fontFamily: "var(--b-display)",
  fontSize: 13, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase",
  color: "var(--b-muted)", margin: "0 0 14px",
};

const B_PRIMARY_BTN = {
  padding: "12px 24px", borderRadius: 999,
  background: "var(--b-accent)", color: "white",
  border: "none", cursor: "pointer",
  fontSize: 14, fontWeight: 600, letterSpacing: -0.1,
  fontFamily: "var(--b-sans)",
};

const B_GHOST_BTN = {
  padding: "12px 24px", borderRadius: 999,
  background: "transparent", color: "var(--b-fg)",
  border: "0.5px solid var(--b-line-strong)",
  cursor: "pointer",
  fontSize: 14, fontWeight: 500, letterSpacing: -0.1,
  fontFamily: "var(--b-sans)",
};

function V2App({ themeMode = "light", typeScale = 1 }) {
  const data = B_DATA;
  const totalNewStars = data.picks.reduce((s, p) => s + p.starsToday, 0);

  return (
    <div data-theme={themeMode} style={{
      fontSize: `${17 * typeScale}px`,
      width: "100%", height: "100%",
      background: "var(--b-bg)",
      color: "var(--b-fg)",
      fontFamily: "var(--b-sans)",
      overflow: "auto",
      letterSpacing: -0.01,
      position: "relative",
    }}>
      <style>{`
        [data-theme="light"] {
          --b-bg: #ffffff;
          --b-bg-soft: #f5f5f7;
          --b-bg-deep: #fbfbfd;
          --b-fg: #1d1d1f;
          --b-fg-2: #424245;
          --b-muted: #86868b;
          --b-line: rgba(0,0,0,0.08);
          --b-line-strong: rgba(0,0,0,0.22);
          --b-accent: #0071e3;
          --b-pill-bg: #f5f5f7;
          --b-code-bg: #1d1d1f;
          --b-code-fg: #f5f5f7;
          --b-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04);
          --b-shadow-xl: 0 4px 12px rgba(0,0,0,0.08), 0 28px 60px rgba(0,0,0,0.16);
        }
        [data-theme="dark"] {
          --b-bg: #000000;
          --b-bg-soft: #0a0a0a;
          --b-bg-deep: #1d1d1f;
          --b-fg: #f5f5f7;
          --b-fg-2: #d2d2d7;
          --b-muted: #86868b;
          --b-line: rgba(255,255,255,0.10);
          --b-line-strong: rgba(255,255,255,0.28);
          --b-accent: #2997ff;
          --b-pill-bg: #1d1d1f;
          --b-code-bg: #1d1d1f;
          --b-code-fg: #f5f5f7;
          --b-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3);
          --b-shadow-xl: 0 4px 12px rgba(0,0,0,0.5), 0 28px 60px rgba(0,0,0,0.6);
        }
      `}</style>

      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        background: "color-mix(in oklab, var(--b-bg) 72%, transparent)",
        borderBottom: "0.5px solid var(--b-line)",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--b-display)", fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>
            <span style={{ color: "var(--b-accent)" }}>◐</span>&nbsp;Digest
          </span>
          <nav style={{ display: "flex", gap: 26, fontSize: 12.5, color: "var(--b-fg-2)" }}>
            {data.picks.map((p, i) => (
              <a key={p.id} href={`#pick-${i}`} style={{
                color: "var(--b-fg-2)", textDecoration: "none", fontWeight: 500,
              }}>{String(i + 1).padStart(2, "0")}</a>
            ))}
            <a style={{ color: "var(--b-fg-2)", textDecoration: "none", fontWeight: 500 }} href="#trends">趨勢</a>
            <a style={{ color: "var(--b-fg-2)", textDecoration: "none", fontWeight: 500 }} href="#subscribe">訂閱</a>
          </nav>
          <button style={{
            padding: "6px 14px", borderRadius: 999,
            background: "var(--b-accent)", color: "white",
            border: "none", cursor: "pointer",
            fontSize: 12.5, fontWeight: 600,
            fontFamily: "var(--b-sans)",
          }}>+ 訂閱</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        position: "relative", padding: "120px 56px 96px",
        background: "var(--b-bg)",
        overflow: "hidden",
        textAlign: "center",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, var(--b-accent) 12%, transparent), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", maxWidth: 1080, margin: "0 auto" }}>
          <div style={{
            fontFamily: "var(--b-display)",
            fontSize: 14, fontWeight: 600, color: "var(--b-accent)",
            letterSpacing: 0.4, textTransform: "uppercase",
            marginBottom: 18,
          }}>{data.dateLabel} · {data.edition}</div>
          <h1 style={{
            fontFamily: "var(--b-display)",
            fontSize: 96, lineHeight: 0.96, letterSpacing: -3.2,
            margin: "0 auto 28px", fontWeight: 700,
            color: "var(--b-fg)",
            maxWidth: 980,
          }}>
            今日值得動手的<br />
            <span style={{
              background: "linear-gradient(120deg, #ff6b35 0%, #ff2d92 28%, #8b5cf6 56%, #2a9df4 84%, #00d9ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>AI 開源專案</span>
          </h1>
          <p style={{
            fontFamily: "var(--b-display)",
            fontSize: 24, lineHeight: 1.4, letterSpacing: -0.3,
            color: "var(--b-fg-2)", margin: "0 auto 44px",
            maxWidth: 720, fontWeight: 400,
          }}>
            每天清晨從 GitHub 撈一輪 Gemini、ChatGPT、Claude 相關的 repo，挑出有價值的、整理成你能在通勤時讀完的日報。
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 64 }}>
            <button style={B_PRIMARY_BTN}>看今天的精選 ›</button>
            <button style={B_GHOST_BTN}>了解運作方式</button>
          </div>

          {/* Hero stats strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1,
            background: "var(--b-line)",
            borderRadius: 18, overflow: "hidden",
            border: "0.5px solid var(--b-line)",
          }}>
            {[
              { value: data.totalScanned.toLocaleString(), label: "今日掃描 Repos" },
              { value: data.curated, label: "精選篇數" },
              { value: `+${totalNewStars.toLocaleString()}`, label: "今日新增星數" },
              { value: "07:00", label: "每日更新時間" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "26px 22px", background: "var(--b-bg-soft)" }}>
                <div style={{
                  fontFamily: "var(--b-display)",
                  fontSize: 40, fontWeight: 700, letterSpacing: -1.2,
                  color: "var(--b-fg)", lineHeight: 1,
                }}>{s.value}</div>
                <div style={{
                  fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase",
                  color: "var(--b-muted)", marginTop: 10,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pick sections */}
      {data.picks.map((p, i) => (
        <div key={p.id} id={`pick-${i}`}>
          <B_FeatureSection pick={p} idx={i} total={data.picks.length} />
        </div>
      ))}

      {/* Trends section */}
      <section id="trends" style={{
        padding: "96px 56px",
        background: "var(--b-bg)",
        borderTop: "0.5px solid var(--b-line)",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{
            fontFamily: "var(--b-display)", fontWeight: 700,
            fontSize: 13, letterSpacing: 1.4, textTransform: "uppercase",
            color: "var(--b-accent)", marginBottom: 14,
          }}>今日趨勢 · TRENDING</div>
          <h2 style={{
            fontFamily: "var(--b-display)",
            fontSize: 56, lineHeight: 1.02, letterSpacing: -1.4,
            fontWeight: 700, margin: "0 0 28px",
          }}>星數成長最快的 repo</h2>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12,
          }}>
            {data.trending.slice(0, 6).map((t, i) => (
              <div key={t.name} style={{
                padding: "22px 24px",
                background: "var(--b-bg-soft)",
                borderRadius: 16,
                border: "0.5px solid var(--b-line)",
                display: "grid", gridTemplateColumns: "36px 1fr auto", alignItems: "center", gap: 16,
              }}>
                <span style={{
                  fontFamily: "var(--b-display)",
                  fontSize: 28, fontWeight: 700, letterSpacing: -0.8,
                  color: "var(--b-muted)", lineHeight: 1,
                }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontFamily: "var(--b-mono)", fontSize: 14, fontWeight: 600, color: "var(--b-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <span style={{ fontFamily: "var(--b-display)", fontSize: 18, fontWeight: 700, color: "var(--b-accent)", letterSpacing: -0.3 }}>{t.delta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newly released */}
      <section style={{
        padding: "96px 56px",
        background: "var(--b-bg-soft)",
        borderTop: "0.5px solid var(--b-line)",
      }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{
            fontFamily: "var(--b-display)", fontWeight: 700,
            fontSize: 13, letterSpacing: 1.4, textTransform: "uppercase",
            color: "var(--b-accent)", marginBottom: 14,
          }}>新發布 · FRESH</div>
          <h2 style={{
            fontFamily: "var(--b-display)",
            fontSize: 56, lineHeight: 1.02, letterSpacing: -1.4,
            fontWeight: 700, margin: "0 0 36px",
          }}>剛從 0 star 起步的<br />新 repo</h2>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16,
          }}>
            {data.newlyReleased.map(r => (
              <div key={r.name} style={{
                padding: "26px 28px",
                background: "var(--b-bg)",
                borderRadius: 20,
                border: "0.5px solid var(--b-line)",
                boxShadow: "var(--b-shadow)",
              }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {r.models.map(m => <B_ModelChip key={m} model={m} />)}
                </div>
                <div style={{ fontFamily: "var(--b-mono)", fontSize: 13, color: "var(--b-muted)", marginBottom: 4 }}>{r.author}</div>
                <div style={{ fontFamily: "var(--b-mono)", fontSize: 17, fontWeight: 600, color: "var(--b-fg)", marginBottom: 8, letterSpacing: -0.2 }}>{r.name}</div>
                <p style={{ margin: 0, fontSize: 15, color: "var(--b-fg-2)", lineHeight: 1.5 }}>{r.tagline}</p>
                <div style={{ marginTop: 16, fontSize: 13, color: "var(--b-accent)", fontWeight: 600, fontFamily: "var(--b-mono)" }}>
                  +{r.starsToday} stars today
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe footer */}
      <section id="subscribe" style={{
        padding: "120px 56px",
        background: "var(--b-bg)",
        borderTop: "0.5px solid var(--b-line)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "var(--b-display)",
            fontSize: 64, lineHeight: 1.0, letterSpacing: -1.8,
            fontWeight: 700, margin: "0 0 20px",
          }}>每天清晨，<br />送到你信箱。</h2>
          <p style={{
            fontFamily: "var(--b-display)",
            fontSize: 21, lineHeight: 1.45, letterSpacing: -0.2,
            color: "var(--b-fg-2)", margin: "0 0 36px",
            fontWeight: 400,
          }}>七點準時。<br />一封信、一份咖啡時間能讀完的精選。</p>
          <div style={{
            display: "flex", gap: 8, maxWidth: 440, margin: "0 auto",
            padding: 6, borderRadius: 999,
            background: "var(--b-bg-soft)",
            border: "0.5px solid var(--b-line)",
          }}>
            <input
              type="email"
              placeholder="你的 email"
              style={{
                flex: 1, border: "none", background: "transparent", outline: "none",
                padding: "10px 18px",
                fontSize: 15, color: "var(--b-fg)",
                fontFamily: "var(--b-sans)",
              }}
            />
            <button style={{
              padding: "10px 22px", borderRadius: 999,
              background: "var(--b-fg)", color: "var(--b-bg)",
              border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 600,
              fontFamily: "var(--b-sans)",
            }}>訂閱</button>
          </div>
          <div style={{ fontSize: 12, color: "var(--b-muted)", marginTop: 14, letterSpacing: 0.1 }}>
            免費 · 隨時退訂 · 不轉售你的 email
          </div>
        </div>
      </section>
    </div>
  );
}

window.V2App = V2App;
