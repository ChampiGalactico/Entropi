import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AltArrowDownLinear, AltArrowLeftLinear, AltArrowRightLinear, DisketteLinear, DownloadMinimalisticLinear, LinkCircleLinear, QuestionCircleLinear, TrashBinTrashLinear } from "../components/ui/appIcons";
import { BlockNoteEditor } from "../components/notes";
import { NoteHelpModal } from "../components/notes/NoteHelpModal";
import { Button, Checkbox, IconButton, notify } from "../components/ui";
import { confirmDelete } from "../components/ui/ConfirmDialog";
import { listAllAssessments } from "../db/queries/assessments";
import { deleteNote, getNote, listNoteLinks, listNotes, replaceNoteLinks, updateNote } from "../db/queries/notes";
import { listAllSubjects } from "../db/queries/subjects";
import { listTasks } from "../db/queries/tasks";
import type { LinkedEntityType, Note, Subject, Task, Assessment } from "../types";
import { DEFAULT_NOTE_AUTOSAVE_SECONDS, getNoteAutosaveSeconds } from "../lib/notePreferences";
import { exportNoteToPdf } from "../lib/exportNotePdf";

interface LinkOption { type: LinkedEntityType; id: number; label: string; group: string }
const linkKey = (type: LinkedEntityType, id: number) => `${type}:${id}`;

export function NoteEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const noteId = Number(useParams<{ id: string }>().id);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [otherNotes, setOtherNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  const [autosaveSeconds, setAutosaveSeconds] = useState(DEFAULT_NOTE_AUTOSAVE_SECONDS);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [linksPanelOpen, setLinksPanelOpen] = useState(() => localStorage.getItem("entropi-note-links-panel") !== "hidden");
  const printAreaRef = useRef<HTMLElement>(null);
  const editorContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.all([getNote(noteId), listAllSubjects(), listTasks({}), listAllAssessments(), listNotes(), listNoteLinks(noteId)]).then(([noteRow, subjectRows, taskRows, assessmentRows, noteRows, linkRows]) => {
      if (!noteRow) return;
      setNote(noteRow); setTitle(noteRow.title); setContent(noteRow.content); setSubjects(subjectRows); setTasks(taskRows); setAssessments(assessmentRows); setOtherNotes(noteRows.filter((item) => item.id !== noteId));
      setSelected(new Set(linkRows.map((link) => linkKey(link.entity_type, link.entity_id))));
      setSaved(true);
    });
  }, [noteId]);

  const options: LinkOption[] = [
    ...subjects.map((item) => ({ type: "subject" as const, id: item.id, label: item.name, group: t("notes.links.subjects") })),
    ...tasks.map((item) => ({ type: "task" as const, id: item.id, label: item.title, group: t("notes.links.tasks") })),
    ...assessments.map((item) => ({ type: "assessment" as const, id: item.id, label: item.title, group: t("notes.links.assessments") })),
    ...otherNotes.map((item) => ({ type: "note" as const, id: item.id, label: item.title, group: t("notes.links.notes") })),
  ];

  function toggle(option: LinkOption) {
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

  function toggleLinksPanel() {
    setLinksPanelOpen((open) => {
      localStorage.setItem("entropi-note-links-panel", open ? "hidden" : "visible");
      return !open;
    });
  }

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
    <main ref={printAreaRef} id="entropi-print-area" className={`min-w-0 px-4 pb-20 pr-16 transition-[margin] duration-200 md:px-10 md:pr-20 ${linksPanelOpen ? "xl:mr-[21rem]" : ""}`}>
        <div className="entropi-print-band entropi-print-band-header hidden"><strong>{title || t("notes.untitled")}</strong><span>Entropi</span></div>
        <input value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false); }} onFocus={(event) => { if (title === t("notes.untitled")) event.currentTarget.select(); }} placeholder={t("notes.untitled")} className="entropi-print-title mb-8 w-full bg-transparent text-4xl font-bold tracking-tight text-text-primary outline-none placeholder:text-text-muted" autoFocus />
        <div ref={editorContentRef}>
          <BlockNoteEditor key={note.id} value={content} fullPage onChange={(value) => { setContent(value); setSaved(false); }} />
        </div>
        <div className="entropi-print-band entropi-print-band-footer hidden"><span>{lastEditedLabel}</span><span>Entropi</span></div>
    </main>
    {linksPanelOpen && <div className="entropi-note-relations-drawer fixed bottom-5 right-[5.25rem] top-[5.25rem] z-30 w-[min(19rem,calc(100vw-7rem))] overflow-hidden rounded-[1.75rem] border border-border bg-control/95 shadow-card backdrop-blur-2xl"><RelatedLinksPanel options={options} selected={selected} onToggle={toggle} onClear={() => { setSelected(new Set()); setSaved(false); }} onClose={toggleLinksPanel} /></div>}
    <aside className="entropi-note-utility-rail fixed bottom-5 right-4 top-[5.25rem] z-40 flex w-12 flex-col items-center rounded-full border border-border bg-control/90 p-1.5 shadow-card backdrop-blur-2xl">
      <IconButton tooltipPlacement="left" label={t("notes.back")} icon={<AltArrowLeftLinear size={18} />} onClick={() => navigate(-1)} />
      <div className="my-2 h-px w-5 bg-border" />
      <IconButton tooltipPlacement="left" label={`${t("settings.lookup.save")} · ${saved ? t("notes.saved") : t("notes.unsaved")} · Ctrl+S`} icon={<DisketteLinear size={18} />} active={!saved} onClick={() => void save(true)} />
      <span aria-hidden="true" className={`mt-1 h-1.5 w-1.5 rounded-full ${saved ? "bg-success" : "bg-warning"}`} />
      <div className="flex-1" />
      <IconButton tooltipPlacement="left" label={linksPanelOpen ? t("notes.links.hidePanel") : t("notes.links.showPanel")} icon={<LinkCircleLinear size={18} />} active={linksPanelOpen} onClick={toggleLinksPanel} />
      <IconButton tooltipPlacement="left" label={t("notes.help.tooltip")} icon={<QuestionCircleLinear size={18} />} onClick={() => setHelpOpen(true)} />
      <IconButton tooltipPlacement="left" label={t("notes.exportPdf")} icon={<DownloadMinimalisticLinear size={18} />} onClick={() => void exportPdf()} disabled={exportingPdf} />
      <div className="my-2 h-px w-5 bg-border" />
      <IconButton tooltipPlacement="left" label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={17} />} className="hover:!bg-danger/15 hover:!text-danger" onClick={() => void remove()} />
    </aside>
    <NoteHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
  </div>;
}

