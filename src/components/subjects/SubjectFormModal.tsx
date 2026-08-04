import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Switch } from "../ui/Switch";
import { ColorPickerPopover } from "../ui/ColorPickerPopover";
import { DateRangePicker } from "../ui/DateRangePicker";
import { Combobox } from "../ui/Combobox";
import { createSubject, updateSubject } from "../../db/queries/subjects";
import { createProfessor, listProfessors } from "../../db/queries/professors";
import { ACCENT_PRESETS } from "../../lib/accentColors";
import type { Professor, Semester, Subject } from "../../types";

export interface SubjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  semester: Semester;
  subject?: Subject | null;
}

interface FormState {
  name: string;
  code: string;
  professor_id: number | null;
  color: string;
  start_date: string;
  end_date: string;
  is_gradable: boolean;
  credits: string;
  scale_max_override: string;
  min_passing_override: string;
}

function emptyForm(semester: Semester): FormState {
  return {
    name: "",
    code: "",
    professor_id: null,
    color: ACCENT_PRESETS[Math.floor(Math.random() * ACCENT_PRESETS.length)].hex,
    start_date: semester.start_date,
    end_date: semester.end_date,
    is_gradable: true,
    credits: "",
    scale_max_override: "",
    min_passing_override: "",
  };
}

function formFromSubject(subject: Subject): FormState {
  return {
    name: subject.name,
    code: subject.code ?? "",
    professor_id: subject.professor_id,
    color: subject.color,
    start_date: subject.start_date,
    end_date: subject.end_date,
    is_gradable: subject.is_gradable === 1,
    credits: subject.credits?.toString() ?? "",
    scale_max_override: subject.scale_max_override?.toString() ?? "",
    min_passing_override: subject.min_passing_override?.toString() ?? "",
  };
}

export function SubjectFormModal({
  open,
  onClose,
  onSaved,
  semester,
  subject = null,
}: SubjectFormModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(() =>
    subject ? formFromSubject(subject) : emptyForm(semester),
  );
  const [professors, setProfessors] = useState<Professor[]>([]);

  async function reloadProfessors() {
    const data = await listProfessors();
    setProfessors(data);
    return data;
  }

  useEffect(() => { void reloadProfessors(); }, []);

  async function handleCreateProfessor(name: string) {
    const id = await createProfessor({
      name,
      email: null,
      phone: null,
      department: null,
      office: null,
      office_hours: null,
      notes: null,
    });
    await reloadProfessors();
    setForm((current) => ({ ...current, professor_id: id }));
  }

  useEffect(() => {
    if (open) {
      setForm(subject ? formFromSubject(subject) : emptyForm(semester));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, subject]);

  async function handleSave() {
    if (!form.name.trim()) return;
    const values = {
      semester_id: semester.id,
      name: form.name.trim(),
      code: form.code || null,
      professor: professors.find((professor) => professor.id === form.professor_id)?.name ?? null,
      professor_id: form.professor_id,
      color: form.color,
      start_date: form.start_date,
      end_date: form.end_date,
      is_gradable: (form.is_gradable ? 1 : 0) as 0 | 1,
      credits: form.credits ? Number(form.credits) : null,
      scale_max_override: form.scale_max_override ? Number(form.scale_max_override) : null,
      min_passing_override: form.min_passing_override ? Number(form.min_passing_override) : null,
      notes_content: subject?.notes_content ?? null,
    };
    if (subject) {
      await updateSubject(subject.id, values);
    } else {
      await createSubject(values);
    }
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={subject ? t("subjects.form.editTitle") : t("subjects.form.addTitle")}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("subjects.form.name")}
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>
          <ColorPickerPopover value={form.color} onChange={(hex) => setForm((f) => ({ ...f, color: hex }))} />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("subjects.form.code")}
            </label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("subjects.form.professor")}
            </label>
            <Combobox
              value={form.professor_id === null ? null : String(form.professor_id)}
              onChange={(value) => setForm((current) => ({ ...current, professor_id: Number(value) }))}
              options={professors.map((professor) => ({ value: String(professor.id), label: professor.name }))}
              searchable
              creatable
              onCreate={(name) => void handleCreateProfessor(name)}
              createLabel={(name) => t("subjects.form.createProfessor", { name })}
              placeholder={t("subjects.form.selectProfessor")}
            />
          </div>
        </div>

        <DateRangePicker
          value={{ start: form.start_date, end: form.end_date }}
          startLabel={t("subjects.form.startDate")}
          endLabel={t("subjects.form.endDate")}
          min={semester.start_date}
          max={semester.end_date}
          onChange={({ start, end }) => setForm((current) => ({
            ...current,
            start_date: start,
            end_date: end,
          }))}
        />

        <div className="flex items-center justify-between">
          <span className="text-sm text-text-primary">{t("subjects.form.isGradable")}</span>
          <Switch
            checked={form.is_gradable}
            onChange={(checked) => setForm((f) => ({ ...f, is_gradable: checked }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            {t("subjects.form.credits")}
          </label>
          <Input
            type="number"
            step="any"
            value={form.credits}
            onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
          />
        </div>

        {form.is_gradable && (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {t("subjects.form.scaleMaxOverride")}
              </label>
              <Input
                type="number"
                step="any"
                value={form.scale_max_override}
                onChange={(e) => setForm((f) => ({ ...f, scale_max_override: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {t("subjects.form.minPassingOverride")}
              </label>
              <Input
                type="number"
                step="any"
                value={form.min_passing_override}
                onChange={(e) => setForm((f) => ({ ...f, min_passing_override: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("settings.lookup.cancel")}
          </Button>
          <Button onClick={() => void handleSave()}>{t("settings.lookup.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}
