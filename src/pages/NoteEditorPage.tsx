import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookLinear, BookmarkLinear, CloseCircleLinear, DisketteLinear, DownloadMinimalisticLinear, LinkCircleLinear, QuestionCircleLinear, TrashBinTrashLinear } from "../components/ui/appIcons";
import { BlockNoteEditor } from "../components/notes";
import { GlossaryPanel, type GlossaryDraft } from "../components/notes/GlossaryPanel";
import { BookmarksPanel } from "../components/notes/BookmarksPanel";
import { NoteHelpModal } from "../components/notes/NoteHelpModal";
import { RelatedLinksPanel } from "../components/notes/RelatedLinksPanel";
import { IconButton, notify } from "../components/ui";
import { confirmDelete } from "../components/ui/ConfirmDialog";
import { deleteNote, getNote, listNoteLinks, replaceNoteLinks, updateNote } from "../db/queries/notes";
import { listResolvedNoteRelations } from "../db/queries/entityRelations";
import { listGlossaryVocabularyForNote } from "../db/queries/glossary";
import { createBookmarkCollection, listBookmarkCollectionsForNote, saveBookmark } from "../db/queries/bookmarks";
import type { BookmarkCollection, BookmarkDraft, LinkedEntityType, Note, RelationCandidate, ResolvedEntityRelation } from "../types";
import { DEFAULT_NOTE_AUTOSAVE_SECONDS, getNoteAutosaveSeconds } from "../lib/notePreferences";
import { exportNoteToPdf } from "../lib/exportNotePdf";
import { useNoteEditorStatusStore } from "../stores/noteEditorStatusStore";

const linkKey = (type: LinkedEntityType, id: number) => `${type}:${id}`;
type UtilityPanel = "relations" | "glossary" | "bookmarks" | null;
const LAST_BOOKMARK_COLLECTION_KEY = "entropi-last-bookmark-collection";

function plainTextFromDocument(value: string | null): string {
  if (!value) return "";
  try {
    const walk = (item: unknown): string => {
      if (typeof item === "string") return item;
      if (Array.isArray(item)) return item.map(walk).join(" ");
      if (!item || typeof item !== "object") return "";
      const record = item as Record<string, unknown>;
      if (typeof record.text === "string") return record.text;
      return `${walk(record.content)} ${walk(record.children)}`;
    };
    return walk(JSON.parse(value)).replace(/\s+/g, " ").trim();
  } catch { return value; }
}

