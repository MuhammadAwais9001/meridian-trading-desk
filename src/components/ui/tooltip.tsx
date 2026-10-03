import * as React from "react";

export function TooltipProvider({
  children,
  delayDuration,
}: {
  children: React.ReactNode;
  delayDuration?: number;
}) {
  return <>{children}</>;
}
