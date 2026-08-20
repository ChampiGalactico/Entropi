import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AddCircleLinear,
  AltArrowLeftLinear,
  AltArrowRightLinear,
  BookmarkLinear,
  MagniferLinear,
  PenLinear,
  TrashBinTrashLinear,
} from "../ui/appIcons";
import { Button, Combobox, IconButton, Input, notify } from "../ui";
import { confirmDelete } from "../ui/ConfirmDialog";
import {
  createBookmarkCollection,
  deleteBookmark,
  deleteBookmarkCollection,
  listBookmarkCollectionsForNote,
  listBookmarkScopeOptions,
  listBookmarks,
  saveBookmark,
  updateBookmarkCollection,
} from "../../db/queries/bookmarks";
import type { BookmarkCollection, BookmarkCollectionInput, BookmarkDraft, BookmarkScopeOption, NoteBookmark } from "../../types";
import { BookmarkBlockPreview } from "./BookmarkBlockPreview";

const COLORS = ["#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#3b82f6"];
const LAST_BOOKMARK_COLLECTION_KEY = "entropi-last-bookmark-collection";

export function BookmarksPanel({ noteId, draft, onDraftConsumed, onSaveNote, onOpenLocation, onClose, standalone = false }: {
  noteId: number;
  draft?: BookmarkDraft | null;
  onDraftConsumed?: () => void;
  onSaveNote?: () => void;
  onOpenLocation: (noteId: number, blockId: string | null) => void;
  onClose: () => void;
  standalone?: boolean;
}) {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [scopes, setScopes] = useState<BookmarkScopeOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<NoteBookmark[]>([]);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<BookmarkDraft | null>(null);
  const [editing, setEditing] = useState<BookmarkCollection | "new" | null>(null);
  const [form, setForm] = useState<BookmarkCollectionInput>({ name: "", icon: "🔖", color: COLORS[0], scope_folder_id: null });

  async function reloadCollections(preferredId?: number) {
    const rows = await listBookmarkCollectionsForNote(noteId);
    setCollections(rows);
    setSelectedId((current) => preferredId ?? (rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null));
  }

  function selectCollection(id: number) {
    setSelectedId(id);
    localStorage.setItem(LAST_BOOKMARK_COLLECTION_KEY, String(id));
  }

  useEffect(() => {
    void Promise.all([listBookmarkCollectionsForNote(noteId), listBookmarkScopeOptions(noteId)]).then(([collectionRows, scopeRows]) => {
      setCollections(collectionRows);
      setScopes(scopeRows);
      setSelectedId((current) => collectionRows.some((row) => row.id === current) ? current : collectionRows[0]?.id ?? null);
    });
  }, [noteId]);

  useEffect(() => {
    if (!draft) return;
    setPending(draft);
    onDraftConsumed?.();
  }, [draft, onDraftConsumed]);

  useEffect(() => {
    if (selectedId === null) { setBookmarks([]); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void listBookmarks(selectedId, query).then((rows) => { if (!cancelled) setBookmarks(rows); });
    }, 100);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query, selectedId]);

  useEffect(() => {
    function refresh(event: Event) {
      const collectionId = (event as CustomEvent<{ collectionId?: number }>).detail?.collectionId;
      void reloadCollections(collectionId ?? selectedId ?? undefined);
      if (collectionId !== undefined) void listBookmarks(collectionId, query).then(setBookmarks);
    }
    window.addEventListener("entropi-bookmarks-changed", refresh);
    return () => window.removeEventListener("entropi-bookmarks-changed", refresh);
  }, [noteId, query, selectedId]);

  function startCreate() {
    setForm({ name: "", icon: "🔖", color: COLORS[0], scope_folder_id: scopes.find((scope) => scope.folder_id !== null)?.folder_id ?? null });
    setEditing("new");
  }

  function startEdit(collection: BookmarkCollection) {
    setForm({ name: collection.name, icon: collection.icon, color: collection.color, scope_folder_id: collection.scope_folder_id });
    setEditing(collection);
  }

  async function submitCollection() {
    if (!form.name.trim()) return;
    try {
      const id = editing === "new" ? await createBookmarkCollection(form) : (await updateBookmarkCollection(editing!.id, form), editing!.id);
      await reloadCollections(id);
      selectCollection(id);
      setEditing(null);
      notify.success(t("notes.bookmarks.collectionSaved"));
    } catch (error) {
      notify.error(String(error).includes("UNIQUE") ? t("notes.bookmarks.duplicateCollection") : t("notes.bookmarks.saveError"));
    }
  }

  async function removeCollection(collection: BookmarkCollection) {
    if (!(await confirmDelete({ itemName: collection.name }))) return;
    await deleteBookmarkCollection(collection.id);
    setEditing(null);
    await reloadCollections();
  }

  async function storePending(collectionId: number) {
    if (!pending) return;
    await saveBookmark(collectionId, pending);
    selectCollection(collectionId);
    setPending(null);
    setBookmarks(await listBookmarks(collectionId));
    await reloadCollections(collectionId);
    notify.success(t("notes.bookmarks.saved"));
  }

  async function removeBookmark(bookmark: NoteBookmark) {
    await deleteBookmark(bookmark.id);
    setBookmarks((current) => current.filter((item) => item.id !== bookmark.id));
    await reloadCollections(selectedId ?? undefined);
    notify.success(t("feedback.deleted"));
  }

  if (editing) return <aside className="flex h-full flex-col p-5">
    <div className="flex items-center gap-2"><IconButton label={t("notes.bookmarks.back")} icon={<AltArrowLeftLinear size={16} />} onClick={() => setEditing(null)} /><h2 className="text-sm font-semibold text-text-primary">{editing === "new" ? t("notes.bookmarks.newCollection") : t("notes.bookmarks.editCollection")}</h2></div>
    <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.bookmarks.collectionName")}<Input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1" /></label>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.bookmarks.icon")}<Input value={form.icon ?? ""} onChange={(event) => setForm({ ...form, icon: event.target.value.slice(0, 4) })} className="mt-1" /></label>
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.bookmarks.scope")}<div className="mt-1"><Combobox value={form.scope_folder_id === null ? "global" : String(form.scope_folder_id)} onChange={(value) => setForm({ ...form, scope_folder_id: value === "global" ? null : Number(value) })} options={scopes.map((scope) => ({ value: scope.folder_id === null ? "global" : String(scope.folder_id), label: scope.folder_id === null ? t("notes.bookmarks.global") : scope.name }))} /></div></label>
      <div><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.bookmarks.color")}</p><div className="mt-2 flex flex-wrap gap-2">{COLORS.map((color) => <button key={color} type="button" aria-label={color} onClick={() => setForm({ ...form, color })} className={`h-7 w-7 rounded-full border-2 ${form.color === color ? "border-text-primary ring-2 ring-accent/25" : "border-transparent"}`} style={{ backgroundColor: color }} />)}</div></div>
    </div>
    <div className="space-y-2"><Button className="w-full" disabled={!form.name.trim()} onClick={() => void submitCollection()}>{t("settings.lookup.save")}</Button>{editing !== "new" && <Button variant="ghost" className="w-full text-danger" onClick={() => void removeCollection(editing)}>{t("settings.lookup.delete")}</Button>}</div>
  </aside>;

  const selected = collections.find((collection) => collection.id === selectedId) ?? null;
  return <aside className="flex h-full flex-col p-5">
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-text-primary">{t("notes.bookmarks.title")}</h2>{!standalone && <IconButton tooltipPlacement="left" label={t("notes.bookmarks.hidePanel")} icon={<AltArrowRightLinear size={16} />} onClick={onClose} />}</div>
    <p className="mt-1 text-xs text-text-muted">{t("notes.bookmarks.description")}</p>

    {pending && <div className="mt-4 rounded-2xl border border-accent/40 bg-accent/10 p-3"><p className="text-xs font-semibold text-text-primary">{t("notes.bookmarks.saveIn")}</p><p className="mt-1 line-clamp-2 text-[10px] text-text-muted">{pending.plainText || t("notes.bookmarks.blockType", { type: pending.blockType })}</p><div className="mt-3 flex flex-wrap gap-1.5">{collections.map((collection) => <button key={collection.id} type="button" onClick={() => void storePending(collection.id)} className="rounded-full bg-control px-2.5 py-1 text-[10px] font-medium text-text-primary hover:bg-elevated"><span className="mr-1">{collection.icon ?? "🔖"}</span>{collection.name}</button>)}<button type="button" onClick={startCreate} className="rounded-full border border-dashed border-accent px-2.5 py-1 text-[10px] font-medium text-accent">+ {t("notes.bookmarks.newCollection")}</button></div></div>}

    <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-2">{collections.map((collection) => <button key={collection.id} type="button" onClick={() => selectCollection(collection.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-medium ${selectedId === collection.id ? "text-white" : "bg-control text-text-secondary"}`} style={selectedId === collection.id ? { backgroundColor: collection.color } : undefined}>{collection.icon ?? "🔖"} {collection.name} <span className="opacity-70">{collection.bookmark_count}</span></button>)}<button type="button" aria-label={t("notes.bookmarks.newCollection")} onClick={startCreate} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-accent"><AddCircleLinear size={15} /></button></div>

    {onSaveNote && <Button variant="secondary" className="mb-3 flex w-full items-center justify-center gap-2" onClick={onSaveNote}><BookmarkLinear size={15} />{t("notes.bookmarks.saveNote")}</Button>}

    {selected && <div className="flex items-center gap-2"><div className="relative min-w-0 flex-1"><MagniferLinear size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("notes.bookmarks.search")} className="h-9 w-full rounded-xl bg-control pl-8 pr-2 text-xs text-text-primary outline-none" /></div><IconButton label={t("notes.bookmarks.editCollection")} icon={<PenLinear size={14} />} onClick={() => startEdit(selected)} /></div>}

    <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      {!selected ? <div className="rounded-2xl bg-surface-hover/55 px-4 py-8 text-center"><BookmarkLinear size={24} className="mx-auto text-text-muted" /><p className="mt-2 text-xs text-text-muted">{t("notes.bookmarks.emptyCollections")}</p><Button variant="secondary" className="mt-4" onClick={startCreate}>{t("notes.bookmarks.newCollection")}</Button></div>
        : bookmarks.length === 0 ? <p className="rounded-2xl bg-surface-hover/55 px-4 py-8 text-center text-xs text-text-muted">{query ? t("notes.bookmarks.noResults") : t("notes.bookmarks.empty")}</p>
          : bookmarks.map((bookmark) => <article key={bookmark.id} className="group rounded-2xl border border-border bg-surface-hover/35 p-2"><button type="button" onClick={() => onOpenLocation(bookmark.note_id, bookmark.block_id)} className="block w-full text-left"><BookmarkBlockPreview snapshot={bookmark.block_snapshot} fallback={bookmark.plain_text} /><div className="mt-2 flex items-center justify-between gap-2 px-1"><span className="min-w-0 truncate text-[10px] text-text-muted">{bookmark.note_title}{bookmark.folder_name ? ` · ${bookmark.folder_name}` : ""}</span><span className="text-[9px] font-medium text-accent">{t("notes.bookmarks.open")}</span></div></button><div className="flex justify-end"><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={13} />} className="opacity-0 group-hover:opacity-100 hover:!text-danger" onClick={() => void removeBookmark(bookmark)} /></div></article>)}
    </div>
  </aside>;
}
