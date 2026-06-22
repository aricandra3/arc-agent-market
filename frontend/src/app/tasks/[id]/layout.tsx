import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Task details",
  description:
    "Escrow budget, deliverable, proof receipt, and settlement state for a task.",
};

export default function TaskDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
