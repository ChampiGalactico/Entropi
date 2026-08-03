import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "solar-icon-set";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import {
  createSemester,
  deleteSemester,
  listSemesters,
  updateSemester,
} from "../../db/queries/semesters";
import type { Semester } from "../../types";

interface FormState {
  name: string;
  start_date: string;
  end_date: string;
}

const EMPTY_FORM: FormState = { name: "", start_date: "", end_date: "" };

export function SemestersManager() {
  const { t } = useTranslation();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function reload() {
    setLoading(true);
    const data = await listSemesters();
    setSemesters(data);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(semester: Semester) {
    setEditingId(semester.id);
    setForm({
      name: semester.name,
      start_date: semester.start_date,
      end_date: semester.end_date,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.start_date || !form.end_date) return;
    const values = { name: form.name.trim(), start_date: form.start_date, end_date: form.end_date };
    if (editingId === null) {
      await createSemester(values);
    } else {
      await updateSemester(editingId, values);
    }
    setModalOpen(false);
    await reload();
  }

  async function handleDelete(id: number) {
    await deleteSemester(id);
    await reload();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t("settings.semesters.title")}</h3>
        <Button variant="secondary" onClick={openCreate} className="flex items-center gap-1.5">
          <AddCircleLinear size={16} />
          {t("settings.semesters.add")}
        </Button>
      </div>

      {!loading && semesters.length === 0 && (
        <EmptyState title={t("settings.semesters.empty")} />
      )}

      {semesters.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover text-left text-xs font-medium text-text-secondary">
                <th className="px-4 py-2.5 font-medium">{t("settings.semesters.name")}</th>
                <th className="px-4 py-2.5 font-medium">{t("settings.semesters.startDate")}</th>
                <th className="px-4 py-2.5 font-medium">{t("settings.semesters.endDate")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("settings.lookup.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {semesters.map((semester, i) => (
                <tr
                  key={semester.id}
                  className={`transition-colors duration-150 hover:bg-surface-hover ${
                    i !== semesters.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-text-primary">{semester.name}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{semester.start_date}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{semester.end_date}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        label={t("settings.lookup.edit")}
                        icon={<PenLinear size={16} />}
                        onClick={() => openEdit(semester)}
                      />
                      <IconButton
                        label={t("settings.lookup.delete")}
                        icon={<TrashBinTrashLinear size={16} />}
                        onClick={() => void handleDelete(semester.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId === null ? t("settings.semesters.addTitle") : t("settings.semesters.editTitle")
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("settings.semesters.name")}
            </label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {t("settings.semesters.startDate")}
              </label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {t("settings.semesters.endDate")}
              </label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("settings.lookup.cancel")}
            </Button>
            <Button onClick={() => void handleSave()}>{t("settings.lookup.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
