import { useRef, type TextareaHTMLAttributes } from "react";
import { useMisspelledRanges } from "../../hooks/useSpellcheck";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const FIELD_CLASS =
  "block w-full resize-none rounded-xl border border-border bg-control px-4 py-2 text-sm leading-5 text-text-primary placeholder:text-text-muted outline-none transition-colors focus:bg-elevated focus:ring-2 focus:ring-accent";

export function Textarea({ className = "", spellCheck, value, ...rest }: TextareaProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const text = typeof value === "string" ? value : "";
  const ranges = useMisspelledRanges(spellCheck === false ? "" : text);

  function syncScroll() {
    if (overlayRef.current && textareaRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
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

  return (
    <div className={`entropi-spellcheck-overlay ${className}`}>
      <textarea
        ref={textareaRef}
        className={FIELD_CLASS}
        spellCheck={false}
        value={value}
        onScroll={(event) => {
          syncScroll();
          rest.onScroll?.(event);
        }}
        {...rest}
      />
      {ranges.length > 0 && (
        <div ref={overlayRef} aria-hidden="true" className={`entropi-spellcheck-overlay-text ${FIELD_CLASS}`}>
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
    </div>
  );
}
