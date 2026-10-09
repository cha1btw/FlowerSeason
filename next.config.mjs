/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Dev only: lets a tunnel (cloudflared / ngrok) reach the dev server so the
  // Telegram bot and a phone can be tried against a local run. See docs/demo.md.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok-free.dev"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
