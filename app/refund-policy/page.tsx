import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { refundDocument } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Refund Policy for 404tools.dev OCR API page packs. All sales are final, nothing auto-renews, pages never expire, and failed requests are never charged.",
  alternates: { canonical: "https://404tools.dev/refund-policy" },
};

export default function RefundPolicyPage() {
  return <LegalPage document={refundDocument} />;
}
