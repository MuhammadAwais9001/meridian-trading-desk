import * as React from "react";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  value = [0],
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  ...props
}: {
  className?: string;
  value?: number[];
  onValueChange?: (v: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      className={cn(
        "w-full h-1.5 appearance-none rounded-full bg-surface-2 accent-accent cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
