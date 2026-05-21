// UI constants — colours and glyphs used across all views.
// No mock repo data here; all content comes from the GitHub API.

window.MODEL_COLORS = {
  Claude:  { fg: "#C96442", bg: "rgba(201, 100, 66, 0.10)", ring: "rgba(201,100,66,0.35)" },
  Gemini:  { fg: "#3B6FD8", bg: "rgba(59, 111, 216, 0.10)", ring: "rgba(59,111,216,0.32)" },
  ChatGPT: { fg: "#137a5a", bg: "rgba(19, 122, 90, 0.10)",  ring: "rgba(19,122,90,0.32)"  },
};

window.TYPE_GLYPHS = {
  Agent: "◆",
  RAG:   "▲",
  Tool:  "●",
  Demo:  "■",
};
