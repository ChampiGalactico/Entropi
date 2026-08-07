import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs, defaultInlineContentSpecs } from "@blocknote/core";
import { DiagramBlock } from "./DiagramBlock";
import { DrawingBlock } from "./DrawingBlock";
import { InlineMath, MathBlock } from "./MathBlocks";

const languages = {
  javascript: { name: "JavaScript", aliases: ["js", "jsx"] },
  typescript: { name: "TypeScript", aliases: ["ts", "tsx"] },
  python: { name: "Python", aliases: ["py"] },
  rust: { name: "Rust", aliases: ["rs"] },
  java: { name: "Java" },
  c: { name: "C" },
  cpp: { name: "C++", aliases: ["c++"] },
  csharp: { name: "C#", aliases: ["cs"] },
  html: { name: "HTML" },
  css: { name: "CSS" },
  json: { name: "JSON" },
  sql: { name: "SQL" },
  bash: { name: "Bash", aliases: ["sh", "shell"] },
  text: { name: "Plain text", aliases: ["txt", "plaintext"] },
};

function tokenizeLine(line: string) {
  const tokens: Array<{ content: string; color: string }> = [];
  const matcher = /(\/\/.*$|#.*$|\/\*.*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|class|interface|type|import|export|from|return|if|else|for|while|switch|case|break|continue|new|async|await|try|catch|throw|public|private|protected|static|fn|struct|enum|impl|def|lambda|True|False|None|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE|JOIN|AND|OR|NULL)\b)|(\b\d+(?:\.\d+)?\b)|(<\/?[A-Za-z][^>]*>)|([A-Za-z_$][\w$]*(?=\s*\())/g;
  let cursor = 0; let match: RegExpExecArray | null;
  while ((match = matcher.exec(line))) {
    if (match.index > cursor) tokens.push({ content: line.slice(cursor, match.index), color: "var(--text-primary)" });
    const color = match[1] ? "var(--text-muted)" : match[2] ? "var(--accent-secondary)" : match[3] ? "var(--accent)" : match[4] ? "var(--warning)" : match[5] ? "var(--danger)" : "var(--info)";
    tokens.push({ content: match[0], color }); cursor = match.index + match[0].length;
  }
  if (cursor < line.length) tokens.push({ content: line.slice(cursor), color: "var(--text-primary)" });
  return tokens;
}

const localHighlighter = {
  getLoadedLanguages: () => Object.keys(languages),
  loadLanguage: async () => undefined,
  getLoadedThemes: () => ["entropi"],
  loadTheme: async () => undefined,
  codeToTokens: (code: string) => ({
    tokens: code.split("\n").map(tokenizeLine),
    fg: "var(--text-primary)", bg: "transparent",
    rootStyle: "--prosemirror-highlight:var(--text-primary);--prosemirror-highlight-bg:color-mix(in srgb,var(--bg-control) 88%,transparent)",
  }),
};

export const noteSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec({ supportedLanguages: languages, defaultLanguage: "javascript", createHighlighter: async () => localHighlighter as any }),
    drawing: DrawingBlock,
    math: MathBlock,
    diagram: DiagramBlock,
  },
  inlineContentSpecs: { ...defaultInlineContentSpecs, inlineMath: InlineMath },
});
