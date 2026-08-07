import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { findMisspelledRanges } from "../../lib/spellcheck";

type Speller = Parameters<typeof findMisspelledRanges>[1][number];

export const spellcheckPluginKey = new PluginKey<SpellcheckState>("entropi-spellcheck");

interface SpellcheckState {
  spellers: Speller[];
  decorations: DecorationSet;
}

function buildDecorations(doc: ProseMirrorNode, spellers: Speller[]): DecorationSet {
  if (spellers.length === 0) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const range of findMisspelledRanges(node.text, spellers)) {
      decorations.push(Decoration.inline(pos + range.start, pos + range.end, { class: "entropi-misspelled" }));
    }
  });
  return DecorationSet.create(doc, decorations);
}

/** Sets the active spellcheck dictionaries for a BlockNote/Tiptap editor instance. */
export function setEditorSpellers(tiptapEditor: { state: any; view: any } | null | undefined, spellers: Speller[]) {
  if (!tiptapEditor) return;
  const { state, view } = tiptapEditor;
  view.dispatch(state.tr.setMeta(spellcheckPluginKey, spellers));
}

export function createSpellcheckExtension() {
  return Extension.create({
    name: "entropiSpellcheck",
    addProseMirrorPlugins() {
      return [
        new Plugin<SpellcheckState>({
          key: spellcheckPluginKey,
          state: {
            init: () => ({ spellers: [], decorations: DecorationSet.empty }),
            apply(tr, old, _oldEditorState, newEditorState) {
              const metaSpellers = tr.getMeta(spellcheckPluginKey) as Speller[] | undefined;
              const spellers = metaSpellers ?? old.spellers;
              if (metaSpellers || tr.docChanged) {
                return { spellers, decorations: buildDecorations(newEditorState.doc, spellers) };
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
