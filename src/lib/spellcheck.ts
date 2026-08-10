import nspell from "nspell";

export const SPELLCHECK_LANGUAGES = ["en", "es", "de"] as const;
export type SpellcheckLanguage = (typeof SPELLCHECK_LANGUAGES)[number];

export function isSpellcheckLanguage(value: string): value is SpellcheckLanguage {
  return (SPELLCHECK_LANGUAGES as readonly string[]).includes(value);
}

type Speller = ReturnType<typeof nspell>;

const spellerPromises = new Map<SpellcheckLanguage, Promise<Speller>>();

async function loadSpeller(lang: SpellcheckLanguage): Promise<Speller> {
  const [aff, dic] = await Promise.all([
    fetch(`/dictionaries/${lang}.aff`).then((res) => res.text()),
    fetch(`/dictionaries/${lang}.dic`).then((res) => res.text()),
  ]);
  return nspell({ aff, dic });
}

function getSpeller(lang: SpellcheckLanguage): Promise<Speller> {
  let promise = spellerPromises.get(lang);
  if (!promise) {
    promise = loadSpeller(lang);
    spellerPromises.set(lang, promise);
  }
  return promise;
}

export function loadSpellers(languages: SpellcheckLanguage[]): Promise<Speller[]> {
  return Promise.all(languages.map(getSpeller));
}

// Matches runs of letters (any script) plus apostrophes/hyphens inside a word,
// so contractions ("don't") and compounds ("mother-in-law") stay a single token.
const WORD_PATTERN = /[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*/gu;

export interface MisspelledRange {
  start: number;
  end: number;
  word: string;
}

export function findMisspelledRanges(
  text: string,
  spellers: Speller[],
  ignoredWords?: ReadonlySet<string>,
): MisspelledRange[] {
  if (spellers.length === 0 || !text) return [];
  const ranges: MisspelledRange[] = [];
  WORD_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WORD_PATTERN.exec(text))) {
    const word = match[0];
    if (word.length < 2) continue;
    if (ignoredWords?.has(word.toLowerCase())) continue;
    const known = spellers.some((speller) => speller.correct(word));
    if (!known) ranges.push({ start: match.index, end: match.index + word.length, word });
  }
  return ranges;
}
