import { create } from "zustand";

interface HistoryEntry {
  key: string;
  path: string;
}

interface NavigationHistoryState {
  stack: HistoryEntry[];
  index: number;
  canGoBack: boolean;
  canGoForward: boolean;
  track: (key: string, path: string) => void;
}

export const useNavigationHistoryStore = create<NavigationHistoryState>((set, get) => ({
  stack: [],
  index: -1,
  canGoBack: false,
  canGoForward: false,

  track: (key, path) => {
    const { stack, index } = get();
    if (stack[index]?.key === key) return;

    const forwardMatch = stack[index + 1]?.key === key;
    const backMatch = stack[index - 1]?.key === key;
    if (forwardMatch) {
      const nextIndex = index + 1;
      set({ index: nextIndex, canGoBack: nextIndex > 0, canGoForward: nextIndex < stack.length - 1 });
      return;
    }
    if (backMatch) {
      const nextIndex = index - 1;
      set({ index: nextIndex, canGoBack: nextIndex > 0, canGoForward: nextIndex < stack.length - 1 });
      return;
    }

    const nextStack = [...stack.slice(0, index + 1), { key, path }];
    const nextIndex = nextStack.length - 1;
    set({ stack: nextStack, index: nextIndex, canGoBack: nextIndex > 0, canGoForward: false });
  },
}));
