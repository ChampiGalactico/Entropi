import { create } from "zustand";
import { CheckCircleLinear, CloseCircleLinear } from "./appIcons";

type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; message: string }
interface ToastStore {
  items: ToastItem[];
  add: (kind: ToastKind, message: string) => number;
  remove: (id: number) => void;
}

let nextToastId = 1;
const useToastStore = create<ToastStore>((set) => ({
  items: [],
  add: (kind, message) => {
    const id = nextToastId++;
    set((state) => ({ items: [...state.items, { id, kind, message }].slice(-4) }));
    window.setTimeout(() => useToastStore.getState().remove(id), 3800);
    return id;
  },
  remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
}));

export const notify = {
  success: (message: string) => useToastStore.getState().add("success", message),
  error: (message: string) => useToastStore.getState().add("error", message),
  info: (message: string) => useToastStore.getState().add("info", message),
};

export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const remove = useToastStore((state) => state.remove);
  return <div className="pointer-events-none fixed bottom-5 right-5 z-[220] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
    {items.map((item) => {
      const color = item.kind === "success" ? "var(--success)" : item.kind === "error" ? "var(--danger)" : "var(--accent)";
      return <button key={item.id} type="button" onClick={() => remove(item.id)} className="vida-toast-enter pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-border bg-elevated/95 px-4 py-3 text-left shadow-modal backdrop-blur-3xl" style={{ borderLeft: `3px solid ${color}` }}>
        {item.kind === "success" ? <CheckCircleLinear size={19} color={color} /> : <CloseCircleLinear size={19} color={color} />}
        <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">{item.message}</span>
      </button>;
    })}
  </div>;
}
