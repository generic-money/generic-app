import { X } from "lucide-react";
import {
  createContext,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
};

const DialogContext = createContext<DialogContextValue | null>(null);

const useDialogContext = () => {
  const value = useContext(DialogContext);

  if (!value) {
    throw new Error("Dialog components must be used within <Dialog />");
  }

  return value;
};

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const value = useMemo(
    () => ({
      open,
      onOpenChange,
      titleId,
      descriptionId,
    }),
    [descriptionId, onOpenChange, open, titleId],
  );

  return (
    <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
  );
}

type DialogContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  showCloseButton?: boolean;
};

export function DialogContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  const { open, onOpenChange, titleId, descriptionId } = useDialogContext();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-background/75 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-3xl border border-border/70 bg-card/95 p-6 shadow-[0_35px_60px_-40px_rgba(15,23,42,0.55)] backdrop-blur",
          className,
        )}
        {...props}
      >
        {showCloseButton ? (
          <button
            type="button"
            aria-label="Close dialog"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full border border-border/70 bg-background/80 p-2 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useDialogContext();

  return (
    <h2
      id={titleId}
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useDialogContext();

  return (
    <p
      id={descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center justify-end gap-3", className)}
      {...props}
    />
  );
}
