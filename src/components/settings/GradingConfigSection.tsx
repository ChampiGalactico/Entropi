import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NumberInput } from "../ui/NumberInput";
import { Button } from "../ui/Button";
import { SettingsRow } from "./SettingsRow";
import { getGradingConfig, updateGradingConfig } from "../../db/queries/config";
import type { GradingConfig } from "../../types";

type FormState = Omit<GradingConfig, "id">;

export function GradingConfigSection() {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void getGradingConfig().then((config) => {
      const { id: _id, ...rest } = config;
      setForm(rest);
    });
  }, []);

  async function handleSave() {
    if (!form) return;
    await updateGradingConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!form) return null;

  return (
    <div className="flex flex-col">
      <h3 className="pb-1 text-sm font-semibold text-text-primary">{t("settings.grading.title")}</h3>

      <SettingsRow label={t("settings.grading.scaleMin")}>
        <NumberInput
          step={0.1}
          value={form.scale_min}
          onValueChange={(value) => setForm((f) => f && { ...f, scale_min: Number(value) })}
          className="w-24 text-right"
        />
      </SettingsRow>

      <SettingsRow label={t("settings.grading.scaleMax")}>
        <NumberInput
          step={0.1}
          value={form.scale_max}
          onValueChange={(value) => setForm((f) => f && { ...f, scale_max: Number(value) })}
          className="w-24 text-right"
        />
      </SettingsRow>

      <SettingsRow label={t("settings.grading.minPassing")}>
        <NumberInput
          step={0.1}
          value={form.min_passing_grade}
          onValueChange={(value) => setForm((f) => f && { ...f, min_passing_grade: Number(value) })}
          className="w-24 text-right"
        />
      </SettingsRow>

      <SettingsRow
        label={t("settings.grading.decimalPlaces")}
        description={t("settings.grading.decimalPlacesHint")}
      >
        <NumberInput
          min={0}
          max={8}
          step={1}
          value={form.decimal_places_display}
          onValueChange={(value) =>
            setForm((f) => f && { ...f, decimal_places_display: Number(value) })
          }
          className="w-24 text-right"
        />
      </SettingsRow>

      <div className="flex items-center gap-3 pt-4">
        <Button onClick={() => void handleSave()}>{t("settings.lookup.save")}</Button>
        {saved && <span className="text-sm text-success">{t("settings.grading.saved")}</span>}
      </div>
    </div>
  );
}
