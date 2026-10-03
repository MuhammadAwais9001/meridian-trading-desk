import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-surface-2 text-fg",
  long: "bg-long/20 text-long border border-long/30",
  short: "bg-short/20 text-short border border-short/30",
  wait: "bg-muted/20 text-muted border border-border",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
