import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AddCircleLinear, BookLinear, ChecklistMinimalisticLinear, MagniferLinear, NotebookLinear, SquareAcademicCapLinear, UserIdLinear } from "../ui/appIcons";
import { notify } from "../ui/Toast";
import { listAllAssessments } from "../../db/queries/assessments";
import { createNote, listNotes, replaceNoteLinks } from "../../db/queries/notes";
import { createProfessor, listProfessors } from "../../db/queries/professors";
import { listSemesters } from "../../db/queries/semesters";
import { listAllSubjects } from "../../db/queries/subjects";
import { listTasks } from "../../db/queries/tasks";
import type { Assessment, Note, Professor, Semester, Subject, Task } from "../../types";

type CommandKey = "subject" | "semester" | "professor" | "task" | "exam" | "note";

interface ResultItem {
  id: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  color: string;
  run: () => void | Promise<void>;
}

const COMMAND_ALIASES: Record<string, CommandKey> = {
  subject: "subject", materia: "subject",
  semester: "semester", semestre: "semester",
  professor: "professor", profesor: "professor",
  task: "task", tarea: "task",
  exam: "exam", examen: "exam", evaluation: "exam", evaluacion: "exam",
  note: "note", nota: "note",
};

const COMMAND_LABELS: Record<CommandKey, string> = {
  subject: "Materia", semester: "Semestre", professor: "Profesor",
  task: "Tarea", exam: "Evaluación", note: "Nota",
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase();
}

function commandKey(value: string) {
  return COMMAND_ALIASES[normalized(value)] ?? null;
}

function parseCommand(query: string) {
  const segments = query.split(";");
  const fields = new Map<CommandKey, string>();
  for (const segment of segments) {
    const separator = segment.indexOf(":");
    if (separator < 0) continue;
    const key = commandKey(segment.slice(0, separator));
    if (key) fields.set(key, segment.slice(separator + 1).trim());
  }
  const current = segments[segments.length - 1] ?? "";
  const separator = current.indexOf(":");
  return {
    fields,
    segments,
    currentKey: separator >= 0 ? commandKey(current.slice(0, separator)) : null,
    currentValue: separator >= 0 ? current.slice(separator + 1).trim() : "",
  };
}

function exactByName<T extends { name?: string; title?: string }>(rows: T[], value?: string) {
  if (!value?.trim()) return null;
  return rows.find((row) => normalized(row.name ?? row.title ?? "") === normalized(value)) ?? null;
}

