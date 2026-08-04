import mathJaxUrl from "mathjax/es5/tex-mml-svg.js?url";

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

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = "entropi-mathjax";
    script.src = mathJaxUrl;
    script.async = true;
    script.onload = () => {
      void Promise.resolve(window.MathJax?.startup?.promise).then(() => resolve(), reject);
    };
    script.onerror = () => reject(new Error("MathJax could not be loaded"));
    document.head.appendChild(script);
  });
  return loadPromise;
}
