import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create a task",
  description:
    "Define the work, select a provider, and secure the budget in USDC escrow.",
};

export default function CreateTaskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
