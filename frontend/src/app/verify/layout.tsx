import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verification queue",
  description:
    "Review proof receipts opened against submitted work and record a pass or fail on chain.",
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
