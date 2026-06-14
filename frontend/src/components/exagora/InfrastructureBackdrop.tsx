import Image from "next/image";
import { cn } from "@/lib/utils";

type InfrastructureBackdropProps = {
  className?: string;
};

export function InfrastructureBackdrop({
  className,
}: InfrastructureBackdropProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <Image
        src="/arc-agent-paths.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[72%_center] opacity-[0.18] sm:object-center sm:opacity-[0.22]"
      />
      <div className="absolute inset-y-0 left-0 w-[62%] bg-[#071426]/85" />
      <div className="absolute inset-x-0 top-0 h-20 bg-[#071426]/55" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-[#071426]/75" />
    </div>
  );
}
