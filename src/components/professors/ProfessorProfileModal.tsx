import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PenLinear, UserIdLinear } from "../ui/appIcons";
import { Button, Input, Modal, SolarIcon, Textarea, notify } from "../ui";
import { createProfessor, updateProfessor } from "../../db/queries/professors";
import type { Professor } from "../../types";

type ProfessorForm = Omit<Professor, "id">;

const EMPTY_FORM: ProfessorForm = {
  name: "", email: null, phone: null, department: null,
  office: null, office_hours: null, notes: null,
};

function toForm(professor: Professor | null): ProfessorForm {
  if (!professor) return EMPTY_FORM;
  const { id: _id, ...form } = professor;
  return form;
}

function Detail({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  const { t } = useTranslation();
  return <div className="rounded-2xl bg-control p-3">
    <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-text-muted"><SolarIcon name={icon} size={14} />{label}</div>
    <p className="whitespace-pre-wrap text-sm text-text-primary">{value || t("settings.professors.noInformation")}</p>
  </div>;
}

export function ProfessorProfileModal({ professor, open, onClose, onSaved, startEditing = false }: {
  professor: Professor | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (professor: Professor) => void | Promise<void>;
  startEditing?: boolean;
}) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<Professor | null>(professor);
  const [editing, setEditing] = useState(startEditing || !professor);
  const [form, setForm] = useState<ProfessorForm>(() => toForm(professor));
  const [nameInvalid, setNameInvalid] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrent(professor);
    setForm(toForm(professor));
    setEditing(startEditing || !professor);
    setNameInvalid(false);
  }, [open, professor, startEditing]);

  function setField(field: keyof ProfessorForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value.trim() ? value : null }));
  }

  async function save() {
    if (!form.name?.trim()) {
      setNameInvalid(true);
      notify.error(t("settings.professors.requiredFeedback"));
      return;
    }
    const values = { ...form, name: form.name.trim() };
    const id = current?.id ?? await createProfessor(values);
    if (current) await updateProfessor(current.id, values);
    const saved = { id, ...values };
    setCurrent(saved);
    setForm(values);
    setEditing(false);
    notify.success(t("settings.savedToast"));
    await onSaved?.(saved);
  }

  return <Modal open={open} onClose={onClose} onSave={editing ? () => void save() : undefined} title={editing ? (current ? t("settings.professors.editTitle") : t("settings.professors.addTitle")) : t("settings.professors.profileTitle")} maxWidthClass="max-w-2xl">
    {editing ? <div className="grid grid-cols-2 gap-4">
      <label className="col-span-2 text-xs text-text-secondary">{t("settings.professors.name")}<Input aria-invalid={nameInvalid} className={`mt-1 ${nameInvalid ? "!border-danger !ring-2 !ring-danger/25" : ""}`} value={form.name} onChange={(event) => { setForm((previous) => ({ ...previous, name: event.target.value })); setNameInvalid(false); }} autoFocus />{nameInvalid && <span className="mt-1 block text-[10px] text-danger">{t("grades.requiredField")}</span>}</label>
      <label className="text-xs text-text-secondary">{t("settings.professors.email")}<Input className="mt-1" type="email" value={form.email ?? ""} onChange={(event) => setField("email", event.target.value)} /></label>
      <label className="text-xs text-text-secondary">{t("settings.professors.phone")}<Input className="mt-1" value={form.phone ?? ""} onChange={(event) => setField("phone", event.target.value)} /></label>
      <label className="text-xs text-text-secondary">{t("settings.professors.department")}<Input className="mt-1" value={form.department ?? ""} onChange={(event) => setField("department", event.target.value)} /></label>
      <label className="text-xs text-text-secondary">{t("settings.professors.office")}<Input className="mt-1" value={form.office ?? ""} onChange={(event) => setField("office", event.target.value)} /></label>
      <label className="col-span-2 text-xs text-text-secondary">{t("settings.professors.officeHours")}<Input className="mt-1" value={form.office_hours ?? ""} onChange={(event) => setField("office_hours", event.target.value)} /></label>
      <label className="col-span-2 text-xs text-text-secondary">{t("settings.professors.notes")}<Textarea className="mt-1" rows={5} value={form.notes ?? ""} onChange={(event) => setField("notes", event.target.value)} /></label>
      <div className="col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => current ? setEditing(false) : onClose()}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
    </div> : current && <div>
      <div className="mb-5 flex items-center justify-between gap-4 rounded-[1.5rem] bg-[color-mix(in_srgb,var(--accent)_10%,var(--bg-control))] p-4">
        <div className="flex min-w-0 items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white"><UserIdLinear size={27} /></span><div className="min-w-0"><h3 className="truncate text-xl font-bold text-text-primary">{current.name}</h3><p className="mt-1 text-sm text-text-muted">{current.department || t("settings.professors.noInformation")}</p></div></div>
        <Button variant="secondary" className="flex shrink-0 items-center gap-2" onClick={() => setEditing(true)}><PenLinear size={16} />{t("settings.professors.edit")}</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Detail icon="LetterLinear" label={t("settings.professors.email")} value={current.email} />
        <Detail icon="PhoneLinear" label={t("settings.professors.phone")} value={current.phone} />
        <Detail icon="MapPointLinear" label={t("settings.professors.office")} value={current.office} />
        <Detail icon="ClockCircleLinear" label={t("settings.professors.officeHours")} value={current.office_hours} />
        <div className="sm:col-span-2"><Detail icon="NotesLinear" label={t("settings.professors.notes")} value={current.notes} /></div>
      </div>
    </div>}
  </Modal>;
}
