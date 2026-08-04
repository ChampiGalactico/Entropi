import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { EmptyState } from "../ui/EmptyState";
import { ColorPickerPopover } from "../ui/ColorPickerPopover";
import { IconPicker } from "../ui/IconPicker";
import { SolarIcon } from "../ui/SolarIcon";
import { notify } from "../ui/Toast";
import {
  createLookupRow,
  countLookupRowUsage,
  deleteLookupRow,
  listLookupRows,
  updateLookupRow,
  type LookupTableName,
} from "../../db/queries/lookups";
import type { AssessmentType, EventType, SessionType, TaskType } from "../../types";

type LookupRow = SessionType | AssessmentType | EventType | TaskType;

export interface LookupTableEditorProps {
  table: LookupTableName;
  title: string;
}

interface FormState {
  name: string;
  color: string;
  icon: string | null;
}

const EMPTY_FORM: FormState = { name: "", color: "#6366f1", icon: null };

export function LookupTableEditor({ table, title }: LookupTableEditorProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await listLookupRows<LookupRow>(table);
      setRows(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row: LookupRow) {
    setEditingId(row.id);
    setForm({
      name: row.name,
      color: row.color,
      icon: "icon" in row ? row.icon : null,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    try {
      const values = { name: form.name.trim(), color: form.color, icon: form.icon };
      if (editingId === null) {
        await createLookupRow(table, values);
      } else {
        await updateLookupRow(table, editingId, values);
      }
      notify.success(t("settings.savedToast"));
      setModalOpen(false);
      await reload();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t("feedback.error"));
    }
  }

  async function handleDelete(id: number) {
    try {
      const usage = await countLookupRowUsage(table, id);
      if (usage > 0) {
        notify.error(t("settings.lookup.inUse", { count: usage }));
        return;
      }
      await deleteLookupRow(table, id);
      notify.success(t("feedback.deleted"));
      await reload();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : t("feedback.error"));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <Button variant="secondary" onClick={openCreate} className="flex items-center gap-1.5">
          <AddCircleLinear size={16} />
          {t("settings.lookup.add")}
        </Button>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {!loading && rows.length === 0 && <EmptyState title={t("settings.lookup.empty")} />}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover text-left text-xs font-medium text-text-secondary">
                <th className="px-4 py-2.5 font-medium">{t("settings.lookup.color")}</th>
                <th className="px-4 py-2.5 font-medium">{t("settings.lookup.name")}</th>
                <th className="px-4 py-2.5 font-medium">{t("settings.lookup.icon")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("settings.lookup.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`transition-colors duration-150 hover:bg-surface-hover ${
                    i !== rows.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-border"
                      style={{ backgroundColor: row.color }}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-text-primary">{row.name}</td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    <SolarIcon name={row.icon} size={18} color={row.color} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        label={t("settings.lookup.edit")}
                        icon={<PenLinear size={16} />}
                        onClick={() => openEdit(row)}
                      />
                      <IconButton
                        label={t("settings.lookup.delete")}
                        icon={<TrashBinTrashLinear size={16} />}
                        onClick={() => void handleDelete(row.id)}
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
        onSave={() => void handleSave()}
        title={editingId === null ? t("settings.lookup.addTitle") : t("settings.lookup.editTitle")}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {t("settings.lookup.name")}
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <ColorPickerPopover
              value={form.color}
              onChange={(hex) => setForm((f) => ({ ...f, color: hex }))}
            />
            <IconPicker
              value={form.icon}
              color={form.color}
              onChange={(icon) => setForm((f) => ({ ...f, icon }))}
            />
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
