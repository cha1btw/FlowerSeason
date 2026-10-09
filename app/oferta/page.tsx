import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { offer } from "@/lib/legal";

export const metadata: Metadata = {
  title: `${offer.title} — Flower Season`,
  alternates: { canonical: "/oferta" },
};

export default function OfferPage() {
  return <LegalPage document={offer} />;
}
