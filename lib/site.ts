// Absolute URL of the site: used in emails and payment callbacks, where a
// relative path would be useless.
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
