import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleLinear, CloseCircleLinear } from "../ui/appIcons";
import { Card } from "../ui/Card";
import { getGradingConfig, listLookupRows } from "../../db/queries";
import type { SessionType } from "../../types";

interface DbSnapshot {
  scaleMin: number;
  scaleMax: number;
  minPassing: number;
  sessionTypeCount: number;
}

type Status = "checking" | "connected" | "failed";

export function DbConnectionStatus() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>("checking");
  const [snapshot, setSnapshot] = useState<DbSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [config, sessionTypes] = await Promise.all([
          getGradingConfig(),
          listLookupRows<SessionType>("session_types"),
        ]);
        if (cancelled) return;
        setSnapshot({
          scaleMin: config.scale_min,
          scaleMax: config.scale_max,
          minPassing: config.min_passing_grade,
          sessionTypeCount: sessionTypes.length,
        });
        setStatus("connected");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {status === "connected" && <CheckCircleLinear size={20} color="var(--success)" />}
        {status === "failed" && <CloseCircleLinear size={20} color="var(--danger)" />}
        <h2 className="text-sm font-semibold text-text-primary">
          {t("dashboard.dbStatus.title")}
        </h2>
      </div>

      {status === "checking" && (
        <p className="text-sm text-text-muted">{t("dashboard.dbStatus.checking")}</p>
      )}

      {status === "connected" && snapshot && (
        <div className="flex flex-col gap-1 text-sm text-text-secondary">
          <span className="text-success">{t("dashboard.dbStatus.connected")}</span>
          <span>
            {t("dashboard.dbStatus.gradingScale")}: {snapshot.scaleMin}–{snapshot.scaleMax} (
            {t("dashboard.dbStatus.minPassing")} {snapshot.minPassing})
          </span>
          <span>
            {t("dashboard.dbStatus.sessionTypes")}: {snapshot.sessionTypeCount}
          </span>
        </div>
      )}

      {status === "failed" && (
        <div className="text-sm text-danger">
          {t("dashboard.dbStatus.failed")}
          {error && <span className="block text-xs text-text-muted">{error}</span>}
        </div>
      )}
    </Card>
  );
}
