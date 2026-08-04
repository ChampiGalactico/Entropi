import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { IconButton } from "../ui/IconButton";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";
import { createProfessor, deleteProfessor, listProfessors, updateProfessor } from "../../db/queries/professors";
import type { Professor } from "../../types";

type ProfessorForm = Omit<Professor, "id">;

const EMPTY_FORM: ProfessorForm = {
  name: "",
  email: null,
  phone: null,
  department: null,
  office: null,
  office_hours: null,
  notes: null,
};

export function ProfessorsManager() {
  const { t } = useTranslation();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfessorForm>(EMPTY_FORM);

  async function reload() {
    setProfessors(await listProfessors());
  }

  useEffect(() => { void reload(); }, []);

  function edit(professor?: Professor) {
    setEditingId(professor?.id ?? null);
    setForm(professor ? {
      name: professor.name,
      email: professor.email,
      phone: professor.phone,
      department: professor.department,
      office: professor.office,
      office_hours: professor.office_hours,
      notes: professor.notes,
    } : EMPTY_FORM);
    setOpen(true);
  }

  function setField(field: keyof ProfessorForm, value: string) {
    setForm((current) => ({ ...current, [field]: value.trim() ? value : null }));
  }

  async function save() {
    if (!form.name?.trim()) return;
    const values = { ...form, name: form.name.trim() };
    if (editingId === null) await createProfessor(values);
    else await updateProfessor(editingId, values);
    setOpen(false);
    await reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t("settings.professors.title")}</h3>
          <p className="mt-1 text-xs text-text-muted">{t("settings.professors.description")}</p>
        </div>
        <Button variant="secondary" onClick={() => edit()} className="flex items-center gap-1.5">
          <AddCircleLinear size={16} />{t("settings.professors.add")}
        </Button>
      </div>

      {professors.length === 0 ? <EmptyState title={t("settings.professors.empty")} /> : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-hover text-left text-xs text-text-secondary">
              <tr><th className="px-4 py-2.5 font-medium">{t("settings.professors.name")}</th><th className="px-4 py-2.5 font-medium">{t("settings.professors.contact")}</th><th className="px-4 py-2.5 font-medium">{t("settings.professors.office")}</th><th className="px-4 py-2.5" /></tr>
            </thead>
            <tbody>
              {professors.map((professor) => (
                <tr key={professor.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                  <td className="px-4 py-3"><span className="block font-medium text-text-primary">{professor.name}</span><span className="text-xs text-text-muted">{professor.department}</span></td>
                  <td className="px-4 py-3 text-text-secondary">{professor.email ?? professor.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-text-secondary">{professor.office ?? "—"}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1"><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={16} />} onClick={() => edit(professor)} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={16} />} onClick={() => void deleteProfessor(professor.id).then(reload)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId === null ? t("settings.professors.addTitle") : t("settings.professors.editTitle")}>
        <div className="grid grid-cols-2 gap-4">
          <label className="col-span-2 text-xs text-text-secondary">{t("settings.professors.name")}<Input className="mt-1" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></label>
          <label className="text-xs text-text-secondary">{t("settings.professors.email")}<Input className="mt-1" type="email" value={form.email ?? ""} onChange={(event) => setField("email", event.target.value)} /></label>
          <label className="text-xs text-text-secondary">{t("settings.professors.phone")}<Input className="mt-1" value={form.phone ?? ""} onChange={(event) => setField("phone", event.target.value)} /></label>
          <label className="text-xs text-text-secondary">{t("settings.professors.department")}<Input className="mt-1" value={form.department ?? ""} onChange={(event) => setField("department", event.target.value)} /></label>
          <label className="text-xs text-text-secondary">{t("settings.professors.office")}<Input className="mt-1" value={form.office ?? ""} onChange={(event) => setField("office", event.target.value)} /></label>
          <label className="col-span-2 text-xs text-text-secondary">{t("settings.professors.officeHours")}<Input className="mt-1" value={form.office_hours ?? ""} onChange={(event) => setField("office_hours", event.target.value)} /></label>
          <label className="col-span-2 text-xs text-text-secondary">{t("settings.professors.notes")}<Textarea className="mt-1" rows={4} value={form.notes ?? ""} onChange={(event) => setField("notes", event.target.value)} /></label>
          <div className="col-span-2 flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
