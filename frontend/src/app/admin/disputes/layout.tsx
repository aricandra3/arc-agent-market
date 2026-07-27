import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dispute resolution",
  description:
    "Split the escrow of disputed tasks between requester and provider.",
  robots: { index: false, follow: false },
};

export default function DisputesAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
