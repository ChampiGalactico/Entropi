import { useMemo } from "react";
import { MantineProvider } from "@mantine/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { en, es } from "@blocknote/core/locales";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import { noteSchema } from "./noteSchema";

export function BookmarkBlockPreview({ snapshot, fallback }: { snapshot: string; fallback: string }) {
  const { mode } = useTheme();
  const { i18n } = useTranslation();
  const block = useMemo(() => {
    try { return JSON.parse(snapshot); } catch { return { type: "paragraph", content: fallback }; }
  }, [fallback, snapshot]);
  const editor = useCreateBlockNote({
    schema: noteSchema,
    initialContent: [block] as any,
    dictionary: i18n.resolvedLanguage?.startsWith("es") ? es : en,
  }, [snapshot, i18n.resolvedLanguage]);

  return <div className="entropi-bookmark-preview pointer-events-none overflow-hidden rounded-xl bg-surface-hover/45 px-1 py-2">
    <MantineProvider forceColorScheme={mode}>
      <BlockNoteView editor={editor} theme={mode} editable={false} formattingToolbar={false} sideMenu={false} slashMenu={false} />
    </MantineProvider>
  </div>;
}
