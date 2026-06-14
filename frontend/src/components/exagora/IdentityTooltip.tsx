import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortAddress } from "@/lib/contracts";

type IdentityTooltipProps = {
  address: string;
  role: string;
  children?: ReactNode;
};

export function IdentityTooltip({
  address,
  role,
  children,
}: IdentityTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex cursor-help items-center border-b border-dotted border-current/55 font-mono"
          tabIndex={0}
        >
          {children ?? shortAddress(address)}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <span className="block text-[10px] uppercase text-background/65">
          {role}
        </span>
        <span className="mt-1 block break-all font-mono text-[11px]">
          {address}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
