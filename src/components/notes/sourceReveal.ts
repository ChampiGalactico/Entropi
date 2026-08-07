import { useEffect, useRef } from "react";

const SOURCE_REVEAL_EVENT = "entropi-note-focus-source";

// Custom blocks that render a preview over raw source (math formulas, mermaid diagrams) enter
// edit mode as soon as the caret is navigated onto them — not just on click — mirroring Obsidian's
// live-preview. BlockNoteEditor dispatches this whenever the active block changes to one of these
// types; each block's own component listens for its own id and reveals itself.
export function dispatchSourceReveal(blockId: string) {
  document.dispatchEvent(new CustomEvent(SOURCE_REVEAL_EVENT, { detail: { blockId } }));
}

export function useAutoRevealSource(blockId: string, reveal: () => void) {
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  useEffect(() => {
    function onReveal(event: Event) {
      if ((event as CustomEvent).detail?.blockId === blockId) revealRef.current();
    }
    document.addEventListener(SOURCE_REVEAL_EVENT, onReveal);
    return () => document.removeEventListener(SOURCE_REVEAL_EVENT, onReveal);
  }, [blockId]);
}
