import { useTranslation } from "react-i18next";
import { useUpdateStore } from "../../stores/updateStore";
import { Button } from "./Button";
import { DownloadMinimalisticLinear, CloseCircleLinear } from "./appIcons";

export function UpdateBanner() {
  const { t } = useTranslation();
  const { status, version, notes, progress, dismissed, download, restart, dismiss } = useUpdateStore();

  if (dismissed || status === "idle" || status === "checking" || status === "up-to-date" || status === "error") {
    return null;
  }

  return (
    <div className="vida-toast-enter pointer-events-none fixed bottom-5 left-[92px] z-[220] w-[min(360px,calc(100vw-2rem))]">
      <div className="pointer-events-auto flex flex-col gap-3 rounded-2xl border border-border bg-elevated/95 p-4 shadow-modal backdrop-blur-3xl">
        <div className="flex items-start gap-3">
          <div className="vida-accent-fill flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full">
            <DownloadMinimalisticLinear size={18} color="white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary">
              {status === "ready" ? t("update.readyTitle") : t("update.availableTitle", { version })}
            </p>
            {notes && status !== "ready" && (
              <p className="mt-0.5 text-xs text-text-muted">{notes}</p>
            )}
          </div>
          {status === "available" && (
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("update.dismiss")}
              className="flex-shrink-0 text-text-muted transition-colors hover:text-text-primary"
            >
              <CloseCircleLinear size={16} />
            </button>
          )}
        </div>

        {status === "downloading" && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className="vida-accent-fill h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {status === "available" && (
          <Button variant="primary" className="w-full" onClick={() => void download()}>
            {t("update.downloadAndInstall")}
          </Button>
        )}

        {status === "ready" && (
          <Button variant="primary" className="w-full" onClick={restart}>
            {t("update.restartNow")}
          </Button>
        )}
      </div>
    </div>
  );
}
