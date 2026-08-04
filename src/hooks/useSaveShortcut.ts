import { useEffect } from "react";

export function useSaveShortcut(onSave: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function handleSave(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      onSave();
    }
    window.addEventListener("keydown", handleSave);
    return () => window.removeEventListener("keydown", handleSave);
  }, [enabled, onSave]);
}
