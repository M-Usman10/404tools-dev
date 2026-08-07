import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { privacyDocument } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for 404tools.dev. What we collect, who processes it, and exactly what happens to the documents you send to the OCR API.",
  alternates: { canonical: "https://404tools.dev/privacy" },
};

export default function PrivacyPage() {
  return <LegalPage document={privacyDocument} />;
}
