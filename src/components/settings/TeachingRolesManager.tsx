import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { ColorPickerPopover } from "../ui/ColorPickerPopover";
import { EmptyState } from "../ui/EmptyState";
import { IconButton } from "../ui/IconButton";
import { IconPicker } from "../ui/IconPicker";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { SolarIcon } from "../ui/SolarIcon";
import { notify } from "../ui/Toast";
import {
  createTeachingRole,
  deleteTeachingRole,
  listTeachingRoles,
  updateTeachingRole,
} from "../../db/queries/professors";
import type { TeachingRole } from "../../types";

type RoleForm = Omit<TeachingRole, "id">;

const EMPTY_FORM: RoleForm = { name: "", color: "#6366f1", icon: null };

export function TeachingRolesManager() {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<TeachingRole[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setRoles(await listTeachingRoles());
  }

  useEffect(() => { void reload(); }, []);

  function edit(role?: TeachingRole) {
    setEditingId(role?.id ?? null);
    setForm(role ? { name: role.name, color: role.color, icon: role.icon } : EMPTY_FORM);
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    const values = { ...form, name: form.name.trim() };
    if (editingId === null) await createTeachingRole(values);
    else await updateTeachingRole(editingId, values);
    notify.success(t("settings.savedToast"));
    setOpen(false);
    await reload();
  }

  async function remove(id: number) {
    try {
      await deleteTeachingRole(id);
      setError(null);
      await reload();
    } catch {
      setError(t("settings.professors.roles.inUse"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t("settings.professors.roles.title")}</h3>
          <p className="mt-1 text-xs text-text-muted">{t("settings.professors.roles.description")}</p>
        </div>
        <Button variant="secondary" onClick={() => edit()} className="flex shrink-0 items-center gap-1.5">
          <AddCircleLinear size={16} />{t("settings.professors.roles.add")}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {roles.length === 0 ? <EmptyState title={t("settings.professors.roles.empty")} /> : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover text-left text-xs text-text-secondary">
                <th className="px-4 py-2.5 font-medium">{t("settings.lookup.color")}</th>
                <th className="px-4 py-2.5 font-medium">{t("settings.lookup.name")}</th>
                <th className="px-4 py-2.5 font-medium">{t("settings.lookup.icon")}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {roles.map((role, index) => (
                <tr key={role.id} className={`${index < roles.length - 1 ? "border-b border-border" : ""} hover:bg-surface-hover`}>
                  <td className="px-4 py-2.5"><span className="block h-4 w-4 rounded-full border border-border" style={{ backgroundColor: role.color }} /></td>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{role.name}</td>
                  <td className="px-4 py-2.5"><SolarIcon name={role.icon} size={18} color={role.color} /></td>
                  <td className="px-4 py-2.5"><div className="flex items-center justify-end gap-1"><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={16} />} onClick={() => edit(role)} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={16} />} onClick={() => void remove(role.id)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} onSave={() => void save()} title={editingId === null ? t("settings.professors.roles.addTitle") : t("settings.professors.roles.editTitle")}>
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1 text-xs font-medium text-text-secondary">{t("settings.lookup.name")}<Input className="mt-1" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoFocus /></label>
            <ColorPickerPopover value={form.color} onChange={(color) => setForm((current) => ({ ...current, color }))} />
            <IconPicker value={form.icon} color={form.color} onChange={(icon) => setForm((current) => ({ ...current, icon }))} />
          </div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setOpen(false)}>{t("settings.lookup.cancel")}</Button><Button onClick={() => void save()}>{t("settings.lookup.save")}</Button></div>
        </div>
      </Modal>
    </div>
  );
}
