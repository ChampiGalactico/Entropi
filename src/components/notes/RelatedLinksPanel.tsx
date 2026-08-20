import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  AddCircleLinear,
  AltArrowRightLinear,
  BookLinear,
  CalendarLinear,
  CheckCircleLinear,
  ChecklistMinimalisticLinear,
  CloseCircleLinear,
  MagniferLinear,
  NotebookLinear,
  SquareAcademicCapLinear,
} from "../ui/appIcons";
import { Button, IconButton } from "../ui";
import { getRelationCandidates, searchRelationCandidates, type RelationCandidateFilter } from "../../db/queries/entityRelations";
import type { LinkedEntityType, RelationCandidate, ResolvedEntityRelation } from "../../types";

const relationKey = (type: LinkedEntityType, id: number) => `${type}:${id}`;

function endpointFromKey(key: string): { type: LinkedEntityType; id: number } {
  const [type, id] = key.split(":");
  return { type: type as LinkedEntityType, id: Number(id) };
}

function EntityIcon({ type, color }: { type: LinkedEntityType; color?: string | null }) {
  const props = { size: 16, color: color ?? "var(--text-secondary)" };
  if (type === "subject") return <SquareAcademicCapLinear {...props} />;
  if (type === "task") return <ChecklistMinimalisticLinear {...props} />;
  if (type === "assessment") return <BookLinear {...props} />;
  if (type === "event") return <CalendarLinear {...props} />;
  return <NotebookLinear {...props} />;
}

interface RelatedLinksPanelProps {
  noteId: number;
  selected: Set<string>;
  resolved: ResolvedEntityRelation[];
  onToggle: (option: RelationCandidate) => void;
  onClear: () => void;
  onClose: () => void;
}

