import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button, EmptyState, IconButton } from "../ui";
import { ProfessorProfileModal } from "../professors";
import { deleteProfessor, listProfessors } from "../../db/queries/professors";
import type { Professor } from "../../types";

export function ProfessorsManager() {
  const { t } = useTranslation();
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [selected, setSelected] = useState<Professor | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [startEditing, setStartEditing] = useState(false);

  async function reload() { setProfessors(await listProfessors()); }
  useEffect(() => { void reload(); }, []);

  function show(professor: Professor | null, edit = false) {
    setSelected(professor); setStartEditing(edit); setProfileOpen(true);
  }

  return <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div><h3 className="text-sm font-semibold text-text-primary">{t("settings.professors.title")}</h3><p className="mt-1 text-xs text-text-muted">{t("settings.professors.description")}</p></div>
      <Button variant="secondary" onClick={() => show(null, true)} className="flex items-center gap-1.5"><AddCircleLinear size={16} />{t("settings.professors.add")}</Button>
    </div>
    {professors.length === 0 ? <EmptyState title={t("settings.professors.empty")} /> : <div className="overflow-hidden rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface-hover text-left text-xs text-text-secondary"><tr><th className="px-4 py-2.5 font-medium">{t("settings.professors.name")}</th><th className="px-4 py-2.5 font-medium">{t("settings.professors.contact")}</th><th className="px-4 py-2.5 font-medium">{t("settings.professors.office")}</th><th className="px-4 py-2.5" /></tr></thead>
        <tbody>{professors.map((professor) => <tr key={professor.id} onDoubleClick={() => show(professor)} className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-hover">
          <td className="px-4 py-3"><button type="button" className="text-left" onClick={() => show(professor)}><span className="block font-medium text-text-primary">{professor.name}</span><span className="text-xs text-text-muted">{professor.department}</span></button></td>
          <td className="px-4 py-3 text-text-secondary">{professor.email ?? professor.phone ?? "—"}</td>
          <td className="px-4 py-3 text-text-secondary">{professor.office ?? "—"}</td>
          <td className="px-4 py-3"><div className="flex justify-end gap-1"><IconButton label={t("settings.lookup.edit")} icon={<PenLinear size={16} />} onClick={() => show(professor, true)} /><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={16} />} onClick={() => void deleteProfessor(professor.id).then(reload)} /></div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <ProfessorProfileModal professor={selected} open={profileOpen} startEditing={startEditing} onClose={() => setProfileOpen(false)} onSaved={reload} />
  </div>;
}
