import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ownership handover",
  description:
    "Complete a pending Ownable2Step ownership transfer for the protocol contracts.",
  robots: { index: false, follow: false },
};

export default function OwnershipAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
