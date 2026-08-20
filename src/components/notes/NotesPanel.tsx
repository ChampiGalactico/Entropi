import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, AddFolderLinear, FolderLinear, MagniferLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Badge, Button, ColorPickerPopover, Combobox, EmptyState, IconButton, Input, Modal, notify } from "../ui";
import { confirmDelete } from "../ui/ConfirmDialog";
import { listAllAssessments, listAssessmentsBySubject } from "../../db/queries/assessments";
import { createNote, deleteNote, listNoteLinks, listNotes, listNotesForSubject, moveNoteToFolder, replaceNoteLinks } from "../../db/queries/notes";
import { createNoteFolder, deleteNoteFolder, getSubjectNoteFolderId, listNoteFolders, updateNoteFolder } from "../../db/queries/noteFolders";
import { listAllSubjects } from "../../db/queries/subjects";
import { listTasks } from "../../db/queries/tasks";
import type { Assessment, Note, NoteFolder, NoteLink, Subject, Task } from "../../types";

const UNFILED = "unfiled" as const;
type FolderFilter = "all" | typeof UNFILED | number;

function folderFilterFromParam(value: string | null): FolderFilter {
  if (value === UNFILED) return UNFILED;
  const folderId = Number(value);
  return Number.isInteger(folderId) && folderId > 0 ? folderId : "all";
}

interface FolderFormState { name: string; color: string; parentId: number | null }
const emptyFolderForm = (parentId: number | null = null): FolderFormState => ({ name: "", color: "#6366f1", parentId });

interface FolderNode { folder: NoteFolder; depth: number }

/** Depth-first, parents-before-children flattening of the folder tree — used both to render the
 * indented tree list and to build "Folder › Subfolder"-style options for the move-to-folder select. */
