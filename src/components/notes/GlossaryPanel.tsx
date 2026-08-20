import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AddCircleLinear,
  AltArrowLeftLinear,
  AltArrowRightLinear,
  BookLinear,
  CloseCircleLinear,
  LinkCircleLinear,
  MagniferLinear,
  PenLinear,
  TrashBinTrashLinear,
} from "../ui/appIcons";
import { Button, Combobox, IconButton, Input, Textarea, notify } from "../ui";
import { confirmDelete } from "../ui/ConfirmDialog";
import {
  createGlossaryEntry,
  deleteGlossaryEntry,
  getGlossaryEntryDetail,
  listGlossaryEntriesForNote,
  listGlossaryOccurrences,
  listGlossaryScopeOptions,
  updateGlossaryEntry,
} from "../../db/queries/glossary";
import type {
  GlossaryEntry,
  GlossaryEntryDetail,
  GlossaryEntryInput,
  GlossaryOccurrence,
  GlossaryScopeOption,
  GlossarySectionType,
} from "../../types";

interface GlossaryPanelProps {
  noteId: number;
  onClose: () => void;
  onOpenLocation: (noteId: number, blockId: string | null) => void;
  draft?: GlossaryDraft | null;
  onDraftConsumed?: () => void;
  onChanged?: () => void;
  standalone?: boolean;
}

export interface GlossaryDraft {
  term: string;
  blockId: string | null;
}

type PanelView = "list" | "detail" | "edit";
type DetailTab = "content" | "usage";

const emptyInput = (noteId: number, scopeFolderId: number | null): GlossaryEntryInput => ({
  term: "",
  definition: "",
  scope_folder_id: scopeFolderId,
  source_note_id: noteId > 0 ? noteId : null,
  source_block_id: null,
  aliases: [],
  sections: [],
});

