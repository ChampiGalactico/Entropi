import { SideMenuExtension } from "@blocknote/core/extensions";
import {
  SideMenu,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
  type SideMenuProps,
} from "@blocknote/react";
import { useTranslation } from "react-i18next";
import { AddCircleLinear, AltArrowLeftLinear, AltArrowRightLinear, BookmarkLinear, TrashBinTrashLinear } from "../ui/appIcons";

export interface BlockBookmarkDraft {
  blockId: string;
  blockType: string;
  blockSnapshot: string;
  plainText: string;
}

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

function blockPlainText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(blockPlainText).join(" ").replace(/\s+/g, " ").trim();
  if (!value || typeof value !== "object") return "";
  const item = value as Record<string, unknown>;
  if (typeof item.text === "string") return item.text;
  const content = blockPlainText(item.content);
  if (content) return content;
  const props = item.props as Record<string, unknown> | undefined;
  if (item.type === "columns" && props) {
    return Object.entries(props)
      .filter(([key, entry]) => /^column\d+$/.test(key) && typeof entry === "string")
      .map(([, entry]) => {
        try { return blockPlainText(JSON.parse(String(entry))); } catch { return ""; }
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return [props?.latex, props?.code, props?.caption, props?.name].find((entry) => typeof entry === "string") as string | undefined ?? "";
}

function EntropiDragHandleMenu({ onBookmarkBlock }: { onBookmarkBlock?: (draft: BlockBookmarkDraft) => void }) {
  const { t } = useTranslation();
  const Components = useComponentsContext()!;
  const editor = useBlockNoteEditor<any, any, any>();
  const block = useExtensionState(SideMenuExtension, { editor, selector: (state) => state?.block });
  const props = block?.props as Record<string, unknown> | undefined;
  const supportsTextColor = typeof props?.textColor === "string";
  const supportsBackgroundColor = typeof props?.backgroundColor === "string";

  function moveIntoPreviousBlock() {
    if (!block) return;
    try {
      editor.setTextCursorPosition(block, "end");
      if (editor.canNestBlock()) editor.nestBlock();
    } catch { /* Non-text blocks keep their node selection; BlockNote can still nest them by drag. */ }
  }

  function addChildBlock() {
    if (!block) return;
    try {
      const [child] = editor.insertBlocks([{ type: "paragraph" }], block, "after");
      editor.setTextCursorPosition(child, "start");
      if (editor.canNestBlock()) editor.nestBlock();
    } catch { /* Containers that reject children keep their original content unchanged. */ }
  }

  function moveOutOfContainer() {
    if (!block) return;
    try {
      editor.setTextCursorPosition(block, "end");
      if (editor.canUnnestBlock()) editor.unnestBlock();
    } catch { /* See moveIntoPreviousBlock. */ }
  }

  return <Components.Generic.Menu.Dropdown className="bn-menu-dropdown bn-drag-handle-menu entropi-block-menu">
    {onBookmarkBlock && block && <Components.Generic.Menu.Item onClick={() => {
      onBookmarkBlock({
        blockId: block.id,
        blockType: block.type,
        blockSnapshot: JSON.stringify(block),
        plainText: blockPlainText(block),
      });
    }} icon={<BookmarkLinear size={16} />} className="entropi-block-menu-bookmark">{t("notes.blockMenu.bookmark")}</Components.Generic.Menu.Item>}
    <div className="entropi-block-menu-separator" />
    {block && <Components.Generic.Menu.Item onClick={addChildBlock} icon={<AddCircleLinear size={16} />}>{t("notes.blockMenu.addChild")}</Components.Generic.Menu.Item>}
    {block && <Components.Generic.Menu.Item onClick={moveIntoPreviousBlock} icon={<AltArrowRightLinear size={16} />}>{t("notes.blockMenu.nest")}</Components.Generic.Menu.Item>}
    {block && <Components.Generic.Menu.Item onClick={moveOutOfContainer} icon={<AltArrowLeftLinear size={16} />}>{t("notes.blockMenu.unnest")}</Components.Generic.Menu.Item>}
    <div className="entropi-block-menu-separator" />
    {block && <Components.Generic.Menu.Item onClick={() => editor.removeBlocks([block])} icon={<TrashBinTrashLinear size={16} />} className="entropi-block-menu-delete">{t("notes.blockMenu.delete")}</Components.Generic.Menu.Item>}
    {(supportsTextColor || supportsBackgroundColor) && <div className="entropi-block-color-palettes" onMouseDown={(event) => event.stopPropagation()}>
      {supportsTextColor && <ColorPalette kind="textColor" value={String(props?.textColor)} onChange={(color) => editor.updateBlock(block!, { props: { textColor: color } })} />}
      {supportsBackgroundColor && <ColorPalette kind="backgroundColor" value={String(props?.backgroundColor)} onChange={(color) => editor.updateBlock(block!, { props: { backgroundColor: color } })} />}
    </div>}
    <TableRowHeaderItem>{t("notes.blockMenu.headerRow")}</TableRowHeaderItem>
    <TableColumnHeaderItem>{t("notes.blockMenu.headerColumn")}</TableColumnHeaderItem>
  </Components.Generic.Menu.Dropdown>;
}

export function EntropiBlockSideMenu({ onBookmarkBlock, ...props }: SideMenuProps & { onBookmarkBlock?: (draft: BlockBookmarkDraft) => void }) {
  const dragHandleMenu = () => <EntropiDragHandleMenu onBookmarkBlock={onBookmarkBlock} />;
  return <SideMenu {...props} dragHandleMenu={dragHandleMenu} />;
}
