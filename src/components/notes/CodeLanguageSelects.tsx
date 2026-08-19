import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Combobox } from "../ui/Combobox";

interface CodeLanguageSelectsProps {
  editorRootRef: RefObject<HTMLDivElement | null>;
}

function CodeLanguageCombobox({ select, layoutVersion }: { select: HTMLSelectElement; layoutVersion: number }) {
  const [value, setValue] = useState(select.value);
  const [position, setPosition] = useState({ left: 0, top: 0, visible: false });
  const options = Array.from(select.options).map((option) => ({
    value: option.value,
    label: option.text,
  }));

  useEffect(() => {
    setValue(select.value);
  }, [select]);

  useLayoutEffect(() => {
    function place() {
      const host = select.parentElement;
      if (!host?.isConnected) { setPosition((current) => ({ ...current, visible: false })); return; }
      const rect = host.getBoundingClientRect();
      setPosition({ left: rect.left + 12, top: rect.top + 10, visible: rect.width > 0 && rect.height > 0 });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [layoutVersion, select]);

  function changeLanguage(language: string) {
    setValue(language);
    select.value = language;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div className="entropi-code-language-select" style={{ position: "fixed", zIndex: 160, left: position.left, top: position.top, visibility: position.visible ? "visible" : "hidden" }}>
      <Combobox compact options={options} value={value} onChange={changeLanguage} />
    </div>
  );
}

/**
 * BlockNote creates a native language <select> inside every code block. Keep that
 * element as the source of truth, but drive it through Entropi's Combobox so the
 * control and popup match the rest of the application on every platform.
 */
export function CodeLanguageSelects({ editorRootRef }: CodeLanguageSelectsProps) {
  const [selects, setSelects] = useState<HTMLSelectElement[]>([]);
  const [layoutVersion, setLayoutVersion] = useState(0);

  useEffect(() => {
    const editorRoot = editorRootRef.current;
    if (!editorRoot) return;
    const root: HTMLDivElement = editorRoot;

    function scan() {
      const next = Array.from(root.querySelectorAll<HTMLSelectElement>(
        '.bn-block-content[data-content-type="codeBlock"] > div > select',
      ));
      setSelects((current) => (
        current.length === next.length && current.every((select, index) => select === next[index])
          ? current
          : next
      ));
      setLayoutVersion((version) => version + 1);
    }

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [editorRootRef]);

  return <>{selects.map((select, index) => (
    select.isConnected
      ? createPortal(<CodeLanguageCombobox select={select} layoutVersion={layoutVersion} />, document.body, `code-language-${index}`)
      : null
  ))}</>;
}