export function GlossaryPanel({ noteId, onClose, onOpenLocation, draft = null, onDraftConsumed, onChanged, standalone = false }: GlossaryPanelProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<PanelView>("list");
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [scopes, setScopes] = useState<GlossaryScopeOption[]>([]);
  const [detail, setDetail] = useState<GlossaryEntryDetail | null>(null);
  const [occurrences, setOccurrences] = useState<GlossaryOccurrence[]>([]);
  const [detailTab, setDetailTab] = useState<DetailTab>("content");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<GlossaryEntryInput>(() => emptyInput(noteId, null));
  const [aliasesText, setAliasesText] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload(search = query) {
    setEntries(await listGlossaryEntriesForNote(noteId, search));
  }

  useEffect(() => {
    let cancelled = false;
    void listGlossaryScopeOptions(noteId).then((rows) => {
      if (cancelled) return;
      setScopes(rows);
      setForm((current) => current.scope_folder_id === null
        ? { ...current, scope_folder_id: rows.find((scope) => scope.folder_id !== null)?.folder_id ?? null }
        : current);
    });
    return () => { cancelled = true; };
  }, [noteId]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void listGlossaryEntriesForNote(noteId, query).then((rows) => { if (!cancelled) setEntries(rows); });
    }, 120);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [noteId, query]);

  useEffect(() => {
    if (!draft) return;
    setDetail(null);
    setEditingId(null);
    setAliasesText("");
    setForm({
      ...emptyInput(noteId, scopes.find((scope) => scope.folder_id !== null)?.folder_id ?? null),
      term: draft.term,
      source_block_id: draft.blockId,
    });
    setView("edit");
    onDraftConsumed?.();
  }, [draft, noteId, onDraftConsumed, scopes]);

  async function openDetail(id: number) {
    const [entry, usage] = await Promise.all([getGlossaryEntryDetail(id), listGlossaryOccurrences(id)]);
    if (!entry) return;
    setDetail(entry);
    setOccurrences(usage);
    setDetailTab("content");
    setView("detail");
  }

  function startCreate() {
    setEditingId(null);
    setAliasesText("");
    setForm(emptyInput(noteId, scopes.find((scope) => scope.folder_id !== null)?.folder_id ?? null));
    setView("edit");
  }

  function startEdit(entry: GlossaryEntryDetail) {
    setEditingId(entry.id);
    setAliasesText(entry.aliases.map((alias) => alias.alias).join(", "));
    setForm({
      term: entry.term,
      definition: entry.definition,
      scope_folder_id: entry.scope_folder_id,
      source_note_id: entry.source_note_id,
      source_block_id: entry.source_block_id,
      aliases: entry.aliases.map((alias) => alias.alias),
      sections: entry.sections.map((section) => ({ section_type: section.section_type, title: section.title, content: section.content })),
    });
    setView("edit");
  }

  async function save() {
    if (!form.term.trim() || saving) return;
    setSaving(true);
    const values = { ...form, aliases: aliasesText.split(",").map((alias) => alias.trim()).filter(Boolean) };
    try {
      const id = editingId === null
        ? await createGlossaryEntry(values)
        : (await updateGlossaryEntry(editingId, values), editingId);
      notify.success(t("notes.glossary.saved"));
      await reload();
      onChanged?.();
      await openDetail(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      notify.error(message.includes("UNIQUE") || message.includes("duplicate-glossary-vocabulary") ? t("notes.glossary.duplicate") : t("notes.glossary.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: GlossaryEntryDetail) {
    if (!(await confirmDelete({ itemName: entry.term }))) return;
    await deleteGlossaryEntry(entry.id);
    onChanged?.();
    notify.success(t("feedback.deleted"));
    setDetail(null);
    setView("list");
    await reload();
  }

  function updateSection(index: number, patch: Partial<GlossaryEntryInput["sections"][number]>) {
    setForm((current) => ({ ...current, sections: current.sections.map((section, itemIndex) => itemIndex === index ? { ...section, ...patch } : section) }));
  }

  function removeSection(index: number) {
    setForm((current) => ({ ...current, sections: current.sections.filter((_, itemIndex) => itemIndex !== index) }));
  }

  if (view === "edit") return <GlossaryEditor
    form={form}
    aliasesText={aliasesText}
    scopes={scopes}
    saving={saving}
    editing={editingId !== null}
    onBack={() => setView(detail ? "detail" : "list")}
    onChange={setForm}
    onAliasesChange={setAliasesText}
    onUpdateSection={updateSection}
    onRemoveSection={removeSection}
    onSave={() => void save()}
  />;

  if (view === "detail" && detail) return <aside className="flex h-full flex-col p-5">
    <div className="flex items-center justify-between gap-2"><IconButton label={t("notes.glossary.back")} icon={<AltArrowLeftLinear size={16} />} onClick={() => setView("list")} /><div className="flex items-center"><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={15} />} onClick={() => startEdit(detail)} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} className="hover:!bg-danger/10 hover:!text-danger" onClick={() => void remove(detail)} /></div></div>
    <div className="mt-4"><h2 className="text-xl font-bold text-text-primary">{detail.term}</h2><p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">{detail.scope_folder_name ?? t("notes.glossary.global")}</p>{detail.aliases.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{detail.aliases.map((alias) => <span key={alias.id} className="rounded-full bg-control px-2 py-1 text-[10px] text-text-secondary">{alias.alias}</span>)}</div>}</div>
    <div className="mt-4 grid grid-cols-2 rounded-xl bg-control p-1"><button type="button" onClick={() => setDetailTab("content")} className={`rounded-lg px-2 py-1.5 text-xs ${detailTab === "content" ? "bg-elevated text-text-primary shadow-sm" : "text-text-muted"}`}>{t("notes.glossary.definition")}</button><button type="button" onClick={() => setDetailTab("usage")} className={`rounded-lg px-2 py-1.5 text-xs ${detailTab === "usage" ? "bg-elevated text-text-primary shadow-sm" : "text-text-muted"}`}>{t("notes.glossary.usedIn", { count: occurrences.length })}</button></div>
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
      {detailTab === "content" ? <div className="space-y-4"><p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">{detail.definition || t("notes.glossary.noDefinition")}</p>{detail.sections.map((section) => <section key={section.id} className="rounded-2xl bg-surface-hover/55 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-accent">{section.title || t(`notes.glossary.sectionTypes.${section.section_type}`)}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-text-secondary">{section.content}</p></section>)}{detail.source_note_id !== null && <button type="button" onClick={() => onOpenLocation(detail.source_note_id!, detail.source_block_id)} className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-xs text-accent hover:bg-control"><LinkCircleLinear size={15} />{t("notes.glossary.openSource")}</button>}</div>
        : <div className="space-y-2">{occurrences.length === 0 ? <p className="py-8 text-center text-xs text-text-muted">{t("notes.glossary.noUsage")}</p> : occurrences.map((occurrence) => <button key={occurrence.id} type="button" onClick={() => onOpenLocation(occurrence.note_id, occurrence.block_id)} className="block w-full rounded-2xl bg-surface-hover/55 p-3 text-left hover:bg-control"><div className="flex items-center justify-between gap-2"><span className="truncate text-xs font-semibold text-text-primary">{occurrence.note_title}</span><span className="shrink-0 text-[10px] text-accent">{occurrence.matched_text}</span></div><p className="mt-1 truncate text-[10px] text-text-muted">{occurrence.folder_name ?? t("notes.folders.unfiled")}</p><p className="mt-2 line-clamp-3 text-xs leading-5 text-text-secondary">{occurrence.context_excerpt}</p></button>)}</div>}
    </div>
  </aside>;

  return <aside className="flex h-full flex-col p-5">
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-text-primary">{t("notes.glossary.title")}</h2>{!standalone && <IconButton tooltipPlacement="left" label={t("notes.glossary.hidePanel")} icon={<AltArrowRightLinear size={16} />} onClick={onClose} />}</div>
    <p className="mt-1 text-xs text-text-muted">{t("notes.glossary.description")}</p>
    <div className="relative mt-4"><MagniferLinear size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} spellCheck={false} placeholder={t("notes.glossary.search")} className="h-10 w-full rounded-xl bg-control pl-9 pr-3 text-xs text-text-primary outline-none placeholder:text-text-muted" /></div>
    <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">{entries.length === 0 ? <p className="rounded-2xl bg-surface-hover/55 px-4 py-8 text-center text-xs text-text-muted">{query ? t("notes.glossary.noResults") : t("notes.glossary.empty")}</p> : entries.map((entry) => <button key={entry.id} type="button" onClick={() => void openDetail(entry.id)} className="flex w-full items-start gap-2 rounded-2xl bg-surface-hover/55 p-3 text-left hover:bg-control"><BookLinear size={16} color="var(--accent)" className="mt-0.5 shrink-0" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-text-primary">{entry.term}</span><span className="mt-1 line-clamp-2 text-[10px] leading-4 text-text-muted">{entry.definition || t("notes.glossary.noDefinition")}</span><span className="mt-1 block truncate text-[9px] font-medium uppercase tracking-wider text-accent">{entry.scope_folder_name ?? t("notes.glossary.global")}</span></span></button>)}</div>
    <Button variant="secondary" className="mt-4 flex w-full items-center justify-center gap-2" onClick={startCreate}><AddCircleLinear size={16} />{t("notes.glossary.add")}</Button>
  </aside>;
}

