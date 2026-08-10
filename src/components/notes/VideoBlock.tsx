import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createReactBlockSpec } from "@blocknote/react";

// BlockNote's built-in video block only ever renders a raw <video src>, which can't play a
// YouTube/Vimeo *page* URL (those aren't direct video files) — pasting one there just shows a
// broken player. This replaces that block: known YouTube/Vimeo links become a proper iframe embed,
// anything else still falls back to a plain <video> tag for direct file URLs.
function extractYouTubeId(url: string): string | null {
  return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url)?.[1] ?? null;
}

function extractVimeoId(url: string): string | null {
  return /vimeo\.com\/(?:video\/)?(\d+)/.exec(url)?.[1] ?? null;
}

function VideoEmbed({ block, editor }: { block: any; editor: any }) {
  const { t } = useTranslation();
  const url: string = block.props.url ?? "";
  const [draft, setDraft] = useState(url);

  function commit() {
    const next = draft.trim();
    if (next !== url) editor.updateBlock(block, { props: { url: next } });
  }

  if (!url) {
    return <div contentEditable={false} className="my-3 rounded-2xl border border-dashed border-border bg-control p-4">
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); } }}
        placeholder={t("notes.video.placeholder")}
        spellCheck={false}
        className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
      />
    </div>;
  }

  const youTubeId = extractYouTubeId(url);
  const vimeoId = extractVimeoId(url);

  return <div contentEditable={false} onMouseDown={(event) => event.stopPropagation()} className="my-3 overflow-hidden rounded-2xl border border-border bg-control shadow-card">
    {youTubeId ? (
      <div className="aspect-video w-full"><iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${youTubeId}`} title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
    ) : vimeoId ? (
      <div className="aspect-video w-full"><iframe className="h-full w-full" src={`https://player.vimeo.com/video/${vimeoId}`} title="Vimeo video" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>
    ) : (
      <video src={url} controls className="max-h-[480px] w-full" />
    )}
  </div>;
}

export const VideoBlock = createReactBlockSpec(
  {
    type: "video",
    propSchema: {
      backgroundColor: { default: "default" },
      name: { default: "" },
      url: { default: "" },
      caption: { default: "" },
    },
    content: "none",
  },
  { render: (props) => <VideoEmbed block={props.block} editor={props.editor} /> },
)();
