import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";
import { EmptyState } from "../ui/EmptyState";
import { IconButton } from "../ui/IconButton";
import { Modal } from "../ui/Modal";
import { addSubjectStaff, createProfessor, listProfessors, listSubjectStaff, removeSubjectStaff } from "../../db/queries/professors";
import type { Professor, SubjectStaffMember, SubjectStaffRole } from "../../types";

export function StaffTab({ subjectId }: { subjectId: number }) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<SubjectStaffMember[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [open, setOpen] = useState(false);
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [role, setRole] = useState<SubjectStaffRole>("monitor");

  async function reload() {
    const [staff, people] = await Promise.all([listSubjectStaff(subjectId), listProfessors()]);
    setMembers(staff);
    setProfessors(people);
  }
  useEffect(() => { void reload(); }, [subjectId]);

  async function save() {
    if (professorId === null) return;
    await addSubjectStaff(subjectId, professorId, role);
    setOpen(false);
    await reload();
  }

  async function createAndSelectProfessor(name: string) {
    const id = await createProfessor({ name, email: null, phone: null, department: null, office: null, office_hours: null, notes: null });
    setProfessors(await listProfessors());
    setProfessorId(id);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-sm font-semibold text-text-primary">{t("subjects.staff.title")}</h3><p className="mt-1 text-xs text-text-muted">{t("subjects.staff.description")}</p></div>
        <Button variant="secondary" className="flex items-center gap-1.5" onClick={() => { setProfessorId(professors[0]?.id ?? null); setOpen(true); }}><AddCircleLinear size={16} />{t("subjects.staff.add")}</Button>
      </div>
      {members.length === 0 ? <EmptyState title={t("subjects.staff.empty")} /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <div key={`${member.id}-${member.role}`} className="flex items-start justify-between rounded-2xl border border-border bg-control p-4">
              <div><p className="font-medium text-text-primary">{member.name}</p><p className="mt-0.5 text-xs text-accent">{t(`subjects.staff.roles.${member.role}`)}</p>{member.email && <p className="mt-2 text-xs text-text-muted">{member.email}</p>}</div>
              <IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={16} />} onClick={() => void removeSubjectStaff(subjectId, member.id, member.role).then(reload)} />
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={t("subjects.staff.addTitle")}>
        <div className="flex flex-col gap-4">
          <label className="text-xs text-text-secondary">{t("subjects.staff.person")}<div className="mt-1"><Combobox value={professorId === null ? null : String(professorId)} onChange={(value) => setProfessorId(Number(value))} options={professors.map((professor) => ({ value: String(professor.id), label: professor.name }))} searchable creatable onCreate={(name) => void createAndSelectProfessor(name)} createLabel={(name) => t("subjects.form.createProfessor", { name })} /></div></label>
          <label className="text-xs text-text-secondary">{t("subjects.staff.role")}<div className="mt-1"><Combobox value={role} onChange={(value) => setRole(value as SubjectStaffRole)} options={[{ value: "complementary", label: t("subjects.staff.roles.complementary") }, { value: "monitor", label: t("subjects.staff.roles.monitor") }]} /></div></label>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
