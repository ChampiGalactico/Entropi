import { useRef, type InputHTMLAttributes } from "react";
import { useMisspelledRanges } from "../../hooks/useSpellcheck";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const FIELD_CLASS =
  "block w-full rounded-xl border border-border bg-control px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:bg-elevated focus:ring-2 focus:ring-accent";

export function Input({ className = "", spellCheck, value, type, ...rest }: InputProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSpellcheckable = spellCheck !== false && (type === undefined || type === "text");
  const text = isSpellcheckable && typeof value === "string" ? value : "";
  const ranges = useMisspelledRanges(text);

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

  if (ranges.length === 0) {
    return <input ref={inputRef} className={`${FIELD_CLASS} ${className}`} spellCheck={false} value={value} type={type} {...rest} />;
  }

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
        {...rest}
      />
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
    </div>
  );
}
