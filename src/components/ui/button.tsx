import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-accent text-accent-fg hover:opacity-90",
  outline: "border border-border bg-transparent hover:bg-surface-2",
  ghost: "hover:bg-surface-2 text-muted hover:text-fg",
};

const sizes = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-xs",
  icon: "h-9 w-9",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
}) {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
