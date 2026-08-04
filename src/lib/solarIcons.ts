import type { ComponentType } from "react";
import manifest from "./solarIconManifest.json";

export type IconVariant = "Linear" | "Bold" | "Outline" | "Broken" | "BoldDuotone" | "LineDuotone";

export const ICON_VARIANTS: IconVariant[] = [
  "Linear",
  "Bold",
  "Outline",
  "Broken",
  "BoldDuotone",
  "LineDuotone",
];

export interface SolarIconEntry {
  name: string;
  variants: IconVariant[];
}

export const SOLAR_ICON_CATEGORIES = [
  "all", "arrows", "arrows-action", "astronomy", "building", "business", "call", "devices", "faces",
  "files", "folders", "food", "hands", "home", "it", "like", "list", "map",
  "medicine", "messages", "money", "nature", "notes", "notifications", "parts", "school",
  "search", "security", "settings", "shopping", "sports", "text-formatting", "time",
  "tools", "ui", "users", "video", "weather",
] as const;

export type SolarIconCategory = (typeof SOLAR_ICON_CATEGORIES)[number];

const CATEGORY_KEYWORDS: Array<[SolarIconCategory, string[]]> = [
  ["arrows-action", ["login", "logout", "upload", "download", "maximize", "minimize", "exit"]],
  ["arrows", ["arrow", "rewind", "forward", "transfer", "undo", "redo", "restart"]],
  ["astronomy", ["planet", "star", "moon", "sun", "asteroid"]],
  ["home", ["home", "sofa", "garage", "armchair", "bed"]],
  ["building", ["building", "city", "garage", "hospital"]],
  ["business", ["case", "chart", "diagram", "presentation", "target", "graph"]],
  ["call", ["call", "phone"]],
  ["devices", ["device", "laptop", "monitor", "smartphone", "tablet", "tv", "printer", "camera"]],
  ["faces", ["emoji", "face", "sad", "smile", "expressionless"]],
  ["files", ["file", "document"]],
  ["folders", ["folder"]],
  ["food", ["chef", "cup", "donut", "bottle", "wine", "tea", "food"]],
  ["hands", ["hand"]],
  ["weather", ["cloud", "rain", "snow", "wind", "temperature", "fog"]],
  ["it", ["code", "programming", "database", "server", "bug"]],
  ["like", ["heart", "like", "dislike"]],
  ["list", ["list", "checklist", "sort"]],
  ["map", ["map", "point", "compass", "route", "gps"]],
  ["medicine", ["medical", "pill", "syringe", "stethoscope", "health", "bone"]],
  ["messages", ["chat", "message", "dialog", "inbox", "letter"]],
  ["money", ["wallet", "card", "cash", "dollar", "euro", "money", "banknote"]],
  ["nature", ["leaf", "water", "fire", "paw", "tree"]],
  ["notes", ["note", "notebook", "clipboard"]],
  ["notifications", ["bell", "notification"]],
  ["parts", ["battery", "cursor", "slider", "palette", "layers"]],
  ["school", ["academic", "book", "backpack", "calculator", "diploma"]],
  ["search", ["magnifer", "search"]],
  ["security", ["lock", "shield", "key", "password", "security"]],
  ["settings", ["setting", "tuning", "widget"]],
  ["shopping", ["shop", "cart", "bag", "sale", "gift"]],
  ["sports", ["ball", "running", "swimming", "medal", "cup", "dumbbell"]],
  ["text-formatting", ["text", "paragraph", "align", "font", "hashtag"]],
  ["time", ["calendar", "clock", "watch", "alarm", "hourglass"]],
  ["tools", ["tool", "screwdriver", "hammer", "scissors", "ruler"]],
  ["users", ["user", "people"]],
  ["video", ["video", "play", "pause", "record", "gallery", "music"]],
];

export function categoryForIcon(name: string): SolarIconCategory {
  const normalized = name.toLowerCase();
  return CATEGORY_KEYWORDS.find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[0] ?? "ui";
}

export const SOLAR_ICON_MANIFEST: SolarIconEntry[] = manifest as SolarIconEntry[];

type IconComponentMap = Record<
  string,
  ComponentType<{ size?: number | string; color?: string; className?: string }>
>;

let iconComponents: IconComponentMap | null = null;
let iconComponentsPromise: Promise<IconComponentMap> | null = null;

/** Full component name, e.g. "BookLinear" for base "Book" + variant "Linear". */
export function iconFullName(base: string, variant: IconVariant): string {
  return `${base}${variant}`;
}

export function loadIconComponent(fullName: string) {
  if (iconComponents) return Promise.resolve(iconComponents[fullName] ?? null);
  if (!iconComponentsPromise) {
    iconComponentsPromise = import("solar-icon-set").then(
      (module) => (iconComponents = module as unknown as IconComponentMap),
    );
  }
  return iconComponentsPromise.then((components) => components[fullName] ?? null);
}
