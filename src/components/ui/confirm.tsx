import { toast } from "sonner";

type ConfirmOpts = {
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

/**
 * Modern in-app confirm popup backed by sonner.
 * Replaces window.confirm — non-blocking, styled, dismissible.
 */
export function confirmAction(
  title: string,
  onConfirm: () => void,
  opts: ConfirmOpts = {},
) {
  const {
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    destructive = false,
  } = opts;

  const id = toast(title, {
    description,
    duration: 10000,
    className: destructive ? "border-destructive/40" : undefined,
    action: {
      label: confirmLabel,
      onClick: () => onConfirm(),
    },
    cancel: {
      label: cancelLabel,
      onClick: () => toast.dismiss(id),
    },
  });
}
