import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { findMisspelledRanges } from "../../lib/spellcheck";

type Speller = Parameters<typeof findMisspelledRanges>[1][number];

export const spellcheckPluginKey = new PluginKey<SpellcheckState>("entropi-spellcheck");

interface SpellcheckState {
  spellers: Speller[];
  ignoredWords: ReadonlySet<string>;
  decorations: DecorationSet;
}

interface SpellcheckMeta {
  spellers: Speller[];
  ignoredWords: ReadonlySet<string>;
}

function buildDecorations(doc: ProseMirrorNode, spellers: Speller[], ignoredWords: ReadonlySet<string>): DecorationSet {
  if (spellers.length === 0) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const range of findMisspelledRanges(node.text, spellers, ignoredWords)) {
      decorations.push(Decoration.inline(pos + range.start, pos + range.end, { class: "entropi-misspelled" }));
    }
  });
  return DecorationSet.create(doc, decorations);
}

/** Sets the active spellcheck dictionaries and ignore list for a BlockNote/Tiptap editor instance. */
export function setEditorSpellers(
  tiptapEditor: { state: any; view: any } | null | undefined,
  spellers: Speller[],
  ignoredWords: ReadonlySet<string>,
) {
  if (!tiptapEditor) return;
  const { state, view } = tiptapEditor;
  view.dispatch(state.tr.setMeta(spellcheckPluginKey, { spellers, ignoredWords } satisfies SpellcheckMeta));
}

export function createSpellcheckExtension() {
  return Extension.create({
    name: "entropiSpellcheck",
    addProseMirrorPlugins() {
      return [
        new Plugin<SpellcheckState>({
          key: spellcheckPluginKey,
          state: {
            init: () => ({ spellers: [], ignoredWords: new Set(), decorations: DecorationSet.empty }),
            apply(tr, old, _oldEditorState, newEditorState) {
              const meta = tr.getMeta(spellcheckPluginKey) as SpellcheckMeta | undefined;
              const spellers = meta?.spellers ?? old.spellers;
              const ignoredWords = meta?.ignoredWords ?? old.ignoredWords;
              if (meta || tr.docChanged) {
                return { spellers, ignoredWords, decorations: buildDecorations(newEditorState.doc, spellers, ignoredWords) };
              }
              return old;
            },
          },
          props: {
            decorations(state) {
              return spellcheckPluginKey.getState(state)?.decorations;
            },
          },
        }),
      ];
    },
  });
}