function flattenFolderTree(folders: NoteFolder[]): FolderNode[] {
  const byParent = new Map<number | null, NoteFolder[]>();
  for (const folder of folders) {
    const key = folder.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(folder);
  }
  const result: FolderNode[] = [];
  function walk(parentId: number | null, depth: number) {
    for (const folder of byParent.get(parentId) ?? []) {
      result.push({ folder, depth });
      walk(folder.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

/** A folder and everything nested under it, so a note can't be filed into its own descendant
 * after being reparented (not exposed in the UI yet, but keeps the tree helper self-consistent). */
function collectDescendantIds(folders: NoteFolder[], rootId: number): Set<number> {
  const ids = new Set<number>();
  const children = new Map<number | null, NoteFolder[]>();
  for (const folder of folders) {
    const key = folder.parent_id;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(folder);
  }
  function walk(id: number) {
    ids.add(id);
    for (const child of children.get(id) ?? []) walk(child.id);
  }
  walk(rootId);
  return ids;
}

export function NotesPanel({ subjectId }: { subjectId?: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [links, setLinks] = useState<Record<number, NoteLink[]>>({});
  const [activeFolder, setActiveFolderState] = useState<FolderFilter>(() => folderFilterFromParam(searchParams.get("folder")));
  const [search, setSearch] = useState("");
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [folderForm, setFolderForm] = useState<FolderFormState>(emptyFolderForm());
  const [dragOverTarget, setDragOverTarget] = useState<FolderFilter | null>(null);

  function setActiveFolder(folder: FolderFilter) {
    setActiveFolderState(folder);
    const next = new URLSearchParams(searchParams);
    if (folder === "all") next.delete("folder");
    else next.set("folder", String(folder));
    // The selected folder is page state, so replace the current library entry. Opening a note
    // then pushes a new entry and Back restores this exact folder instead of the default view.
    setSearchParams(next, { replace: true });
  }

  async function reload() {
    const [noteRows, folderRows, subjectRows, taskRows, assessmentRows] = await Promise.all([
      subjectId === undefined ? listNotes() : listNotesForSubject(subjectId),
      listNoteFolders(),
      listAllSubjects(),
      listTasks(subjectId === undefined ? {} : { subjectId }),
      subjectId === undefined ? listAllAssessments() : listAssessmentsBySubject(subjectId),
    ]);
    setNotes(noteRows); setFolders(folderRows); setSubjects(subjectRows); setTasks(taskRows); setAssessments(assessmentRows);
    setLinks(Object.fromEntries(await Promise.all(noteRows.map(async (note) => [note.id, await listNoteLinks(note.id)] as const))));
  }
  useEffect(() => { void reload(); }, [subjectId]);

  const folderTree = useMemo(() => flattenFolderTree(folders), [folders]);
  const rootFolders = useMemo(() => folderTree.filter(({ depth }) => depth === 0).map(({ folder }) => folder), [folderTree]);
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const folderNoteCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const note of notes) if (note.folder_id !== null) counts.set(note.folder_id, (counts.get(note.folder_id) ?? 0) + 1);
    return counts;
  }, [notes]);
  // Recursive per-folder total (its own notes plus every subfolder's), for the folder tiles shown
  // in the "all notes" home view — a folder tile should read as "everything inside", not just what's
  // filed directly in it.
  const folderRecursiveCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const folder of folders) {
      const descendantIds = collectDescendantIds(folders, folder.id);
      let total = 0;
      for (const note of notes) if (note.folder_id !== null && descendantIds.has(note.folder_id)) total += 1;
      counts.set(folder.id, total);
    }
    return counts;
  }, [folders, notes]);

  // Samsung Notes-style home view: browsing "All notes" shows folders as tiles you drill into,
  // plus only the unfiled notes as loose cards — notes filed into a folder are represented by that
  // folder's tile, not duplicated as individual cards here too. Typing a search from "All notes" is
  // the one exception: it searches every note regardless of folder (each result tagged with its
  // folder icon for context), since a search should never hide matches behind an unopened tile.
  const isSearchingAll = activeFolder === "all" && search.trim().length > 0;
  const showFolderTiles = activeFolder === "all" && rootFolders.length > 0 && !isSearchingAll;
  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notes.filter((note) => {
      if (!isSearchingAll) {
        if ((activeFolder === "all" || activeFolder === UNFILED) && note.folder_id !== null) return false;
        if (typeof activeFolder === "number" && note.folder_id !== activeFolder) return false;
      }
      if (query && !note.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [notes, activeFolder, search, isSearchingAll]);

  async function createBlank() {
    const folder_id = typeof activeFolder === "number"
      ? activeFolder
      : subjectId === undefined ? null : await getSubjectNoteFolderId(subjectId);
    const id = await createNote({ title: t("notes.untitled"), content: null, linked_entity_type: null, linked_entity_id: null, folder_id });
    navigate(`/notes/${id}`);
  }

  function labelFor(link: NoteLink) {
    if (link.entity_type === "subject") return subjects.find((item) => item.id === link.entity_id)?.name;
    if (link.entity_type === "task") return tasks.find((item) => item.id === link.entity_id)?.title;
    if (link.entity_type === "assessment") return assessments.find((item) => item.id === link.entity_id)?.title;
    if (link.entity_type === "note") return notes.find((item) => item.id === link.entity_id)?.title;
    return link.entity_type;
  }

  async function removeNote(note: Note) {
    if (!(await confirmDelete({ itemName: note.title }))) return;
    await deleteNote(note.id);
    notify.success(t("feedback.deleted"));
    await reload();
  }

  async function moveNoteById(noteId: number, folderId: number | null) {
    await moveNoteToFolder(noteId, folderId);
    await reload();
  }

  async function moveNote(note: Note, value: string) {
    await moveNoteById(note.id, value ? Number(value) : null);
  }

  function handleNoteDragStart(event: React.DragEvent, note: Note) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(note.id));
  }

  /** Drop-target handlers for a folder chip/tile/row — `key` identifies it for the drag-over
   * highlight, `folderId` is what a dropped note gets filed into (null unfiles it). */
  function folderDropZone(key: FolderFilter, folderId: number | null) {
    return {
      onDragOver: (event: React.DragEvent) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverTarget(key); },
      onDragLeave: () => setDragOverTarget((current) => (current === key ? null : current)),
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        setDragOverTarget(null);
        const noteId = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isFinite(noteId) && noteId > 0) void moveNoteById(noteId, folderId);
      },
    };
  }

  function openCreateFolder(parentId: number | null = null) {
    setEditingFolder(null);
    setFolderForm(emptyFolderForm(parentId));
    setFolderModalOpen(true);
  }

  function openEditFolder(folder: NoteFolder) {
    setEditingFolder(folder);
    setFolderForm({ name: folder.name, color: folder.color, parentId: folder.parent_id });
    setFolderModalOpen(true);
  }

  async function saveFolder() {
    const name = folderForm.name.trim();
    if (!name) return;
    if (editingFolder) await updateNoteFolder(editingFolder.id, name, folderForm.color);
    else await createNoteFolder(name, folderForm.color, folderForm.parentId);
    setFolderModalOpen(false);
    await reload();
  }

  async function removeFolder(folder: NoteFolder) {
    if (!(await confirmDelete({ itemName: folder.name }))) return;
    const removedIds = collectDescendantIds(folders, folder.id);
    try {
      await deleteNoteFolder(folder.id);
    } catch (error) {
      if (error instanceof Error && error.message === "managed-subject-folder") notify.error(t("notes.folders.managedDeleteError"));
      else throw error;
      return;
    }
    if (typeof activeFolder === "number" && removedIds.has(activeFolder)) setActiveFolder("all");
    notify.success(t("feedback.deleted"));
    await reload();
  }

  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text-primary">{t("notes.library")}</h3><p className="mt-1 text-xs text-text-muted">{t("notes.libraryDescription")}</p></div><Button variant="secondary" className="flex items-center gap-1.5" onClick={() => void createBlank()}><AddCircleLinear size={16} />{t("notes.add")}</Button></div>

    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="flex flex-col gap-2 rounded-2xl border border-border bg-control p-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.folders.title")}</span>
          <IconButton label={t("notes.folders.add")} icon={<AddFolderLinear size={15} />} onClick={() => openCreateFolder(null)} />
        </div>
        <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          <button type="button" onClick={() => setActiveFolder("all")} className={`rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${activeFolder === "all" ? "bg-accent text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}>{t("notes.folders.all")}</button>
          <button
            type="button"
            onClick={() => setActiveFolder(UNFILED)}
            {...folderDropZone(UNFILED, null)}
            className={`rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${activeFolder === UNFILED ? "bg-accent text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"} ${dragOverTarget === UNFILED ? "ring-2 ring-accent" : ""}`}
          >{t("notes.folders.unfiled")}</button>
          {folderTree.map(({ folder, depth }) => (
            <div key={folder.id} className="group/row flex items-center gap-1" style={{ paddingLeft: depth * 14 }}>
              <button
                type="button"
                onClick={() => setActiveFolder(folder.id)}
                {...folderDropZone(folder.id, folder.id)}
                className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-medium transition-colors ${activeFolder === folder.id ? "bg-accent text-white" : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"} ${dragOverTarget === folder.id ? "ring-2 ring-accent" : ""}`}
              >
                <FolderLinear size={14} color={folder.color} className="shrink-0" />
                <span className="truncate">{folder.name}</span>
                {(folderNoteCounts.get(folder.id) ?? 0) > 0 && <span className="ml-auto shrink-0 text-[10px] opacity-70">{folderNoteCounts.get(folder.id)}</span>}
              </button>
              <span className="hidden shrink-0 items-center group-hover/row:flex">
                <IconButton label={t("notes.folders.addSubfolder")} icon={<AddFolderLinear size={12} />} onClick={() => openCreateFolder(folder.id)} className="p-1" />
                <IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={12} />} onClick={() => openEditFolder(folder)} className="p-1" />
                {folder.managed_context_id === null && <IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={12} />} onClick={() => void removeFolder(folder)} className="p-1" />}
              </span>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex flex-col gap-3">
        <div className="relative max-w-sm">
          <MagniferLinear size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("notes.folders.searchPlaceholder")} className="pl-9" />
        </div>

        {showFolderTiles && <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">{rootFolders.map((folder) => <button key={folder.id} type="button" onClick={() => setActiveFolder(folder.id)} {...folderDropZone(folder.id, folder.id)} className={`flex items-center gap-3 rounded-2xl border border-border bg-control p-4 text-left transition-all hover:-translate-y-0.5 hover:bg-elevated hover:shadow-card ${dragOverTarget === folder.id ? "ring-2 ring-accent" : ""}`}><FolderLinear size={30} color={folder.color} className="shrink-0" /><div className="min-w-0"><p className="truncate font-semibold text-text-primary">{folder.name}</p><p className="text-xs text-text-muted">{t("notes.folders.noteCount", { count: folderRecursiveCounts.get(folder.id) ?? 0 })}</p></div></button>)}</div>}
        {showFolderTiles && <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.folders.unfiled")}</p>}

        {visibleNotes.length === 0 ? <EmptyState title={notes.length === 0 ? t("notes.empty") : t("notes.folders.noMatches")} /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleNotes.map((note) => <article role="button" tabIndex={0} key={note.id} draggable onDragStart={(event) => handleNoteDragStart(event, note)} onClick={() => navigate(`/notes/${note.id}`)} onKeyDown={(event) => { if (event.key === "Enter") navigate(`/notes/${note.id}`); }} className="group cursor-grab rounded-[1.5rem] border border-border bg-control p-4 transition-all hover:-translate-y-0.5 hover:bg-elevated hover:shadow-card active:cursor-grabbing"><div className="flex items-start justify-between gap-2"><div><h4 className="font-semibold text-text-primary">{note.title}</h4><p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted"><span>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(note.updated_at))}</span>{isSearchingAll && note.folder_id !== null && folderById.get(note.folder_id) && <span className="flex items-center gap-1 truncate"><FolderLinear size={11} color={folderById.get(note.folder_id)!.color} />{folderById.get(note.folder_id)!.name}</span>}</p></div><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={(event) => { event.stopPropagation(); void removeNote(note); }} /></div><div className="mt-4 flex flex-wrap gap-1">{(links[note.id] ?? []).map((link) => <Badge key={`${link.entity_type}:${link.entity_id}`}>{labelFor(link) ?? link.entity_type}</Badge>)}</div><div className="mt-3" onClick={(event) => event.stopPropagation()}><Combobox
          compact
          value={note.folder_id ? String(note.folder_id) : ""}
          onChange={(value) => void moveNote(note, value)}
          placeholder={t("notes.folders.none")}
          options={[
            { value: "", label: t("notes.folders.none") },
            ...folderTree.map(({ folder, depth }) => ({ value: String(folder.id), label: `${"—".repeat(depth)}${depth > 0 ? " " : ""}${folder.name}`, color: folder.color })),
          ]}
        /></div></article>)}</div>}
      </div>
    </div>

    <Modal open={folderModalOpen} onClose={() => setFolderModalOpen(false)} onSave={() => void saveFolder()} title={editingFolder ? t("notes.folders.editTitle") : folderForm.parentId ? t("notes.folders.addSubfolderTitle") : t("notes.folders.addTitle")}>
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">{t("settings.lookup.name")}</label>
            <Input value={folderForm.name} onChange={(event) => setFolderForm((f) => ({ ...f, name: event.target.value }))} autoFocus />
          </div>
          <ColorPickerPopover value={folderForm.color} onChange={(hex) => setFolderForm((f) => ({ ...f, color: hex }))} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setFolderModalOpen(false)}>{t("settings.lookup.cancel")}</Button>
          <Button onClick={() => void saveFolder()}><FolderLinear size={16} />{t("settings.lookup.save")}</Button>
        </div>
      </div>
    </Modal>
  </div>;
}
