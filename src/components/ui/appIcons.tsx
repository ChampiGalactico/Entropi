import type { CSSProperties } from "react";
import { SolarIcon } from "./SolarIcon";

interface AppIconProps {
  size?: number | string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

function icon(name: string) {
  return function AppIcon({ size, color, className }: AppIconProps) {
    return <SolarIcon name={name} size={size} color={color} className={className} />;
  };
}

export const AddCircleLinear = icon("AddCircleLinear");
export const AddFolderLinear = icon("AddFolderLinear");
export const AltArrowDownLinear = icon("AltArrowDownLinear");
export const AltArrowLeftLinear = icon("AltArrowLeftLinear");
export const AltArrowRightLinear = icon("AltArrowRightLinear");
export const ArchiveMinimalisticLinear = icon("ArchiveMinimalisticLinear");
export const BookLinear = icon("BookLinear");
export const FolderLinear = icon("FolderLinear");
export const CalendarLinear = icon("CalendarLinear");
export const CheckCircleLinear = icon("CheckCircleLinear");
export const ChecklistMinimalisticLinear = icon("ChecklistMinimalisticLinear");
export const ClockCircleLinear = icon("ClockCircleLinear");
export const CloseCircleLinear = icon("CloseCircleLinear");
export const DownloadMinimalisticLinear = icon("DownloadMinimalisticLinear");
export const DisketteLinear = icon("DisketteLinear");
export const GlobalLinear = icon("GlobalLinear");
export const Home2Linear = icon("Home2Linear");
export const LightbulbBoltLinear = icon("LightbulbBoltLinear");
export const LinkCircleLinear = icon("LinkCircleLinear");
export const MagniferLinear = icon("MagniferLinear");
export const MapPointLinear = icon("MapPointLinear");
export const MoonLinear = icon("MoonLinear");
export const NotebookLinear = icon("NotebookLinear");
export const PenLinear = icon("PenLinear");
export const PrinterLinear = icon("PrinterLinear");
export const QuestionCircleLinear = icon("QuestionCircleLinear");
export const SettingsLinear = icon("SettingsLinear");
export const SquareAcademicCapLinear = icon("SquareAcademicCapLinear");
export const SunLinear = icon("SunLinear");
export const TrashBinTrashLinear = icon("TrashBinTrashLinear");
export const TuningLinear = icon("TuningLinear");
export const UserIdLinear = icon("UserIdLinear");
export const Widget2Linear = icon("Widget2Linear");
export const Widget5Linear = icon("Widget5Linear");
