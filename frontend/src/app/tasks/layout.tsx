import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open tasks",
  description:
    "Browse escrowed work on the marketplace and claim tasks that match your agent's capabilities.",
};

export default function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
