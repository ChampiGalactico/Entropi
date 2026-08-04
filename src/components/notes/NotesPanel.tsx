import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Badge, Button, EmptyState, IconButton } from "../ui";
import { listAllAssessments, listAssessmentsBySubject } from "../../db/queries/assessments";
import { createNote, deleteNote, listNoteLinks, listNotes, listNotesForSubject, replaceNoteLinks } from "../../db/queries/notes";
import { listAllSubjects } from "../../db/queries/subjects";
import { listTasks } from "../../db/queries/tasks";
import type { Assessment, Note, NoteLink, Subject, Task } from "../../types";

export function NotesPanel({ subjectId }: { subjectId?: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [links, setLinks] = useState<Record<number, NoteLink[]>>({});

  async function reload() {
    const [noteRows, subjectRows, taskRows, assessmentRows] = await Promise.all([
      subjectId === undefined ? listNotes() : listNotesForSubject(subjectId),
      listAllSubjects(),
      listTasks(subjectId === undefined ? {} : { subjectId }),
      subjectId === undefined ? listAllAssessments() : listAssessmentsBySubject(subjectId),
    ]);
    setNotes(noteRows); setSubjects(subjectRows); setTasks(taskRows); setAssessments(assessmentRows);
    setLinks(Object.fromEntries(await Promise.all(noteRows.map(async (note) => [note.id, await listNoteLinks(note.id)] as const))));
  }
  useEffect(() => { void reload(); }, [subjectId]);

  async function createBlank() {
    const id = await createNote({ title: t("notes.untitled"), content: null, linked_entity_type: null, linked_entity_id: null });
    if (subjectId !== undefined) await replaceNoteLinks(id, [{ entity_type: "subject", entity_id: subjectId }]);
    navigate(`/notes/${id}`);
  }

  function labelFor(link: NoteLink) {
    if (link.entity_type === "subject") return subjects.find((item) => item.id === link.entity_id)?.name;
    if (link.entity_type === "task") return tasks.find((item) => item.id === link.entity_id)?.title;
    if (link.entity_type === "assessment") return assessments.find((item) => item.id === link.entity_id)?.title;
    if (link.entity_type === "note") return notes.find((item) => item.id === link.entity_id)?.title;
    return link.entity_type;
  }

  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-text-primary">{t("notes.library")}</h3><p className="mt-1 text-xs text-text-muted">{t("notes.libraryDescription")}</p></div><Button variant="secondary" className="flex items-center gap-1.5" onClick={() => void createBlank()}><AddCircleLinear size={16} />{t("notes.add")}</Button></div>
    {notes.length === 0 ? <EmptyState title={t("notes.empty")} /> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{notes.map((note) => <article role="button" tabIndex={0} key={note.id} onClick={() => navigate(`/notes/${note.id}`)} onKeyDown={(event) => { if (event.key === "Enter") navigate(`/notes/${note.id}`); }} className="group cursor-pointer rounded-[1.5rem] border border-border bg-control p-4 transition-all hover:-translate-y-0.5 hover:bg-elevated hover:shadow-card"><div className="flex items-start justify-between gap-2"><div><h4 className="font-semibold text-text-primary">{note.title}</h4><p className="mt-1 text-xs text-text-muted">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(note.updated_at))}</p></div><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={(event) => { event.stopPropagation(); void deleteNote(note.id).then(reload); }} /></div><div className="mt-4 flex flex-wrap gap-1">{(links[note.id] ?? []).map((link) => <Badge key={`${link.entity_type}:${link.entity_id}`}>{labelFor(link) ?? link.entity_type}</Badge>)}</div></article>)}</div>}
  </div>;
}
