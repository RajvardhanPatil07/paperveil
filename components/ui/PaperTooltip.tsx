"use client";

import type { ReactNode } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";

export function PaperTooltipProvider({ children }: { children: ReactNode }) {
  return <Tooltip.Provider delayDuration={420}>{children}</Tooltip.Provider>;
}

export function PaperTooltip({ label, children, side = "right" }: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="paper-tooltip" side={side} sideOffset={9}>
          {label}
          <Tooltip.Arrow className="paper-tooltip-arrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
