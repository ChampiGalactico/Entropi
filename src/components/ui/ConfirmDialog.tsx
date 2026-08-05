import { create } from "zustand";
import { useTranslation } from "react-i18next";
import { CloseCircleLinear } from "./appIcons";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmationRequest {
  title?: string;
  description?: string;
  itemName?: string;
  resolve: (confirmed: boolean) => void;
}

interface ConfirmationState {
  request: ConfirmationRequest | null;
  ask: (options?: Omit<ConfirmationRequest, "resolve">) => Promise<boolean>;
  answer: (confirmed: boolean) => void;
}

const useConfirmationStore = create<ConfirmationState>((set, get) => ({
  request: null,
  ask: (options = {}) => new Promise<boolean>((resolve) => {
    get().request?.resolve(false);
    set({ request: { ...options, resolve } });
  }),
  answer: (confirmed) => {
    const request = get().request;
    if (!request) return;
    set({ request: null });
    request.resolve(confirmed);
  },
}));

export function confirmDelete(options?: Omit<ConfirmationRequest, "resolve">) {
  return useConfirmationStore.getState().ask(options);
}

export function ConfirmDialogViewport() {
  const { t } = useTranslation();
  const request = useConfirmationStore((state) => state.request);
  const answer = useConfirmationStore((state) => state.answer);

  return (
    <Modal
      open={request !== null}
      onClose={() => answer(false)}
      title={request?.title ?? t("confirmation.deleteTitle")}
      maxWidthClass="max-w-md"
    >
      <div className="flex flex-col gap-5">
        <div className="flex gap-3 rounded-2xl bg-danger/10 p-4">
          <CloseCircleLinear className="mt-0.5 shrink-0 text-danger" size={21} />
          <div>
            <p className="text-sm text-text-primary">
              {request?.description ?? t("confirmation.deleteDescription", { name: request?.itemName ?? t("confirmation.thisItem") })}
            </p>
            <p className="mt-1 text-xs text-text-muted">{t("confirmation.cannotUndo")}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => answer(false)}>{t("confirmation.cancel")}</Button>
          <Button className="!bg-danger hover:!shadow-[0_8px_24px_color-mix(in_srgb,var(--danger)_25%,transparent)]" onClick={() => answer(true)}>{t("confirmation.delete")}</Button>
        </div>
      </div>
    </Modal>
  );
}
