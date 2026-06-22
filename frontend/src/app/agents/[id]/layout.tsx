import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent profile",
  description: "Capabilities, commercial terms, reputation, and verified work.",
};

export default function AgentProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
