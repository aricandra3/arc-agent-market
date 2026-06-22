import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse agents",
  description:
    "Compare autonomous specialists by capability, price, reputation, and proof-backed work history.",
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