function GlossaryEditor({ form, aliasesText, scopes, saving, editing, onBack, onChange, onAliasesChange, onUpdateSection, onRemoveSection, onSave }: {
  form: GlossaryEntryInput;
  aliasesText: string;
  scopes: GlossaryScopeOption[];
  saving: boolean;
  editing: boolean;
  onBack: () => void;
  onChange: (value: GlossaryEntryInput) => void;
  onAliasesChange: (value: string) => void;
  onUpdateSection: (index: number, patch: Partial<GlossaryEntryInput["sections"][number]>) => void;
  onRemoveSection: (index: number) => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const sectionTypes: GlossarySectionType[] = ["example", "note", "formula", "source", "custom"];
  return <aside className="flex h-full flex-col p-5"><div className="flex items-center gap-2"><IconButton label={t("notes.glossary.back")} icon={<AltArrowLeftLinear size={16} />} onClick={onBack} /><h2 className="text-sm font-semibold text-text-primary">{editing ? t("notes.glossary.edit") : t("notes.glossary.add")}</h2></div><div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
    <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("notes.glossary.term")}<Input spellCheck={false} value={form.term} onChange={(event) => onChange({ ...form, term: event.target.value })} className="mt-1" /></label>
    <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("notes.glossary.definition")}<Textarea value={form.definition} onChange={(event) => onChange({ ...form, definition: event.target.value })} rows={5} className="mt-1" /></label>
    <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("notes.glossary.aliases")}<Input spellCheck={false} value={aliasesText} onChange={(event) => onAliasesChange(event.target.value)} placeholder={t("notes.glossary.aliasesHint")} className="mt-1" /></label>
    <label className="block text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("notes.glossary.scope")}<div className="mt-1"><Combobox value={form.scope_folder_id === null ? "global" : String(form.scope_folder_id)} onChange={(value) => onChange({ ...form, scope_folder_id: value === "global" ? null : Number(value) })} options={scopes.map((scope) => ({ value: scope.folder_id === null ? "global" : String(scope.folder_id), label: scope.folder_id === null ? t("notes.glossary.global") : scope.name }))} /></div></label>
    <div><div className="flex items-center justify-between"><p className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{t("notes.glossary.sections")}</p><button type="button" onClick={() => onChange({ ...form, sections: [...form.sections, { section_type: "example", title: null, content: "" }] })} className="text-[10px] font-medium text-accent hover:underline">{t("notes.glossary.addSection")}</button></div><div className="mt-2 space-y-3">{form.sections.map((section, index) => <div key={index} className="rounded-2xl bg-surface-hover/55 p-3"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><Combobox compact value={section.section_type} onChange={(value) => onUpdateSection(index, { section_type: value as GlossarySectionType })} options={sectionTypes.map((type) => ({ value: type, label: t(`notes.glossary.sectionTypes.${type}`) }))} /></div><IconButton label={t("settings.lookup.delete")} icon={<CloseCircleLinear size={14} />} onClick={() => onRemoveSection(index)} /></div><Input value={section.title ?? ""} onChange={(event) => onUpdateSection(index, { title: event.target.value })} placeholder={t("notes.glossary.sectionTitle")} className="mt-2" /><Textarea value={section.content} onChange={(event) => onUpdateSection(index, { content: event.target.value })} placeholder={t("notes.glossary.sectionContent")} rows={3} className="mt-2" /></div>)}</div></div>
  </div><Button className="mt-4 w-full" disabled={!form.term.trim() || saving} onClick={onSave}>{saving ? t("notes.glossary.saving") : t("settings.lookup.save")}</Button></aside>;
}
