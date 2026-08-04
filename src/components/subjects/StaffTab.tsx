import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { Combobox } from "../ui/Combobox";
import { EmptyState } from "../ui/EmptyState";
import { IconButton } from "../ui/IconButton";
import { Modal } from "../ui/Modal";
import { SolarIcon } from "../ui/SolarIcon";
import { ColorPickerPopover } from "../ui/ColorPickerPopover";
import { IconPicker } from "../ui/IconPicker";
import { Input } from "../ui/Input";
import { addSubjectStaff, createProfessor, createTeachingRole, listProfessors, listSubjectStaff, listTeachingRoles, removeSubjectStaff, updateTeachingRole } from "../../db/queries/professors";
import type { Professor, SubjectStaffMember, TeachingRole } from "../../types";

export function StaffTab({ subjectId }: { subjectId: number }) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<SubjectStaffMember[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [roles, setRoles] = useState<TeachingRole[]>([]);
  const [open, setOpen] = useState(false);
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [roleEditorOpen, setRoleEditorOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "", color: "#6366f1", icon: null as string | null });
  const [editingMember, setEditingMember] = useState<{ professorId: number; roleId: number } | null>(null);

  async function reload() {
    const [staff, people, teachingRoles] = await Promise.all([listSubjectStaff(subjectId), listProfessors(), listTeachingRoles()]);
    setMembers(staff);
    setProfessors(people);
    setRoles(teachingRoles);
    setRoleId((current) => current ?? teachingRoles[0]?.id ?? null);
  }
  useEffect(() => { void reload(); }, [subjectId]);

  async function save() {
    if (professorId === null || roleId === null) return;
    const unchanged = editingMember?.professorId === professorId && editingMember.roleId === roleId;
    if (!unchanged) {
      await addSubjectStaff(subjectId, professorId, roleId);
      if (editingMember) await removeSubjectStaff(subjectId, editingMember.professorId, editingMember.roleId);
    }
    setOpen(false);
    setEditingMember(null);
    await reload();
  }

  async function createAndSelectProfessor(name: string) {
    const id = await createProfessor({ name, email: null, phone: null, department: null, office: null, office_hours: null, notes: null });
    setProfessors(await listProfessors());
    setProfessorId(id);
  }

  async function createAndSelectRole(name: string) {
    const id = await createTeachingRole({ name, color: "#6366f1", icon: null });
    setRoles(await listTeachingRoles());
    setRoleId(id);
  }

  function editSelectedRole() {
    const selected = roles.find((item) => item.id === roleId);
    if (!selected) return;
    setRoleForm({ name: selected.name, color: selected.color, icon: selected.icon });
    setRoleEditorOpen(true);
  }

  async function saveSelectedRole() {
    if (roleId === null || !roleForm.name.trim()) return;
    await updateTeachingRole(roleId, { ...roleForm, name: roleForm.name.trim() });
    setRoleEditorOpen(false);
    await reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div><h3 className="text-sm font-semibold text-text-primary">{t("subjects.staff.title")}</h3><p className="mt-1 text-xs text-text-muted">{t("subjects.staff.description")}</p></div>
        <Button variant="secondary" className="flex items-center gap-1.5" disabled={roles.length === 0} onClick={() => { setEditingMember(null); setProfessorId(professors[0]?.id ?? null); setRoleId(roles[0]?.id ?? null); setOpen(true); }}><AddCircleLinear size={16} />{t("subjects.staff.add")}</Button>
      </div>
      {members.length === 0 ? <EmptyState title={t("subjects.staff.empty")} /> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {members.map((member) => (
            <div key={`${member.id}-${member.role_id}`} className="flex items-start justify-between rounded-2xl border border-border bg-control p-4">
              <div><p className="font-medium text-text-primary">{member.name}</p><p className="mt-1 flex items-center gap-1.5 text-xs" style={{ color: member.role_color }}><SolarIcon name={member.role_icon} size={14} color={member.role_color} />{member.role_name}</p>{member.email && <p className="mt-2 text-xs text-text-muted">{member.email}</p>}</div>
              <div className="flex items-center gap-1"><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={16} />} onClick={() => { setEditingMember({ professorId: member.id, roleId: member.role_id }); setProfessorId(member.id); setRoleId(member.role_id); setOpen(true); }} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={16} />} onClick={() => void removeSubjectStaff(subjectId, member.id, member.role_id).then(reload)} /></div>
            </div>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => { setOpen(false); setEditingMember(null); }} onSave={() => void save()} title={editingMember ? t("subjects.staff.editMember") : t("subjects.staff.addTitle")}>
        <div className="flex flex-col gap-4">
          <label className="text-xs text-text-secondary">{t("subjects.staff.person")}<div className="mt-1"><Combobox value={professorId === null ? null : String(professorId)} onChange={(value) => setProfessorId(Number(value))} options={professors.map((professor) => ({ value: String(professor.id), label: professor.name }))} searchable creatable onCreate={(name) => void createAndSelectProfessor(name)} createLabel={(name) => t("subjects.form.createProfessor", { name })} /></div></label>
          <label className="text-xs text-text-secondary">{t("subjects.staff.role")}<div className="mt-1 flex items-center gap-2"><div className="min-w-0 flex-1"><Combobox value={roleId === null ? null : String(roleId)} onChange={(value) => setRoleId(Number(value))} options={roles.map((role) => ({ value: String(role.id), label: role.name, color: role.color, icon: <SolarIcon name={role.icon} size={16} color={role.color} /> }))} searchable creatable onCreate={(name) => void createAndSelectRole(name)} createLabel={(name) => t("subjects.staff.createRole", { name })} /></div><IconButton label={t("subjects.staff.editRole")} icon={<PenLinear size={16} />} disabled={roleId === null} onClick={editSelectedRole} /></div></label>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
        </div>
      </Modal>
      <Modal open={roleEditorOpen} onClose={() => setRoleEditorOpen(false)} onSave={() => void saveSelectedRole()} title={t("subjects.staff.editRole")}>
        <div className="flex flex-col gap-4"><div className="flex items-end gap-3"><label className="min-w-0 flex-1 text-xs text-text-secondary">{t("settings.lookup.name")}<Input className="mt-1" value={roleForm.name} onChange={(event) => setRoleForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></label><ColorPickerPopover value={roleForm.color} onChange={(color) => setRoleForm((current) => ({ ...current, color }))} /><IconPicker value={roleForm.icon} color={roleForm.color} onChange={(icon) => setRoleForm((current) => ({ ...current, icon }))} /></div><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setRoleEditorOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void saveSelectedRole()}>{t("settings.lookup.save")}</Button></div></div>
      </Modal>
    </div>
  );
}
