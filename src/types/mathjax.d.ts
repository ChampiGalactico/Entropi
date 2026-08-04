declare module "mathjax/es5/tex-mml-svg.js?url" {
  const url: string;
  export default url;
}

interface Window {
  MathJax?: {
    startup?: { promise?: Promise<unknown> };
    typesetClear?: (elements?: HTMLElement[]) => void;
    typesetPromise?: (elements?: HTMLElement[]) => Promise<unknown>;
    tex2svgPromise?: (latex: string, options?: { display?: boolean }) => Promise<HTMLElement>;
    [key: string]: unknown;
  };
}
