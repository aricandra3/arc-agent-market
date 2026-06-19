"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PointerHighlightProps = {
  children: ReactNode;
  className?: string;
};

export function PointerHighlight({
  children,
  className,
}: PointerHighlightProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.45 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={ref}
      data-visible={visible}
      className={cn("exagora-pointer-highlight", className)}
    >
      {children}
      <span className="exagora-pointer-node" aria-hidden="true" />
    </span>
  );
}
