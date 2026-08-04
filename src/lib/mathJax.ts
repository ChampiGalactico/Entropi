let loadPromise: Promise<void> | null = null;

export function ensureMathJax(): Promise<void> {
  if (window.MathJax?.typesetPromise) return Promise.resolve();
  if (loadPromise) return loadPromise;

  window.MathJax = {
    tex: {
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
      displayMath: [["$$", "$$"], ["\\[", "\\]"]],
      processEscapes: true,
    },
    svg: { fontCache: "local", scale: 1, displayAlign: "center" },
  };

  loadPromise = import("mathjax/tex-mml-svg.js")
    .then(async () => {
      await window.MathJax?.startup?.promise;
    })
    .then(() => undefined);
  return loadPromise;
}
