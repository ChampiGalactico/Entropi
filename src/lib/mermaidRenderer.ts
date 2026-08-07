let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
let initializedTheme: "light" | "dark" | null = null;

async function loadMermaid(theme: "light" | "dark") {
  if (!mermaidPromise) mermaidPromise = import("mermaid").then((module) => module.default);
  const mermaid = await mermaidPromise;
  if (initializedTheme !== theme) {
    mermaid.initialize({ startOnLoad: false, theme: theme === "dark" ? "dark" : "default", securityLevel: "strict", fontFamily: "inherit" });
    initializedTheme = theme;
  }
  return mermaid;
}

let renderCounter = 0;

export async function renderMermaid(code: string, theme: "light" | "dark"): Promise<string> {
  const mermaid = await loadMermaid(theme);
  renderCounter += 1;
  const id = `entropi-mermaid-${renderCounter}`;
  const { svg } = await mermaid.render(id, code.trim() || " ");
  return svg;
}
