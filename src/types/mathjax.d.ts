declare module "mathjax/tex-mml-svg.js";

interface Window {
  MathJax?: {
    startup?: { promise?: Promise<unknown> };
    typesetClear?: (elements?: HTMLElement[]) => void;
    typesetPromise?: (elements?: HTMLElement[]) => Promise<unknown>;
    [key: string]: unknown;
  };
}
