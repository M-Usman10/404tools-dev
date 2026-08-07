import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { termsDocument } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for 404tools.dev, covering the free developer tools, the paid OCR API, API keys, prepaid page packs and acceptable use.",
  alternates: { canonical: "https://404tools.dev/terms" },
};

export default function TermsPage() {
  return <LegalPage document={termsDocument} />;
}
