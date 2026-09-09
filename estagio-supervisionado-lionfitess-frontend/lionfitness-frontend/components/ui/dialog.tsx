"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DIALOG_BASE_Z_INDEX = 1100;
const DIALOG_LAYER_STEP = 20;

let openDialogIds: string[] = [];
let bodyOverflowBeforeDialogs: string | null = null;
const stackListeners = new Set<() => void>();

function emitStackChange() {
  stackListeners.forEach((listener) => listener());
}

function subscribeToStack(listener: () => void) {
  stackListeners.add(listener);
  return () => stackListeners.delete(listener);
}

function getStackSnapshot() {
  return openDialogIds.join("|");
}

function registerDialog(id: string) {
  if (openDialogIds.includes(id)) return;

  if (openDialogIds.length === 0) {
    bodyOverflowBeforeDialogs = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  openDialogIds = [...openDialogIds, id];
  emitStackChange();
}

function unregisterDialog(id: string) {
  if (!openDialogIds.includes(id)) return;

  openDialogIds = openDialogIds.filter((openId) => openId !== id);
  if (openDialogIds.length === 0) {
    document.body.style.overflow = bodyOverflowBeforeDialogs ?? "";
    bodyOverflowBeforeDialogs = null;
  }
  emitStackChange();
}

function isTopDialog(id: string) {
  return openDialogIds.at(-1) === id;
}

interface DialogContextValue {
  id: string;
  titleId: string;
  descriptionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within a Dialog");
  return context;
}

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  const reactId = React.useId();
  const dialogId = `dialog-${reactId}`;
  const [internalOpen, setInternalOpen] = React.useState(open);
  const isControlled = onOpenChange !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  const handleOpenChange = React.useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange],
  );

  const context = React.useMemo(
    () => ({
      id: dialogId,
      titleId: `${dialogId}-title`,
      descriptionId: `${dialogId}-description`,
      open: currentOpen,
      onOpenChange: handleOpenChange,
    }),
    [currentOpen, dialogId, handleOpenChange],
  );

  return <DialogContext.Provider value={context}>{children}</DialogContext.Provider>;
}

function DialogTrigger({ children, asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDialog();
  void asChild;
  return (
    <button type="button" onClick={() => onOpenChange(true)} {...props}>
      {children}
    </button>
  );
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  overlay?: "default" | "subtle";
  preventClose?: boolean;
  hideCloseButton?: boolean;
}

function DialogContent({
  className,
  children,
  overlay = "default",
  preventClose = false,
  hideCloseButton = false,
  ...props
}: DialogContentProps) {
  const { id, titleId, descriptionId, open, onOpenChange } = useDialog();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  const stackSnapshot = React.useSyncExternalStore(subscribeToStack, getStackSnapshot, () => "");
  const stackIds = stackSnapshot ? stackSnapshot.split("|") : [];
  const registeredLayerIndex = stackIds.indexOf(id);
  const layerIndex = registeredLayerIndex >= 0 ? registeredLayerIndex : stackIds.length;

  React.useEffect(() => {
    if (!open) return;

    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    registerDialog(id);

    const focusFrame = window.requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(focusFrame);
      unregisterDialog(id);
      window.requestAnimationFrame(() => returnFocusRef.current?.focus());
    };
  }, [id, open]);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog(id)) return;

      if (event.key === "Escape" && !preventClose) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [id, onOpenChange, open, preventClose]);

  if (!open || typeof document === "undefined") return null;

  const requestClose = () => {
    if (!preventClose && isTopDialog(id)) onOpenChange(false);
  };

  return createPortal(
    <div
      className="fixed inset-0 flex h-[100dvh] w-screen items-center justify-center overflow-hidden sm:p-4"
      style={{ zIndex: DIALOG_BASE_Z_INDEX + layerIndex * DIALOG_LAYER_STEP }}
      data-dialog-layer={layerIndex + 1}
    >
      <div
        className={cn(
          "absolute inset-0 transition-colors duration-200",
          overlay === "subtle" ? "bg-black/20 backdrop-blur-[1px]" : "bg-black/60 backdrop-blur-sm",
        )}
        onClick={requestClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          "relative z-10 grid max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-lg gap-4 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl outline-none animate-rise sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:p-6",
          className,
        )}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <button
            type="button"
            onClick={requestClose}
            disabled={preventClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="size-4" />
            <span className="sr-only">Fechar</span>
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, id, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialog();
  return <h2 id={id || titleId} className={cn("text-lg font-bold tracking-tight text-foreground", className)} {...props} />;
}

function DialogDescription({ className, id, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialog();
  return <p id={id || descriptionId} className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

function DialogClose({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useDialog();
  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onOpenChange(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
