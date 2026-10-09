import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/workshops/booking/", "/workshops/sandbox-pay/", "/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
