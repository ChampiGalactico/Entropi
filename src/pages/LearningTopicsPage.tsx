import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArchiveMinimalisticLinear, PenLinear } from "../components/ui/appIcons";
import { Badge, Button, Card, Combobox, EmptyState, IconButton, Input, Modal, notify, Textarea } from "../components/ui";
import { createLearningTopic, listLearningTopics, setLearningTopicArchived, updateLearningTopic } from "../db/queries/learningTopics";
import type { LearningTopic, LearningTopicStatus } from "../types";

const emptyDraft = {
  title: "",
  description: "",
  priority: 3,
  status: "backlog" as LearningTopicStatus,
};

const statusColors: Record<LearningTopicStatus, string> = {
  backlog: "var(--text-muted)",
  started: "var(--accent-secondary)",
  in_progress: "var(--accent)",
  completed: "var(--success)",
};

export function LearningTopicsPage() {
  const { t } = useTranslation();
  const [topics, setTopics] = useState<LearningTopic[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<LearningTopic | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [modalOpen, setModalOpen] = useState(false);

  async function reload(archived = showArchived) {
    const rows = await listLearningTopics(true);
    setTopics(rows.filter((topic) => Boolean(topic.archived) === archived));
  }

  useEffect(() => { void reload(showArchived); }, [showArchived]);

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  }

  function openEdit(topic: LearningTopic) {
    setEditing(topic);
    setDraft({ title: topic.title, description: topic.description ?? "", priority: topic.priority, status: topic.status });
    setModalOpen(true);
  }

  async function save() {
    if (!draft.title.trim()) return;
    const values = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      priority: draft.priority,
      status: draft.status,
      notes_content: editing?.notes_content ?? null,
      archived: editing?.archived ?? 0,
    };
    if (editing) await updateLearningTopic(editing.id, values);
    else await createLearningTopic(values);
    notify.success(t(editing ? "feedback.saved" : "feedback.created"));
    setModalOpen(false);
    await reload();
  }

  async function changeStatus(topic: LearningTopic, status: LearningTopicStatus) {
    await updateLearningTopic(topic.id, { ...topic, status });
    notify.success(t("feedback.saved"));
    await reload();
  }

  async function toggleArchive(topic: LearningTopic) {
    await setLearningTopicArchived(topic.id, !topic.archived);
    notify.success(t(topic.archived ? "feedback.restored" : "feedback.archived"));
    await reload();
  }

  const statusOptions = (["backlog", "started", "in_progress", "completed"] as LearningTopicStatus[])
    .map((status) => ({ value: status, label: t(`learningTopics.status.${status}`), color: statusColors[status] }));

  return <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
    <div className="flex shrink-0 items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-text-primary">{t("learningTopics.title")}</h1><p className="mt-1 text-sm text-text-muted">{t("learningTopics.subtitle")}</p></div>
      <Button onClick={openCreate}>{t("learningTopics.add")}</Button>
    </div>
    <div className="flex shrink-0 gap-2">
      <Button variant={showArchived ? "ghost" : "secondary"} onClick={() => setShowArchived(false)}>{t("learningTopics.active")}</Button>
      <Button variant={showArchived ? "secondary" : "ghost"} onClick={() => setShowArchived(true)}>{t("learningTopics.archived")}</Button>
    </div>
    <Card className="min-h-0 flex-1 overflow-y-auto p-3" style={{ scrollbarGutter: "stable" }}>
      {topics.length === 0 ? <EmptyState title={t(showArchived ? "learningTopics.noArchived" : "learningTopics.empty")} /> : <div className="space-y-2">
        {topics.map((topic) => <div key={topic.id} className="flex items-center gap-3 rounded-2xl bg-control px-4 py-3">
          <span className="h-8 w-1 rounded-full" style={{ background: statusColors[topic.status] }} />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-text-primary">{topic.title}</p>{topic.description && <p className="truncate text-xs text-text-muted">{topic.description}</p>}</div>
          <div className="w-40 shrink-0"><Combobox value={topic.status} options={statusOptions} onChange={(value) => void changeStatus(topic, value as LearningTopicStatus)} /></div>
          <Badge color={statusColors[topic.status]}>{t(`learningTopics.status.${topic.status}`)}</Badge>
          <IconButton label={t("learningTopics.edit")} icon={<PenLinear size={16} />} onClick={() => openEdit(topic)} />
          <IconButton label={t(topic.archived ? "learningTopics.restore" : "learningTopics.archive")} icon={<ArchiveMinimalisticLinear size={16} />} onClick={() => void toggleArchive(topic)} />
        </div>)}
      </div>}
    </Card>
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} onSave={() => void save()} title={t(editing ? "learningTopics.edit" : "learningTopics.add")}>
      <div className="space-y-4">
        <label className="block space-y-1.5 text-sm text-text-secondary"><span>{t("learningTopics.fields.title")}</span><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} autoFocus /></label>
        <label className="block space-y-1.5 text-sm text-text-secondary"><span>{t("learningTopics.fields.description")}</span><Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={4} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5 text-sm text-text-secondary"><span>{t("learningTopics.fields.status")}</span><Combobox value={draft.status} options={statusOptions} onChange={(value) => setDraft({ ...draft, status: value as LearningTopicStatus })} /></label>
          <label className="space-y-1.5 text-sm text-text-secondary"><span>{t("learningTopics.fields.priority")}</span><Combobox value={String(draft.priority)} options={[1, 2, 3, 4, 5].map((priority) => ({ value: String(priority), label: String(priority) }))} onChange={(value) => setDraft({ ...draft, priority: Number(value) })} /></label>
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setModalOpen(false)}>{t("learningTopics.cancel")}</Button><Button onClick={() => void save()}>{t("learningTopics.save")}</Button></div>
      </div>
    </Modal>
  </div>;
}