function RelatedLinksPanel({ options, selected, onToggle, onClear, onClose }: { options: LinkOption[]; selected: Set<string>; onToggle: (option: LinkOption) => void; onClear: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const groups = [...new Set(options.map((option) => option.group))];
  function toggleGroup(group: string) {
    setCollapsed((current) => { const next = new Set(current); if (next.has(group)) next.delete(group); else next.add(group); return next; });
  }
  return <aside className="flex h-full flex-col p-5">
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-text-primary">{t("notes.links.title")}</h2><div className="flex items-center gap-1">{selected.size > 0 && <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={onClear}>{t("notes.links.clear")}</Button>}<IconButton tooltipPlacement="left" label={t("notes.links.hidePanel")} icon={<AltArrowRightLinear size={16} />} onClick={onClose} /></div></div>
    <p className="mt-1 text-xs text-text-muted">{selected.size === 0 ? t("notes.links.none") : t("notes.links.description")}</p>
    <div className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{groups.map((group) => {
      const groupOptions = options.filter((option) => option.group === group).sort((a, b) => Number(selected.has(linkKey(b.type, b.id))) - Number(selected.has(linkKey(a.type, a.id))));
      const visible = visibleCounts[group] ?? 6;
      const isCollapsed = collapsed.has(group);
      return <section key={group} className="rounded-2xl bg-surface-hover/55 px-3 py-2">
        <button type="button" onClick={() => toggleGroup(group)} className="flex w-full items-center justify-between gap-2 text-left"><span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{group} · {groupOptions.length}</span><AltArrowDownLinear size={14} className={`text-text-muted transition-transform ${isCollapsed ? "-rotate-90" : ""}`} /></button>
        {!isCollapsed && <div className="mt-3 space-y-2">{groupOptions.slice(0, visible).map((option) => <Checkbox key={linkKey(option.type, option.id)} checked={selected.has(linkKey(option.type, option.id))} onChange={() => onToggle(option)} label={option.label} />)}{groupOptions.length > 6 && <button type="button" onClick={() => setVisibleCounts((current) => ({ ...current, [group]: visible >= groupOptions.length ? 6 : visible + 8 }))} className="w-full rounded-xl px-2 py-1.5 text-left text-[10px] font-medium text-accent hover:bg-elevated">{visible >= groupOptions.length ? t("notes.links.showLess") : t("notes.links.showMore", { count: groupOptions.length - visible })}</button>}</div>}
      </section>;
    })}</div>
  </aside>;
}
