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

function matchSuggestionCase(suggestion: string, original: string): string {
  if (original === original.toLocaleUpperCase() && original !== original.toLocaleLowerCase()) {
    return suggestion.toLocaleUpperCase();
  }
  const first = original.charAt(0);
  if (first && first === first.toLocaleUpperCase() && first !== first.toLocaleLowerCase()) {
    return suggestion.charAt(0).toLocaleUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

const DIACRITIC_VARIANTS: Readonly<Record<string, readonly string[]>> = {
  a: ["á"],
  e: ["é"],
  i: ["í"],
  o: ["ó"],
  u: ["ú", "ü"],
  n: ["ñ"],
};

function validDiacriticSuggestions(word: string, spellers: Speller[], limit: number): string[] {
  const seed = word.toLocaleLowerCase();
  const visited = new Set([seed]);
  let frontier = [seed];
  const valid: string[] = [];

  // One missing accent covers the common cases; a second pass also handles compounds without
  // allowing the number of generated candidates to grow without bound.
  for (let depth = 0; depth < 2 && frontier.length > 0 && visited.size < 256; depth += 1) {
    const next: string[] = [];
    for (const current of frontier) {
      for (let index = 0; index < current.length && visited.size < 256; index += 1) {
        for (const replacement of DIACRITIC_VARIANTS[current[index]] ?? []) {
          const candidate = current.slice(0, index) + replacement + current.slice(index + 1);
          if (visited.has(candidate)) continue;
          visited.add(candidate);
          next.push(candidate);
          if (spellers.some((speller) => speller.correct(candidate))) {
            valid.push(matchSuggestionCase(candidate, word));
            if (valid.length >= limit) return valid;
          }
        }
      }
    }
    frontier = next;
  }
  return valid;
}

export function getSpellingSuggestions(word: string, spellers: Speller[], limit = 5): string[] {
  const suggestions = validDiacriticSuggestions(word, spellers, limit);
  const seen = new Set<string>();
  for (const suggestion of suggestions) seen.add(suggestion.toLocaleLowerCase());
  if (suggestions.length >= limit) return suggestions;
  for (const speller of spellers) {
    for (const raw of speller.suggest(word)) {
      const suggestion = matchSuggestionCase(raw, word);
      const key = suggestion.toLocaleLowerCase();
      if (!suggestion || key === word.toLocaleLowerCase() || seen.has(key)) continue;
      seen.add(key);
      suggestions.push(suggestion);
      if (suggestions.length >= limit) return suggestions;
    }
  }
  return suggestions;
}
