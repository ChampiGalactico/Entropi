import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Combobox } from "../ui/Combobox";

interface CodeLanguageSelectsProps {
  editorRootRef: RefObject<HTMLDivElement | null>;
}

function CodeLanguageCombobox({ select }: { select: HTMLSelectElement }) {
  const [value, setValue] = useState(select.value);
  const options = Array.from(select.options).map((option) => ({
    value: option.value,
    label: option.text,
  }));

  useEffect(() => {
    setValue(select.value);
  }, [select]);

  function changeLanguage(language: string) {
    setValue(language);
    select.value = language;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  return (
    <div className="entropi-code-language-select">
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
    }

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [editorRootRef]);

  return <>{selects.map((select, index) => (
    select.parentElement
      ? createPortal(<CodeLanguageCombobox select={select} />, select.parentElement, `code-language-${index}`)
      : null
  ))}</>;
}
