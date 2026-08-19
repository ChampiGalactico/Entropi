import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  RemoveBlockItem,
  SideMenu,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
  type SideMenuProps,
} from "@blocknote/react";
import { useTranslation } from "react-i18next";

const BLOCK_COLORS = [
  ["default", "transparent"],
  ["gray", "#9ca3af"],
  ["brown", "#a16207"],
  ["red", "#ef4444"],
  ["orange", "#f97316"],
  ["yellow", "#eab308"],
  ["green", "#22c55e"],
  ["blue", "#3b82f6"],
  ["purple", "#a855f7"],
  ["pink", "#ec4899"],
] as const;

function ColorPalette({ kind, value, onChange }: { kind: "textColor" | "backgroundColor"; value: string; onChange: (color: string) => void }) {
  const { t } = useTranslation();
  return <section>
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">{t(`notes.blockMenu.${kind}`)}</p>
    <div className="grid grid-cols-5 gap-1.5">
      {BLOCK_COLORS.map(([color, swatch]) => <button
        key={color}
        type="button"
        aria-label={`${t(`notes.blockMenu.${kind}`)}: ${color}`}
        title={color}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); onChange(color); }}
        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-transform hover:scale-110 ${value === color ? "border-accent ring-2 ring-accent/25" : "border-border"}`}
        style={kind === "backgroundColor" ? { backgroundColor: swatch === "transparent" ? "var(--bg-control)" : swatch } : { background: "var(--bg-control)", color: swatch === "transparent" ? "var(--text-primary)" : swatch }}
      >
        {kind === "textColor" ? <span className="text-xs font-bold">A</span> : color === "default" ? <span className="h-px w-4 -rotate-45 bg-danger" /> : null}
      </button>)}
    </div>
  </section>;
}

function EntropiDragHandleMenu() {
  const { t } = useTranslation();
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, { editor, selector: (state) => state?.block });
  const props = block?.props as Record<string, unknown> | undefined;
  const supportsTextColor = typeof props?.textColor === "string";
  const supportsBackgroundColor = typeof props?.backgroundColor === "string";

  return <Components.Generic.Menu.Dropdown className="bn-menu-dropdown bn-drag-handle-menu entropi-block-menu">
    <RemoveBlockItem>{t("notes.blockMenu.delete")}</RemoveBlockItem>
    {(supportsTextColor || supportsBackgroundColor) && <div className="entropi-block-color-palettes" onMouseDown={(event) => event.stopPropagation()}>
      {supportsTextColor && <ColorPalette kind="textColor" value={String(props?.textColor)} onChange={(color) => editor.updateBlock(block!, { props: { textColor: color } })} />}
      {supportsBackgroundColor && <ColorPalette kind="backgroundColor" value={String(props?.backgroundColor)} onChange={(color) => editor.updateBlock(block!, { props: { backgroundColor: color } })} />}
    </div>}
    <TableRowHeaderItem>{t("notes.blockMenu.headerRow")}</TableRowHeaderItem>
    <TableColumnHeaderItem>{t("notes.blockMenu.headerColumn")}</TableColumnHeaderItem>
  </Components.Generic.Menu.Dropdown>;
}

export function EntropiBlockSideMenu(props: SideMenuProps) {
  return <SideMenu {...props} dragHandleMenu={EntropiDragHandleMenu} />;
}