export function NoteEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const noteId = Number(useParams<{ id: string }>().id);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [resolvedRelations, setResolvedRelations] = useState<ResolvedEntityRelation[]>([]);
  const [saved, setSaved] = useState(false);
  const [autosaveSeconds, setAutosaveSeconds] = useState(DEFAULT_NOTE_AUTOSAVE_SECONDS);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [activePanel, setActivePanel] = useState<UtilityPanel>(() => {
    const stored = localStorage.getItem("entropi-note-utility-panel");
    if (stored === "relations" || stored === "glossary" || stored === "bookmarks") return stored;
    return localStorage.getItem("entropi-note-links-panel") === "hidden" ? null : "relations";
  });
  const [glossaryDraft, setGlossaryDraft] = useState<GlossaryDraft | null>(null);
  const [glossaryWords, setGlossaryWords] = useState<string[]>([]);
  const setTopBarStatus = useNoteEditorStatusStore((state) => state.setStatus);
  const clearTopBarStatus = useNoteEditorStatusStore((state) => state.clearStatus);
  const printAreaRef = useRef<HTMLElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.all([getNote(noteId), listNoteLinks(noteId), listResolvedNoteRelations(noteId)]).then(([noteRow, linkRows, relationRows]) => {
      if (!noteRow) return;
      setNote(noteRow); setTitle(noteRow.title); setContent(noteRow.content); setResolvedRelations(relationRows);
      setSelected(new Set(linkRows.map((link) => linkKey(link.entity_type, link.entity_id))));
      setSaved(true);
    });
  }, [noteId]);

  const reloadGlossaryWords = useCallback(() => {
    void listGlossaryVocabularyForNote(noteId).then(setGlossaryWords);
  }, [noteId]);

  useEffect(() => {
    reloadGlossaryWords();
  }, [reloadGlossaryWords]);

  function toggle(option: RelationCandidate) {
    const key = linkKey(option.type, option.id);
    setSelected((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
    setSaved(false);
  }
  const save = useCallback(async (showFeedback = false) => {
    if (!note || !title.trim()) return;
    await updateNote(note.id, { title: title.trim(), content, linked_entity_type: null, linked_entity_id: null });
    await replaceNoteLinks(note.id, [...selected].map((key) => { const [entity_type, entityId] = key.split(":"); return { entity_type: entity_type as LinkedEntityType, entity_id: Number(entityId) }; }));
    setNote((current) => (current ? { ...current, updated_at: new Date().toISOString() } : current));
    setSaved(true);
    if (showFeedback) notify.success(t("notes.savedToast"));
  }, [content, note, selected, t, title]);

  useEffect(() => {
    void getNoteAutosaveSeconds().then(setAutosaveSeconds);
  }, []);

  useEffect(() => {
    if (note) setTopBarStatus(note.id, saved);
  }, [note, saved, setTopBarStatus]);

  useEffect(() => () => clearTopBarStatus(noteId), [clearTopBarStatus, noteId]);

  useEffect(() => {
    if (!note || saved || !title.trim()) return;
    const timer = window.setTimeout(() => { void save(false); }, autosaveSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [autosaveSeconds, content, note, save, saved, selected, title]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  async function remove() { if (!note || !(await confirmDelete({ itemName: note.title }))) return; await deleteNote(note.id); notify.success(t("feedback.deleted")); navigate(-1); }

  function togglePanel(panel: Exclude<UtilityPanel, null>) {
    setActivePanel((current) => {
      const next = current === panel ? null : panel;
      localStorage.setItem("entropi-note-utility-panel", next ?? "hidden");
      return next;
    });
  }

  function openGlossaryLocation(targetNoteId: number, blockId: string | null) {
    const search = blockId && blockId !== "__note__" ? `?block=${encodeURIComponent(blockId)}&focus=${Date.now()}` : "";
    navigate(`/notes/${targetNoteId}${search}`);
  }

  const addSelectionToGlossary = useCallback((draft: GlossaryDraft) => {
    setGlossaryDraft(draft);
    setActivePanel("glossary");
    localStorage.setItem("entropi-note-utility-panel", "glossary");
  }, []);

  const saveBookmarkImmediately = useCallback(async (draft: BookmarkDraft) => {
    let collections = await listBookmarkCollectionsForNote(noteId);
    const rememberedId = Number(localStorage.getItem(LAST_BOOKMARK_COLLECTION_KEY));
    let collection: BookmarkCollection | undefined = collections.find((item) => item.id === rememberedId) ?? collections[0];
    if (!collection) {
      try {
        const id = await createBookmarkCollection({ name: t("notes.bookmarks.savedCollection"), icon: "🔖", color: "#8b5cf6", scope_folder_id: null });
        collections = await listBookmarkCollectionsForNote(noteId);
        collection = collections.find((item) => item.id === id);
      } catch {
        collections = await listBookmarkCollectionsForNote(noteId);
        collection = collections.find((item) => item.scope_folder_id === null);
      }
    }
    if (!collection) { notify.error(t("notes.bookmarks.saveError")); return; }
    await saveBookmark(collection.id, draft);
    localStorage.setItem(LAST_BOOKMARK_COLLECTION_KEY, String(collection.id));
    window.dispatchEvent(new CustomEvent("entropi-bookmarks-changed", { detail: { collectionId: collection.id } }));
    notify.success(t("notes.bookmarks.savedIn", { collection: collection.name }));
  }, [noteId, t]);

  const bookmarkBlock = useCallback((draft: Omit<BookmarkDraft, "noteId">) => {
    void saveBookmarkImmediately({ ...draft, noteId });
  }, [noteId, saveBookmarkImmediately]);

  const bookmarkNote = useCallback(() => {
    void saveBookmarkImmediately({
      noteId,
      blockId: "__note__",
      blockType: "note",
      blockSnapshot: content ?? "[]",
      plainText: plainTextFromDocument(content) || title,
    });
  }, [content, noteId, saveBookmarkImmediately, title]);

  const lastEditedLabel = t("notes.lastEdited", { date: new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(note?.updated_at ?? Date.now())) });

  async function exportPdf() {
    if (!editorContentRef.current || exportingPdf) return;
    setExportingPdf(true);
    notify.info(t("notes.exportInProgress"));
    try {
      const result = await exportNoteToPdf({ blocksJson: content, domRoot: editorContentRef.current, title: title.trim() || t("notes.untitled"), lastEditedLabel });
      if (result.saved) notify.success(t("notes.exportSuccess"));
    } catch (error) {
      console.error("[exportPdf] failed", error);
      notify.error(`${t("notes.exportError")}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setExportingPdf(false);
    }
  }

  if (!note) return null;
  return <div className="mx-auto max-w-7xl">
    <main ref={printAreaRef} id="entropi-print-area" className={`min-w-0 px-4 pb-20 pr-16 transition-[margin] duration-200 md:px-10 md:pr-20 ${activePanel ? "xl:mr-[21rem]" : ""}`}>
        <div className="entropi-print-band entropi-print-band-header hidden"><strong>{title || t("notes.untitled")}</strong><span>Entropi</span></div>
        <input value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false); }} onFocus={(event) => { if (title === t("notes.untitled")) event.currentTarget.select(); }} placeholder={t("notes.untitled")} className="entropi-print-title mb-8 w-full bg-transparent text-4xl font-bold tracking-tight text-text-primary outline-none placeholder:text-text-muted" autoFocus />
        <div ref={editorContentRef}>
          <BlockNoteEditor key={note.id} value={content} fullPage revealBlockId={searchParams.get("block")} revealKey={searchParams.get("focus")} acceptedWords={glossaryWords} onAddToGlossary={addSelectionToGlossary} onBookmarkBlock={bookmarkBlock} onChange={(value) => { setContent(value); setSaved(false); }} />
        </div>
        <div className="entropi-print-band entropi-print-band-footer hidden"><span>{lastEditedLabel}</span><span>Entropi</span></div>
    </main>
    {activePanel && <div className="entropi-note-relations-drawer fixed bottom-5 right-[5.25rem] top-[5.25rem] z-30 w-[min(19rem,calc(100vw-7rem))] overflow-hidden rounded-[1.75rem] border border-border bg-control/95 shadow-card backdrop-blur-2xl">
      {activePanel === "relations"
        ? <RelatedLinksPanel noteId={note.id} selected={selected} resolved={resolvedRelations} onToggle={toggle} onClear={() => { setSelected(new Set()); setSaved(false); }} onClose={() => togglePanel("relations")} />
        : activePanel === "glossary"
          ? <GlossaryPanel noteId={note.id} draft={glossaryDraft} onDraftConsumed={() => setGlossaryDraft(null)} onChanged={reloadGlossaryWords} onOpenLocation={openGlossaryLocation} onClose={() => togglePanel("glossary")} />
          : <BookmarksPanel noteId={note.id} onSaveNote={bookmarkNote} onOpenLocation={openGlossaryLocation} onClose={() => togglePanel("bookmarks")} />}
    </div>}
    <aside className="entropi-note-utility-rail fixed bottom-5 right-4 top-[5.25rem] z-40 flex w-12 flex-col items-center rounded-full border border-border bg-control/90 p-1.5 shadow-card backdrop-blur-2xl">
      <IconButton tooltipPlacement="left" label={t("notes.close")} icon={<CloseCircleLinear size={18} />} onClick={() => navigate(-1)} />
      <div className="my-2 h-px w-5 bg-border" />
      <IconButton tooltipPlacement="left" label={`${t("settings.lookup.save")} · ${saved ? t("notes.saved") : t("notes.unsaved")} · Ctrl+S`} icon={<DisketteLinear size={18} />} active={!saved} onClick={() => void save(true)} />
      <span aria-hidden="true" className={`mt-1 h-1.5 w-1.5 rounded-full ${saved ? "bg-success" : "bg-warning"}`} />
      <div className="flex-1" />
      <IconButton tooltipPlacement="left" label={activePanel === "relations" ? t("notes.links.hidePanel") : t("notes.links.showPanel")} icon={<LinkCircleLinear size={18} />} active={activePanel === "relations"} onClick={() => togglePanel("relations")} />
      <IconButton tooltipPlacement="left" label={activePanel === "glossary" ? t("notes.glossary.hidePanel") : t("notes.glossary.showPanel")} icon={<BookLinear size={18} />} active={activePanel === "glossary"} onClick={() => togglePanel("glossary")} />
      <IconButton tooltipPlacement="left" label={activePanel === "bookmarks" ? t("notes.bookmarks.hidePanel") : t("notes.bookmarks.showPanel")} icon={<BookmarkLinear size={18} />} active={activePanel === "bookmarks"} onClick={() => togglePanel("bookmarks")} />
      <IconButton tooltipPlacement="left" label={t("notes.help.tooltip")} icon={<QuestionCircleLinear size={18} />} onClick={() => setHelpOpen(true)} />
      <IconButton tooltipPlacement="left" label={t("notes.exportPdf")} icon={<DownloadMinimalisticLinear size={18} />} onClick={() => void exportPdf()} disabled={exportingPdf} />
      <div className="my-2 h-px w-5 bg-border" />
      <IconButton tooltipPlacement="left" label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={17} />} className="hover:!bg-danger/15 hover:!text-danger" onClick={() => void remove()} />
    </aside>
    <NoteHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
  </div>;
}
