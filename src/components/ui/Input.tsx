import { useRef, useState, type InputHTMLAttributes } from "react";
import { useIgnoredWords, useMisspelledRanges } from "../../hooks/useSpellcheck";
import { SpellcheckMenu, type SpellcheckMenuTarget } from "./SpellcheckMenu";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const FIELD_CLASS =
  "block w-full rounded-xl border border-border bg-control px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:bg-elevated focus:ring-2 focus:ring-accent";

export function Input({ className = "", spellCheck, value, type, ...rest }: InputProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSpellcheckable = spellCheck !== false && (type === undefined || type === "text");
  const text = isSpellcheckable && typeof value === "string" ? value : "";
  const ranges = useMisspelledRanges(text);
  const { ignoreWord } = useIgnoredWords();
  const [menu, setMenu] = useState<SpellcheckMenuTarget | null>(null);

  function handleContextMenu(event: React.MouseEvent<HTMLInputElement>) {
    if (ranges.length === 0) return;
    const pos = event.currentTarget.selectionStart ?? -1;
    const range = ranges.find((entry) => pos >= entry.start && pos <= entry.end);
    if (!range) return;
    event.preventDefault();
    setMenu({ word: range.word, x: event.clientX, y: event.clientY });
  }

  function syncScroll() {
    if (overlayRef.current && inputRef.current) {
      overlayRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }

  const segments: { text: string; misspelled: boolean }[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), misspelled: false });
    segments.push({ text: text.slice(range.start, range.end), misspelled: true });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), misspelled: false });

  // Always render the same wrapper + <input> tree shape regardless of `ranges.length` — branching
  // between a bare <input> and a <div><input>+overlay> here used to remount the input on every
  // keystroke that changed whether any word was misspelled, which threw away focus and native
  // input state (hence the "resizes and loses focus while typing" bug). Only the overlay itself
  // is conditional now; the input stays put.
  return (
    <div className={`entropi-spellcheck-overlay ${className}`}>
      <input
        ref={inputRef}
        className={FIELD_CLASS}
        spellCheck={false}
        value={value}
        type={type}
        onScroll={(event) => {
          syncScroll();
          rest.onScroll?.(event);
        }}
        onContextMenu={(event) => {
          handleContextMenu(event);
          rest.onContextMenu?.(event);
        }}
        {...rest}
      />
      {ranges.length > 0 && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className={`entropi-spellcheck-overlay-text entropi-spellcheck-overlay-text-single ${FIELD_CLASS}`}
        >
          {segments.map((segment, index) =>
            segment.misspelled ? (
              <span key={index} className="entropi-misspelled">
                {segment.text}
              </span>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </div>
      )}
      {menu && (
        <SpellcheckMenu
          word={menu.word}
          x={menu.x}
          y={menu.y}
          onIgnore={() => {
            void ignoreWord(menu.word);
            setMenu(null);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
