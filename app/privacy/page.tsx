import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { privacy } from "@/lib/legal";

export const metadata: Metadata = {
  title: `${privacy.title} — Flower Season`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalPage document={privacy} />;
}
