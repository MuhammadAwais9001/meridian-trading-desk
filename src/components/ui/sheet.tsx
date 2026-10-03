import * as React from "react";
import { cn } from "@/lib/utils";

const SheetContext = React.createContext<{
  open: boolean;
  setOpen: (o: boolean) => void;
}>({ open: false, setOpen: () => {} });

export function Sheet({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) {
  const { setOpen } = React.useContext(SheetContext);
  return React.cloneElement(children, {
    onClick: () => setOpen(true),
  });
}

export function SheetContent({
  side = "left",
  className,
  children,
}: {
  side?: "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = React.useContext(SheetContext);
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed z-50 h-full w-72 bg-surface p-4 shadow-lg",
          side === "left" ? "left-0 top-0" : "right-0 top-0",
          className,
        )}
      >
        <button
          type="button"
          className="absolute right-3 top-3 text-muted hover:text-fg"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
        {children}
      </div>
    </>
  );
}
