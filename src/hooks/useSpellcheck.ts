import { useEffect, useState } from "react";
import { useSpellcheckStore } from "../stores/spellcheckStore";
import { loadSpellers, findMisspelledRanges, type MisspelledRange, type SpellcheckLanguage } from "../lib/spellcheck";

/** Selected spellcheck languages, persisted, plus the setting toggle. */
export function useSpellcheckLanguages() {
  const languages = useSpellcheckStore((s) => s.languages);
  const hydrated = useSpellcheckStore((s) => s.hydrated);
  const hydrate = useSpellcheckStore((s) => s.hydrate);
  const toggleLanguage = useSpellcheckStore((s) => s.toggleLanguage);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { languages, hydrated, toggleLanguage };
}

/** Loaded dictionary checkers for the currently active languages (empty while loading). */
export function useSpellcheckers() {
  const languages = useSpellcheckStore((s) => s.languages);
  const hydrated = useSpellcheckStore((s) => s.hydrated);
  const hydrate = useSpellcheckStore((s) => s.hydrate);
  const [spellers, setSpellers] = useState<Awaited<ReturnType<typeof loadSpellers>>>([]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const key = languages.join(",");
  useEffect(() => {
    let cancelled = false;
    if (!hydrated || languages.length === 0) {
      setSpellers([]);
      return;
    }
    void loadSpellers(languages).then((result) => {
      if (!cancelled) setSpellers(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, hydrated]);

  return spellers;
}

/** Words the user chose to never flag again, persisted, plus the action to add one. */
export function useIgnoredWords() {
  const ignoredWords = useSpellcheckStore((s) => s.ignoredWords);
  const hydrated = useSpellcheckStore((s) => s.hydrated);
  const hydrate = useSpellcheckStore((s) => s.hydrate);
  const ignoreWord = useSpellcheckStore((s) => s.ignoreWord);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return { ignoredWords, hydrated, ignoreWord };
}

/** Misspelled word ranges in `text` against the user's active spellcheck languages and ignore list. */
export function useMisspelledRanges(text: string): MisspelledRange[] {
  const spellers = useSpellcheckers();
  const ignoredWords = useSpellcheckStore((s) => s.ignoredWords);
  const [ranges, setRanges] = useState<MisspelledRange[]>([]);

  useEffect(() => {
    setRanges(findMisspelledRanges(text, spellers, ignoredWords));
  }, [text, spellers, ignoredWords]);

  return ranges;
}

export type { SpellcheckLanguage };