export function GlobalSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  async function reloadData() {
    const [subjectRows, semesterRows, professorRows, taskRows, assessmentRows, noteRows] = await Promise.all([
      listAllSubjects(), listSemesters(), listProfessors(), listTasks({}), listAllAssessments(), listNotes(),
    ]);
    setSubjects(subjectRows); setSemesters(semesterRows); setProfessors(professorRows);
    setTasks(taskRows); setAssessments(assessmentRows); setNotes(noteRows);
  }

  useEffect(() => { void reloadData().catch(() => undefined); }, []);

  useEffect(() => {
    function clickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); inputRef.current?.focus(); setOpen(true);
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function close() { setQuery(""); setOpen(false); }

  const results = useMemo<ResultItem[]>(() => {
    const parsed = parseCommand(query);
    const isCommand = query.includes(":") && parsed.fields.size > 0;
    if (!isCommand) {
      const search = normalized(query);
      if (!search) return [
        { id: "guide-subject", title: t("search.guide.subject"), subtitle: "subject: Álgebra; semester: 4to semestre; professor: Ada", icon: <SquareAcademicCapLinear size={16} />, color: "var(--accent)", run: () => { setQuery("subject: "); setActiveIndex(0); requestAnimationFrame(() => inputRef.current?.focus()); } },
        { id: "guide-task", title: t("search.guide.task"), subtitle: "task: Lavar la loza · subject: es opcional", icon: <ChecklistMinimalisticLinear size={16} />, color: "var(--accent-secondary)", run: () => { setQuery("task: "); setActiveIndex(0); requestAnimationFrame(() => inputRef.current?.focus()); } },
        { id: "guide-exam", title: t("search.guide.exam"), subtitle: "exam: Parcial 2; subject: Física II", icon: <BookLinear size={16} />, color: "var(--accent)", run: () => { setQuery("exam: "); setActiveIndex(0); requestAnimationFrame(() => inputRef.current?.focus()); } },
        { id: "guide-note", title: t("search.guide.note"), subtitle: "note: Ideas del proyecto · subject: es opcional", icon: <NotebookLinear size={16} />, color: "var(--text-secondary)", run: () => { setQuery("note: "); setActiveIndex(0); requestAnimationFrame(() => inputRef.current?.focus()); } },
        { id: "guide-search", title: t("search.guide.search"), subtitle: t("search.guide.searchHint"), icon: <MagniferLinear size={16} />, color: "var(--text-muted)", run: () => inputRef.current?.focus() },
      ];
      return [
        ...subjects.map((subject) => ({ id: `subject-${subject.id}`, title: subject.name, subtitle: subject.code ?? t("search.types.subject"), icon: <SquareAcademicCapLinear size={16} />, color: subject.color, run: () => { navigate(`/subjects/${subject.id}`); close(); } })),
        ...professors.map((professor) => ({ id: `professor-${professor.id}`, title: professor.name, subtitle: [professor.email, professor.department, professor.office, professor.phone].filter(Boolean).join(" · ") || "Profesor", searchText: [professor.name, professor.email, professor.department, professor.office, professor.phone].filter(Boolean).join(" "), icon: <UserIdLinear size={16} />, color: "var(--accent-secondary)", run: () => { navigate("/settings", { state: { section: "professors" } }); close(); } })),
        ...tasks.map((task) => ({ id: `task-${task.id}`, title: task.title, subtitle: t("search.types.task"), icon: <ChecklistMinimalisticLinear size={16} />, color: "var(--accent-secondary)", run: () => { navigate("/tasks"); close(); } })),
        ...assessments.map((assessment) => ({ id: `assessment-${assessment.id}`, title: assessment.title, subtitle: t("search.types.assessment"), icon: <BookLinear size={16} />, color: "var(--accent)", run: () => { navigate(`/subjects/${assessment.subject_id}`, { state: { tab: "assessments" } }); close(); } })),
        ...notes.map((note) => ({ id: `note-${note.id}`, title: note.title, subtitle: t("search.types.note"), icon: <NotebookLinear size={16} />, color: "var(--text-secondary)", run: () => { navigate(`/notes/${note.id}`); close(); } })),
      ].filter((item) => normalized(`${item.title} ${item.subtitle} ${"searchText" in item ? item.searchText : ""}`).includes(search)).slice(0, 8);
    }

    const output: ResultItem[] = [];
    const valuesByKey: Partial<Record<CommandKey, Array<{ id: number; label: string; color?: string }>>> = {
      subject: subjects.map((row) => ({ id: row.id, label: row.name, color: row.color })),
      semester: semesters.map((row) => ({ id: row.id, label: row.name })),
      professor: professors.map((row) => ({ id: row.id, label: row.name })),
      task: tasks.map((row) => ({ id: row.id, label: row.title })),
      exam: assessments.map((row) => ({ id: row.id, label: row.title })),
      note: notes.map((row) => ({ id: row.id, label: row.title })),
    };

    function replaceCurrent(value: string) {
      const next = [...parsed.segments];
      const current = next[next.length - 1];
      const separator = current.indexOf(":");
      next[next.length - 1] = `${current.slice(0, separator + 1)} ${value}`;
      setQuery(next.join(";"));
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }

    if (parsed.currentKey) {
      const matching = (valuesByKey[parsed.currentKey] ?? [])
        .filter((row) => normalized(row.label).includes(normalized(parsed.currentValue)))
        .slice(0, 6);
      for (const row of matching) output.push({
        id: `complete-${parsed.currentKey}-${row.id}`,
        title: row.label,
        subtitle: `Usar ${COMMAND_LABELS[parsed.currentKey].toLocaleLowerCase()}`,
        icon: parsed.currentKey === "professor" ? <UserIdLinear size={16} /> : <MagniferLinear size={16} />,
        color: row.color ?? "var(--accent-secondary)",
        run: () => replaceCurrent(row.label),
      });
    }

    const primary = (["task", "exam", "note"] as CommandKey[]).find((key) => parsed.fields.has(key))
      ?? ([...parsed.fields.keys()][0] ?? null);
    const title = primary ? parsed.fields.get(primary)?.trim() ?? "" : "";
    const subjectValue = parsed.fields.get("subject");
    const subject = exactByName(subjects, subjectValue);
    const existingPrimarySubject = primary === "subject" ? exactByName(subjects, title) : null;
    const semester = exactByName(semesters, parsed.fields.get("semester"));
    const professor = exactByName(professors, parsed.fields.get("professor"));
    const relatedSubjectCannotBeCreated = primary === "task" || primary === "exam" || primary === "note";

    if (parsed.currentKey === "professor" && parsed.currentValue && !professor && !relatedSubjectCannotBeCreated) {
      output.push({ id: "create-professor", title: `Crear profesor “${parsed.currentValue}”`, subtitle: "Se añadirá a la base de profesores", icon: <AddCircleLinear size={16} />, color: "var(--accent)", run: async () => {
        await createProfessor({ name: parsed.currentValue, email: null, phone: null, department: null, office: null, office_hours: null, notes: null });
        await reloadData(); replaceCurrent(parsed.currentValue); notify.success(t("feedback.created"));
      } });
    }

    let problem = "";
    if (!title) problem = "Escribe un nombre después del comando.";
    else if (primary === "exam" && !subjectValue) problem = "Añade subject: con una materia existente.";
    else if (relatedSubjectCannotBeCreated && subjectValue && !subject) problem = "Esa materia no existe. Selecciona una de las sugerencias.";
    else if (primary === "subject" && !existingPrimarySubject && !parsed.fields.get("semester")) problem = "Añade semester: para elegir el semestre.";
    else if (primary === "subject" && !existingPrimarySubject && !semester) problem = "Ese semestre no existe. Créalo primero desde Configuración.";
    else if (primary === "subject" && !existingPrimarySubject && parsed.fields.get("professor") && !professor) problem = "Selecciona o crea primero el profesor sugerido.";

    if (problem) output.push({ id: "command-help", title: problem, subtitle: "Ejemplo: task: Taller 2; subject: Física II", icon: <MagniferLinear size={16} />, color: "var(--text-muted)", run: () => undefined });
    else if (primary === "task") output.push({ id: "create-task", title: `Preparar tarea “${title}”`, subtitle: subject ? `Materia · ${subject.name}` : "Tarea personal, sin materia", icon: <AddCircleLinear size={16} />, color: subject?.color ?? "var(--accent)", run: () => { navigate("/tasks", { state: { commandDraft: { title, subjectId: subject?.id ?? null } } }); close(); } });
    else if (primary === "exam" && subject) output.push({ id: "create-exam", title: `Preparar evaluación “${title}”`, subtitle: `Materia · ${subject.name}`, icon: <AddCircleLinear size={16} />, color: subject.color, run: () => { navigate(`/subjects/${subject.id}`, { state: { tab: "assessments", assessmentDraftTitle: title } }); close(); } });
    else if (primary === "note") output.push({ id: "create-note", title: `Crear nota “${title}”`, subtitle: subject ? `Relacionada con ${subject.name}` : "Nota suelta, sin materia", icon: <AddCircleLinear size={16} />, color: subject?.color ?? "var(--accent)", run: async () => {
      const id = await createNote({ title, content: null, linked_entity_type: null, linked_entity_id: null });
      if (subject) await replaceNoteLinks(id, [{ entity_type: "subject", entity_id: subject.id }]);
      notify.success(t("feedback.created")); navigate(`/notes/${id}`); close();
    } });
    else if (primary === "subject" && existingPrimarySubject) output.push({ id: "open-subject", title: `Abrir ${existingPrimarySubject.name}`, subtitle: "La materia ya existe", icon: <SquareAcademicCapLinear size={16} />, color: existingPrimarySubject.color, run: () => { navigate(`/subjects/${existingPrimarySubject.id}`); close(); } });
    else if (primary === "subject" && semester) output.push({ id: "create-subject", title: `Preparar materia “${title}”`, subtitle: `${semester.name}${professor ? ` · ${professor.name}` : ""}`, icon: <AddCircleLinear size={16} />, color: "var(--accent)", run: () => { navigate("/subjects", { state: { commandDraft: { name: title, semesterId: semester.id, professorId: professor?.id ?? null } } }); close(); } });
    else if (primary === "semester" && semester) output.push({ id: "open-semester", title: semester.name, subtitle: "El semestre ya existe", icon: <MagniferLinear size={16} />, color: "var(--accent)", run: () => { navigate("/settings", { state: { section: "semesters" } }); close(); } });
    else if (primary === "semester") output.push({ id: "create-semester", title: `Preparar semestre “${title}”`, subtitle: "Completa sus fechas en Configuración", icon: <AddCircleLinear size={16} />, color: "var(--accent)", run: () => { navigate("/settings", { state: { section: "semesters", semesterDraftName: title } }); close(); } });
    else if (primary === "professor" && professor) output.push({ id: "open-professor", title: professor.name, subtitle: "Abrir base de profesores", icon: <UserIdLinear size={16} />, color: "var(--accent)", run: () => { navigate("/settings", { state: { section: "professors" } }); close(); } });

    return output;
  }, [assessments, navigate, notes, professors, query, semesters, subjects, t, tasks]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(results.length - 1, index + 1)); return; }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); return; }
    if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); void results[activeIndex].run(); }
  }

  return <div ref={rootRef} className="absolute left-1/2 w-full max-w-md -translate-x-1/2">
    <label className="flex items-center gap-2 rounded-full border border-border bg-control px-4 py-2.5 text-text-muted shadow-card backdrop-blur-2xl transition-all duration-200 focus-within:bg-elevated focus-within:text-text-primary">
      <MagniferLinear size={16} className="shrink-0" />
      <input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActiveIndex(0); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} type="search" placeholder={t("topbar.search")} className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted" />
      <span className="flex shrink-0 items-center gap-1"><kbd className="rounded-md border border-border bg-surface-hover px-1.5 py-0.5 text-[9px] font-medium text-text-muted">Ctrl</kbd><span className="text-[9px] text-text-muted">+</span><kbd className="rounded-md border border-border bg-surface-hover px-1.5 py-0.5 text-[9px] font-medium text-text-muted">K</kbd></span>
    </label>
    {open && <div className="vida-popover-enter absolute left-0 right-0 top-[calc(100%+8px)] max-h-80 overflow-y-auto rounded-2xl border border-border bg-elevated p-1.5 shadow-modal backdrop-blur-3xl">
      {results.length === 0 ? <p className="px-3 py-4 text-center text-xs text-text-muted">{t("search.empty")}</p> : results.map((item, index) => <button key={item.id} type="button" onMouseEnter={() => setActiveIndex(index)} onClick={() => void item.run()} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${index === activeIndex ? "bg-surface-hover" : "hover:bg-surface-hover"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ color: item.color, background: `color-mix(in srgb, ${item.color} 13%, transparent)` }}>{item.icon}</span><span className="min-w-0"><strong className="block truncate text-sm font-medium text-text-primary">{item.title}</strong><span className="block truncate text-[10px] text-text-muted">{item.subtitle}</span></span></button>)}
    </div>}
  </div>;
}
