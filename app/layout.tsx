import type { Metadata, Viewport } from "next";
import { Raleway } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { siteContent } from "@/lib/content";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const raleway = Raleway({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500"],
  variable: "--font-raleway",
  display: "swap",
});

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: siteContent.gateway.seo.title,
  description: siteContent.gateway.seo.description,
  applicationName: siteContent.brand.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "/",
    title: siteContent.gateway.seo.title,
    description: siteContent.gateway.seo.description,
    siteName: siteContent.brand.shortName,
    images: [
      {
        url: siteContent.seo.ogImage,
        width: 1200,
        height: 630,
        alt: siteContent.hero.imageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteContent.gateway.seo.title,
    description: siteContent.gateway.seo.description,
    images: [siteContent.seo.ogImage],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#F9F9F7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" className={raleway.variable}>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
      <Analytics />
    </html>
  );
}
