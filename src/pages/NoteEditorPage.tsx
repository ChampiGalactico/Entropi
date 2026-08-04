import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AltArrowLeftLinear, TrashBinTrashLinear } from "../components/ui/appIcons";
import { BlockNoteEditor } from "../components/notes";
import { Button, Checkbox, IconButton } from "../components/ui";
import { listAllAssessments } from "../db/queries/assessments";
import { deleteNote, getNote, listNoteLinks, listNotes, replaceNoteLinks, updateNote } from "../db/queries/notes";
import { listAllSubjects } from "../db/queries/subjects";
import { listTasks } from "../db/queries/tasks";
import type { LinkedEntityType, Note, Subject, Task, Assessment } from "../types";

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

  useEffect(() => {
    void Promise.all([getNote(noteId), listAllSubjects(), listTasks({}), listAllAssessments(), listNotes(), listNoteLinks(noteId)]).then(([noteRow, subjectRows, taskRows, assessmentRows, noteRows, linkRows]) => {
      if (!noteRow) return;
      setNote(noteRow); setTitle(noteRow.title); setContent(noteRow.content); setSubjects(subjectRows); setTasks(taskRows); setAssessments(assessmentRows); setOtherNotes(noteRows.filter((item) => item.id !== noteId));
      setSelected(new Set(linkRows.map((link) => linkKey(link.entity_type, link.entity_id))));
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
  async function save() {
    if (!note || !title.trim()) return;
    await updateNote(note.id, { title: title.trim(), content, linked_entity_type: null, linked_entity_id: null });
    await replaceNoteLinks(note.id, [...selected].map((key) => { const [entity_type, entityId] = key.split(":"); return { entity_type: entity_type as LinkedEntityType, entity_id: Number(entityId) }; }));
    setSaved(true);
  }
  async function remove() { if (!note) return; await deleteNote(note.id); navigate(-1); }

  if (!note) return null;
  return <div className="mx-auto max-w-7xl">
    <div className="sticky top-0 z-20 mb-6 flex items-center justify-between rounded-full border border-border bg-control/90 p-2 shadow-card backdrop-blur-2xl"><div className="flex items-center gap-2"><IconButton label={t("notes.back")} icon={<AltArrowLeftLinear size={18} />} onClick={() => navigate(-1)} /><span className="text-xs text-text-muted">{saved ? t("notes.saved") : t("notes.unsaved")}</span></div><div className="flex items-center gap-2"><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={16} />} onClick={() => void remove()} /><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div></div>
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <main className="min-w-0 px-4 pb-20 md:px-10"><input value={title} onChange={(event) => { setTitle(event.target.value); setSaved(false); }} onFocus={(event) => { if (title === t("notes.untitled")) event.currentTarget.select(); }} placeholder={t("notes.untitled")} className="mb-8 w-full bg-transparent text-4xl font-bold tracking-tight text-text-primary outline-none placeholder:text-text-muted" autoFocus /><BlockNoteEditor key={note.id} value={content} fullPage onChange={(value) => { setContent(value); setSaved(false); }} /></main>
      <aside className="h-fit rounded-[1.75rem] border border-border bg-control p-5 lg:sticky lg:top-20"><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-text-primary">{t("notes.links.title")}</h2>{selected.size > 0 && <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => { setSelected(new Set()); setSaved(false); }}>{t("notes.links.clear")}</Button>}</div><p className="mt-1 text-xs text-text-muted">{selected.size === 0 ? t("notes.links.none") : t("notes.links.description")}</p><div className="mt-5 max-h-[calc(100vh-220px)] space-y-5 overflow-y-auto pr-1">{[...new Set(options.map((option) => option.group))].map((group) => <section key={group}><h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{group}</h3><div className="space-y-2">{options.filter((option) => option.group === group).map((option) => <Checkbox key={linkKey(option.type, option.id)} checked={selected.has(linkKey(option.type, option.id))} onChange={() => toggle(option)} label={option.label} />)}</div></section>)}</div></aside>
    </div>
  </div>;
}
