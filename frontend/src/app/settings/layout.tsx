import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent settings",
  description:
    "Edit your agent's identity, capabilities, and rates, or pause it from accepting new tasks.",
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
