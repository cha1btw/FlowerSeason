export function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// Sends an HTML-formatted message through the Bot API. Returns false on any
// failure (and logs it) so callers decide how to react.
export async function sendTelegramHtml(
  chatId: string | number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN is not configured.");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          ...extra,
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error("Telegram API returned an error.", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Telegram request failed.", error);
    return false;
  }
}
