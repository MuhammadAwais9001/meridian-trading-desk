import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (v: string) => void;
}>({ value: "", onValueChange: () => {} });

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("inline-flex rounded-md bg-surface-2 p-1", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-bg text-fg shadow-sm" : "text-muted hover:text-fg",
        className,
      )}
    >
      {children}
    </button>
  );
}