export function RelatedLinksPanel({ noteId, selected, resolved, onToggle, onClear, onClose }: RelatedLinksPanelProps) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RelationCandidateFilter>("all");
  const [results, setResults] = useState<RelationCandidate[]>([]);
  const [known, setKnown] = useState<Map<string, RelationCandidate>>(new Map());
  const [pickerPosition, setPickerPosition] = useState({ left: 0, top: 0 });
  const addButtonRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const inherited = useMemo(() => {
    const unique = new Map<string, ResolvedEntityRelation>();
    for (const relation of resolved) {
      if (relation.origin === "inherited") unique.set(`${relation.entity_type}:${relation.entity_id}`, relation);
    }
    return [...unique.values()];
  }, [resolved]);
  const endpoints = useMemo(() => {
    const unique = new Map<string, { type: LinkedEntityType; id: number }>();
    for (const key of selected) unique.set(key, endpointFromKey(key));
    for (const relation of inherited) {
      if (relation.entity_type === "note_folder") continue;
      const endpoint = { type: relation.entity_type as LinkedEntityType, id: relation.entity_id };
      unique.set(relationKey(endpoint.type, endpoint.id), endpoint);
    }
    return [...unique.values()];
  }, [inherited, selected]);

  useEffect(() => {
    let cancelled = false;
    void getRelationCandidates(noteId, endpoints).then((items) => {
      if (cancelled) return;
      setKnown((current) => {
        const next = new Map(current);
        for (const item of items) next.set(relationKey(item.type, item.id), item);
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [endpoints, noteId]);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchRelationCandidates(noteId, query, filter).then((items) => {
        if (cancelled) return;
        setResults(items);
        setKnown((current) => {
          const next = new Map(current);
          for (const item of items) next.set(relationKey(item.type, item.id), item);
          return next;
        });
      });
    }, 120);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [filter, noteId, pickerOpen, query]);

  useLayoutEffect(() => {
    if (!pickerOpen) return;
    function place() {
      const rect = addButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(352, window.innerWidth - 24);
      setPickerPosition({
        left: Math.max(12, rect.left - width - 10),
        top: Math.max(12, Math.min(rect.top - 120, window.innerHeight - 436)),
      });
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    function dismiss(event: MouseEvent) {
      const target = event.target as Node;
      if (!pickerRef.current?.contains(target) && !addButtonRef.current?.contains(target)) setPickerOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setPickerOpen(false); }
    document.addEventListener("mousedown", dismiss);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [pickerOpen]);

  const filters: Array<{ value: RelationCandidateFilter; label: string }> = [
    { value: "all", label: t("notes.links.types.all") },
    { value: "note", label: t("notes.links.types.note") },
    { value: "subject", label: t("notes.links.types.subject") },
    { value: "task", label: t("notes.links.types.task") },
    { value: "assessment", label: t("notes.links.types.assessment") },
    { value: "event", label: t("notes.links.types.event") },
  ];

  function row(item: RelationCandidate, inheritedLabel?: string) {
    return <div key={relationKey(item.type, item.id)} className="flex items-center gap-2 rounded-xl bg-surface-hover/55 px-3 py-2">
      <EntityIcon type={item.type} color={item.color} />
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-text-primary">{item.label}</p><p className="truncate text-[10px] text-text-muted">{inheritedLabel ?? `${t(`notes.links.types.${item.type}`)}${item.subtitle ? ` · ${item.subtitle}` : ""}`}</p></div>
      {!inheritedLabel && <button type="button" aria-label={t("notes.links.remove")} onClick={() => onToggle(item)} className="rounded-lg p-1 text-text-muted hover:bg-danger/10 hover:text-danger"><CloseCircleLinear size={15} /></button>}
    </div>;
  }

  const suggested = results.filter((item) => item.is_suggested === 1);
  const others = results.filter((item) => item.is_suggested !== 1);

  return <aside className="flex h-full flex-col p-5">
    <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold text-text-primary">{t("notes.links.title")}</h2><IconButton tooltipPlacement="left" label={t("notes.links.hidePanel")} icon={<AltArrowRightLinear size={16} />} onClick={onClose} /></div>
    <p className="mt-1 text-xs text-text-muted">{t("notes.links.description")}</p>

    <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
      {inherited.length > 0 && <section><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.links.inherited")}</p><div className="space-y-2">{inherited.map((relation) => {
        const item = known.get(relationKey(relation.entity_type as LinkedEntityType, relation.entity_id));
        return item ? row(item, t("notes.links.fromFolder", { folder: relation.inherited_from_folder_name })) : null;
      })}</div></section>}

      {selected.size > 0 && <section><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.links.manual")}</p><button type="button" onClick={onClear} className="text-[10px] font-medium text-accent hover:underline">{t("notes.links.clear")}</button></div><div className="space-y-2">{[...selected].map((key) => known.get(key)).filter((item): item is RelationCandidate => Boolean(item)).map((item) => row(item))}</div></section>}

      {inherited.length === 0 && selected.size === 0 && <p className="rounded-2xl bg-surface-hover/55 px-4 py-5 text-center text-xs text-text-muted">{t("notes.links.none")}</p>}
    </div>

    <div ref={addButtonRef} className="mt-4"><Button variant="secondary" className="flex w-full items-center justify-center gap-2" onClick={() => setPickerOpen((open) => !open)}><AddCircleLinear size={16} />{t("notes.links.add")}</Button></div>

    {pickerOpen && createPortal(<div ref={pickerRef} style={{ position: "fixed", zIndex: 180, left: pickerPosition.left, top: pickerPosition.top, width: "min(22rem, calc(100vw - 1.5rem))" }} className="overflow-hidden rounded-[1.5rem] border border-border bg-elevated shadow-modal">
      <div className="border-b border-border p-3"><div className="flex items-center gap-2 rounded-xl bg-control px-3"><MagniferLinear size={16} className="text-text-muted" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} spellCheck={false} placeholder={t("notes.links.searchPlaceholder")} className="h-10 min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted" /></div><div className="mt-2 flex gap-1 overflow-x-auto pb-1">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${filter === item.value ? "bg-accent text-white" : "bg-control text-text-secondary hover:bg-surface-hover"}`}>{item.label}</button>)}</div></div>
      <div className="max-h-[20rem] overflow-y-auto p-2">
        {suggested.length > 0 && <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t("notes.links.suggested")}</p>}
        {suggested.map((item) => <PickerRow key={relationKey(item.type, item.id)} item={item} selected={selected.has(relationKey(item.type, item.id))} onToggle={onToggle} typeLabel={t(`notes.links.types.${item.type}`)} />)}
        {others.length > 0 && <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{query ? t("notes.links.results") : t("notes.links.allEntities")}</p>}
        {others.map((item) => <PickerRow key={relationKey(item.type, item.id)} item={item} selected={selected.has(relationKey(item.type, item.id))} onToggle={onToggle} typeLabel={t(`notes.links.types.${item.type}`)} />)}
        {results.length === 0 && <p className="px-3 py-8 text-center text-xs text-text-muted">{t("notes.links.noResults")}</p>}
      </div>
    </div>, document.body)}
  </aside>;
}

function PickerRow({ item, selected, onToggle, typeLabel }: { item: RelationCandidate; selected: boolean; onToggle: (item: RelationCandidate) => void; typeLabel: string }) {
  return <button type="button" onClick={() => onToggle(item)} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-control">
    <EntityIcon type={item.type} color={item.color} />
    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-text-primary">{item.label}</span><span className="block truncate text-[10px] text-text-muted">{typeLabel}{item.subtitle ? ` · ${item.subtitle}` : ""}</span></span>
    {selected && <CheckCircleLinear size={16} className="text-accent" />}
  </button>;
}
