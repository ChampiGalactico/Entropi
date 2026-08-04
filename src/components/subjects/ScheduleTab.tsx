import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, PenLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { Modal } from "../ui/Modal";
import { Combobox } from "../ui/Combobox";
import { TimePicker } from "../ui/TimePicker";
import { EmptyState } from "../ui/EmptyState";
import { SolarIcon } from "../ui/SolarIcon";
import {
  createClassSession,
  deleteClassSession,
  getSubject,
  listClassSessions,
  updateClassSession,
} from "../../db/queries/subjects";
import { createLookupRow, listLookupRows } from "../../db/queries/lookups";
import { createLocation, listLocations } from "../../db/queries/locations";
import { createProfessor, listProfessors } from "../../db/queries/professors";
import { ACCENT_PRESETS } from "../../lib/accentColors";
import type { ClassSession, Location, Professor, SessionType } from "../../types";

export interface ScheduleTabProps {
  subjectId: number;
}

interface FormState {
  session_type_id: number | null;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  location_id: number | null;
  professor_id: number | null;
}

const EMPTY_FORM: FormState = {
  session_type_id: null,
  days_of_week: [0],
  start_time: "09:00",
  end_time: "10:00",
  location_id: null,
  professor_id: null,
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function ScheduleTab({ subjectId }: ScheduleTabProps) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [defaultProfessorId, setDefaultProfessorId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function reloadSessions() {
    const data = await listClassSessions(subjectId);
    setSessions(data);
  }

  async function reloadSessionTypes() {
    const data = await listLookupRows<SessionType>("session_types");
    setSessionTypes(data);
    return data;
  }

  async function reloadLocations() {
    const data = await listLocations();
    setLocations(data);
    return data;
  }

  async function reloadProfessors() {
    const data = await listProfessors();
    setProfessors(data);
    return data;
  }

  useEffect(() => {
    void reloadSessions();
    void reloadSessionTypes();
    void reloadLocations();
    void reloadProfessors();
    void getSubject(subjectId).then((subject) => setDefaultProfessorId(subject?.professor_id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, session_type_id: sessionTypes[0]?.id ?? null, professor_id: defaultProfessorId });
    setModalOpen(true);
  }

  function openEdit(session: ClassSession) {
    setEditingId(session.id);
    setForm({
      session_type_id: session.session_type_id,
      days_of_week: [session.day_of_week],
      start_time: session.start_time,
      end_time: session.end_time,
      location_id: session.location_id,
      professor_id: session.professor_id,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (form.session_type_id === null) return;
    if (form.days_of_week.length === 0) return;
    const sharedValues = {
      subject_id: subjectId,
      session_type_id: form.session_type_id,
      start_time: form.start_time,
      end_time: form.end_time,
      location_id: form.location_id,
      professor_id: form.professor_id,
    };
    if (editingId === null) {
      await Promise.all(form.days_of_week.map((day) => createClassSession({ ...sharedValues, day_of_week: day })));
    } else {
      const [firstDay, ...additionalDays] = form.days_of_week;
      await updateClassSession(editingId, { ...sharedValues, day_of_week: firstDay });
      await Promise.all(additionalDays.map((day) => createClassSession({ ...sharedValues, day_of_week: day })));
    }
    setModalOpen(false);
    await reloadSessions();
  }

  async function handleDelete(id: number) {
    await deleteClassSession(id);
    await reloadSessions();
  }

  async function handleCreateSessionType(label: string) {
    const color = ACCENT_PRESETS[Math.floor(Math.random() * ACCENT_PRESETS.length)].hex;
    const id = await createLookupRow("session_types", { name: label, color, icon: null });
    await reloadSessionTypes();
    setForm((f) => ({ ...f, session_type_id: id }));
  }

  async function handleCreateLocation(label: string) {
    const id = await createLocation({
      name: label,
      building: null,
      room: null,
      type: "physical",
      link: null,
      notes: null,
    });
    await reloadLocations();
    setForm((f) => ({ ...f, location_id: id }));
  }

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

  function toggleDay(day: number) {
    setForm((current) => ({
      ...current,
      days_of_week: current.days_of_week.includes(day)
        ? current.days_of_week.filter((item) => item !== day)
        : [...current.days_of_week, day].sort((a, b) => a - b),
    }));
  }

  function sessionTypeFor(id: number) {
    return sessionTypes.find((s) => s.id === id) ?? null;
  }

  function locationFor(id: number | null) {
    if (id === null) return null;
    return locations.find((l) => l.id === id) ?? null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t("subjects.schedule.title")}</h3>
        <Button variant="secondary" onClick={openCreate} className="flex items-center gap-1.5">
          <AddCircleLinear size={16} />
          {t("subjects.schedule.add")}
        </Button>
      </div>

      {sessions.length === 0 && <EmptyState title={t("subjects.schedule.empty")} />}

      {sessions.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-hover text-left text-xs font-medium text-text-secondary">
                <th className="px-4 py-2.5 font-medium">{t("subjects.schedule.day")}</th>
                <th className="px-4 py-2.5 font-medium">{t("subjects.schedule.type")}</th>
                <th className="px-4 py-2.5 font-medium">{t("subjects.schedule.time")}</th>
                <th className="px-4 py-2.5 font-medium">{t("subjects.schedule.location")}</th>
                <th className="px-4 py-2.5 font-medium">{t("subjects.schedule.professor")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("settings.lookup.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, i) => {
                const type = sessionTypeFor(session.session_type_id);
                const location = locationFor(session.location_id);
                return (
                  <tr
                    key={session.id}
                    className={`transition-colors duration-150 hover:bg-surface-hover ${
                      i !== sessions.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 text-text-primary">
                      {t(`common.days.${DAY_KEYS[session.day_of_week]}`)}
                    </td>
                    <td className="px-4 py-2.5">
                      {type && (
                        <span className="inline-flex items-center gap-1.5 text-text-primary">
                          {type.icon ? (
                            <SolarIcon name={type.icon} size={14} color={type.color} />
                          ) : (
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                          )}
                          {type.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {session.start_time} – {session.end_time}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{location?.name ?? "—"}</td>
                    <td className="px-4 py-2.5 text-text-secondary">{professors.find((professor) => professor.id === session.professor_id)?.name ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          label={t("settings.lookup.edit")}
                          icon={<PenLinear size={16} />}
                          onClick={() => openEdit(session)}
                        />
                        <IconButton
                          label={t("settings.lookup.delete")}
                          icon={<TrashBinTrashLinear size={16} />}
                          onClick={() => void handleDelete(session.id)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => void handleSave()}
        title={editingId === null ? t("subjects.schedule.addTitle") : t("subjects.schedule.editTitle")}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("subjects.schedule.day")}
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_KEYS.map((key, day) => {
                const active = form.days_of_week.includes(day);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-xl px-1 py-2.5 text-xs font-medium transition-all ${active ? "bg-accent text-white shadow-sm" : "bg-control text-text-secondary hover:bg-surface-hover hover:text-text-primary"}`}
                  >
                    {t(`common.daysShort.${key}`)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-text-muted">{t("subjects.schedule.multiDayHint")}</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("subjects.schedule.professor")}
            </label>
            <Combobox
              value={form.professor_id !== null ? String(form.professor_id) : ""}
              onChange={(value) => setForm((current) => ({ ...current, professor_id: value ? Number(value) : null }))}
              options={[
                { value: "", label: t("subjects.schedule.noProfessor") },
                ...professors.map((professor) => ({ value: String(professor.id), label: professor.name })),
              ]}
              searchable
              creatable
              onCreate={(name) => void handleCreateProfessor(name)}
              createLabel={(name) => t("subjects.form.createProfessor", { name })}
              placeholder={t("subjects.schedule.selectProfessor")}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("subjects.schedule.type")}
            </label>
            <Combobox
              value={form.session_type_id !== null ? String(form.session_type_id) : null}
              onChange={(v) => setForm((f) => ({ ...f, session_type_id: Number(v) }))}
              options={sessionTypes.map((s) => ({
                value: String(s.id),
                label: s.name,
                color: s.icon ? undefined : s.color,
                icon: s.icon ? <SolarIcon name={s.icon} size={14} color={s.color} /> : undefined,
              }))}
              searchable
              creatable
              onCreate={(label) => void handleCreateSessionType(label)}
              placeholder={t("subjects.schedule.selectType")}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {t("subjects.schedule.startTime")}
              </label>
              <TimePicker
                value={form.start_time}
                onChange={(value) => setForm((current) => ({ ...current, start_time: value }))}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                {t("subjects.schedule.endTime")}
              </label>
              <TimePicker
                value={form.end_time}
                onChange={(value) => setForm((current) => ({ ...current, end_time: value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              {t("subjects.schedule.location")}
            </label>
            <Combobox
              value={form.location_id !== null ? String(form.location_id) : ""}
              onChange={(v) => setForm((f) => ({ ...f, location_id: v ? Number(v) : null }))}
              options={[
                { value: "", label: t("subjects.schedule.noLocation") },
                ...locations.map((l) => ({ value: String(l.id), label: l.name })),
              ]}
              searchable
              creatable
              onCreate={(label) => void handleCreateLocation(label)}
              placeholder={t("subjects.schedule.selectLocation")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("settings.lookup.cancel")}
            </Button>
            <Button disabled={form.days_of_week.length === 0} onClick={() => void handleSave()}>{t("settings.lookup.save")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
