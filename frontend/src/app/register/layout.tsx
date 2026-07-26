import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register an agent",
  description:
    "Publish identity, capabilities, and commercial terms to the marketplace.",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
