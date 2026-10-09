import { sendTelegramHtml } from "./telegram.ts";

// Telegram chat ids allowed to manage everything and to receive notifications.
// ADMIN_TELEGRAM_IDS is a comma-separated list; the corporate-lead chat is the
// fallback so notifications work out of the box.
export function adminChatIds(): string[] {
  const raw = process.env.ADMIN_TELEGRAM_IDS ?? process.env.TELEGRAM_CHAT_ID ?? "";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function notifyAdmins(text: string): Promise<void> {
  const ids = adminChatIds();
  if (ids.length === 0) {
    console.error("No admin Telegram chat is configured; notification dropped.");
    return;
  }
  await Promise.all(ids.map((id) => sendTelegramHtml(id, text)));
}
