import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifier registry",
  description:
    "Register and deactivate the verifiers allowed to pass or fail work receipts.",
  robots: { index: false, follow: false },
};

export default function VerifiersAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
