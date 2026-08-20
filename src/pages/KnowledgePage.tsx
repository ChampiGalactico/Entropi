import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookmarkLinear, BookLinear } from "../components/ui/appIcons";
import { BookmarksPanel } from "../components/notes/BookmarksPanel";
import { GlossaryPanel } from "../components/notes/GlossaryPanel";

type KnowledgeTab = "bookmarks" | "glossary";

export function KnowledgePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<KnowledgeTab>("bookmarks");
  const openLocation = (noteId: number, blockId: string | null) => navigate(`/notes/${noteId}${blockId && blockId !== "__note__" ? `?block=${encodeURIComponent(blockId)}` : ""}`);

  return <div className="mx-auto flex h-full max-w-5xl flex-col">
    <div><h1 className="text-2xl font-bold text-text-primary">{t("knowledge.title")}</h1><p className="mt-1 text-sm text-text-muted">{t("knowledge.subtitle")}</p></div>
    <div className="mt-5 flex w-fit rounded-2xl bg-control p-1">
      <button type="button" onClick={() => setTab("bookmarks")} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${tab === "bookmarks" ? "bg-elevated text-text-primary shadow-sm" : "text-text-muted"}`}><BookmarkLinear size={16} />{t("notes.bookmarks.title")}</button>
      <button type="button" onClick={() => setTab("glossary")} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${tab === "glossary" ? "bg-elevated text-text-primary shadow-sm" : "text-text-muted"}`}><BookLinear size={16} />{t("notes.glossary.title")}</button>
    </div>
    <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-border bg-control/75 shadow-card">
      {tab === "bookmarks"
        ? <BookmarksPanel noteId={0} standalone onOpenLocation={openLocation} onClose={() => undefined} />
        : <GlossaryPanel noteId={0} standalone onOpenLocation={openLocation} onClose={() => undefined} />}
    </div>
  </div>;
}
