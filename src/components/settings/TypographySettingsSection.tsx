import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, TrashBinTrashLinear } from "../ui/appIcons";
import { Button, Combobox, IconButton, Switch, notify } from "../ui";
import { confirmDelete } from "../ui/ConfirmDialog";
import { SettingsRow } from "./SettingsRow";
import {
  DEFAULT_MONO_FONT_ID,
  DEFAULT_SANS_FONT_ID,
  useTypographyStore,
  type StoredFont,
} from "../../stores/typographyStore";

const MAX_FONT_BYTES = 12 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(["woff2", "woff", "ttf", "otf"]);

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function TypographySettingsSection() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fonts = useTypographyStore((state) => state.fonts);
  const preferences = useTypographyStore((state) => state.preferences);
  const hydrate = useTypographyStore((state) => state.hydrate);
  const addFonts = useTypographyStore((state) => state.addFonts);
  const removeFont = useTypographyStore((state) => state.removeFont);
  const setPreferences = useTypographyStore((state) => state.setPreferences);

  useEffect(() => { void hydrate(); }, [hydrate]);

  const sansOptions = [
    { value: DEFAULT_SANS_FONT_ID, label: t("settings.typography.defaultSans") },
    ...fonts.map((font) => ({ value: font.id, label: font.name })),
  ];
  const monoOptions = [
    { value: DEFAULT_MONO_FONT_ID, label: t("settings.typography.defaultMono") },
    ...fonts.map((font) => ({ value: font.id, label: font.name })),
  ];

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      const incoming: StoredFont[] = [];
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!SUPPORTED_EXTENSIONS.has(extension) || file.size > MAX_FONT_BYTES) {
          notify.error(t("settings.typography.invalidFile", { name: file.name }));
          continue;
        }
        incoming.push({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ""),
          fileName: file.name,
          dataUrl: await readAsDataUrl(file),
        });
      }
      if (incoming.length > 0) {
        await addFonts(incoming);
        notify.success(t("settings.typography.uploaded", { count: incoming.length }));
      }
    } catch (error) {
      console.error("[typography] failed to import font", error);
      notify.error(t("settings.typography.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function remove(font: StoredFont) {
    if (!(await confirmDelete({ itemName: font.name }))) return;
    await removeFont(font.id);
    notify.success(t("feedback.deleted"));
  }

  return <div className="flex flex-col">
    <div className="flex items-center justify-between gap-3 pb-1">
      <div><h3 className="text-sm font-semibold text-text-primary">{t("settings.typography.title")}</h3><p className="mt-1 text-xs text-text-muted">{t("settings.typography.description")}</p></div>
      <><input ref={inputRef} className="hidden" type="file" multiple accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf" onChange={(event) => void upload(event)} /><Button variant="secondary" disabled={uploading} className="flex shrink-0 items-center gap-1.5" onClick={() => inputRef.current?.click()}><AddCircleLinear size={16} />{t(uploading ? "settings.typography.uploading" : "settings.typography.upload")}</Button></>
    </div>
    <SettingsRow label={t("settings.typography.appFont")} description={t("settings.typography.appFontHint")}><div className="w-64"><Combobox searchable value={preferences.sansFontId} options={sansOptions} onChange={(sansFontId) => void setPreferences({ sansFontId })} /></div></SettingsRow>
    <SettingsRow label={t("settings.typography.codeFont")} description={t("settings.typography.codeFontHint")}><div className="w-64"><Combobox searchable value={preferences.monoFontId} options={monoOptions} onChange={(monoFontId) => void setPreferences({ monoFontId })} /></div></SettingsRow>
    <SettingsRow label={t("settings.typography.useMonoForApp")} description={t("settings.typography.useMonoForAppHint")}><Switch checked={preferences.useMonoForApp} onChange={(useMonoForApp) => void setPreferences({ useMonoForApp })} /></SettingsRow>
    {fonts.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{fonts.map((font) => <article key={font.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-control p-3"><div className="min-w-0 flex-1"><p className="truncate text-base text-text-primary" style={{ fontFamily: `EntropiCustom-${font.id}` }}>Aa Bb 0123 → !=</p><p className="mt-1 truncate text-[10px] text-text-muted">{font.fileName}</p></div><IconButton label={t("settings.lookup.delete")} icon={<TrashBinTrashLinear size={15} />} onClick={() => void remove(font)} /></article>)}</div>}
  </div>;
}
