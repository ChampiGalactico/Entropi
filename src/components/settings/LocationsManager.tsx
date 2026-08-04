import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Combobox } from "../ui/Combobox";
import { Textarea } from "../ui/Textarea";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import {
  createLocation,
  deleteLocation,
  listLocations,
  updateLocation,
} from "../../db/queries/locations";
import type { Location, LocationType } from "../../types";

interface FormState {
  name: string;
  building: string;
  room: string;
  type: LocationType;
  link: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  building: "",
  room: "",
  type: "physical",
  link: "",
  notes: "",
};

function toFormState(location: Location): FormState {
  return {
    name: location.name,
    building: location.building ?? "",
    room: location.room ?? "",
    type: location.type,
    link: location.link ?? "",
    notes: location.notes ?? "",
  };
}

export function LocationsManager() {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function reload() {
    setLoading(true);
    const data = await listLocations();
    setLocations(data);
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

  function openEdit(location: Location) {
    setEditingId(location.id);
    setForm(toFormState(location));
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    const values = {
      name: form.name.trim(),
      building: form.building || null,
      room: form.room || null,
      type: form.type,
      link: form.type === "virtual" ? form.link || null : null,
      notes: form.notes || null,
    };
    if (editingId === null) {
      await createLocation(values);
    } else {
      await updateLocation(editingId, values);
    }
    setModalOpen(false);
    await reload();
  }

  async function handleDelete(id: number) {
    await deleteLocation(id);
    await reload();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t("settings.locations.title")}</h3>
        <Button variant="secondary" onClick={openCreate} className="flex items-center gap-1.5">
          <AddCircleLinear size={16} />
          {t("settings.locations.add")}
        </Button>
      </div>

      {!loading && locations.length === 0 && (
        <EmptyState title={t("settings.locations.empty")} />
      )}

      {locations.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover text-left text-xs font-medium text-text-secondary">
                <th className="px-4 py-2.5 font-medium">{t("settings.locations.name")}</th>
                <th className="px-4 py-2.5 font-medium">{t("settings.locations.type")}</th>
                <th className="px-4 py-2.5 font-medium">{t("settings.locations.details")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("settings.lookup.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location, i) => (
                <tr
                  key={location.id}
                  className={`transition-colors duration-150 hover:bg-surface-hover ${
                    i !== locations.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 text-text-primary">{location.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge dot color={location.type === "physical" ? "var(--info)" : "var(--accent)"}>
                      {location.type === "physical"
                        ? t("settings.locations.physical")
                        : t("settings.locations.virtual")}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {[location.building, location.room].filter(Boolean).join(" · ") || location.link}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        label={t("settings.lookup.edit")}
                        icon={<PenLinear size={16} />}
                        onClick={() => openEdit(location)}
                      />
                      <IconButton
                        label={t("settings.lookup.delete")}
                        icon={<TrashBinTrashLinear size={16} />}
                        onClick={() => void handleDelete(location.id)}
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
          editingId === null ? t("settings.locations.addTitle") : t("settings.locations.editTitle")
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("settings.locations.name")}
            </label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("settings.locations.type")}
            </label>
            <Combobox
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v as LocationType }))}
              options={[
                { value: "physical", label: t("settings.locations.physical"), color: "var(--info)" },
                { value: "virtual", label: t("settings.locations.virtual"), color: "var(--accent)" },
              ]}
            />
          </div>
          {form.type === "physical" ? (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  {t("settings.locations.building")}
                </label>
                <Input
                  value={form.building}
                  onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  {t("settings.locations.room")}
                </label>
                <Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {t("settings.locations.link")}
              </label>
              <Input value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("settings.locations.notes")}
            </label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
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
