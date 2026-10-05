"use server";

import { siteContent, type InterestValue } from "@/lib/content";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialContactFormState: ContactFormState = {
  status: "idle",
  message: "",
};

const interestLabels = new Map<InterestValue, string>(
  siteContent.contact.options.map((option) => [option.value, option.label]),
);

function readField(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function sendTelegramMessage(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const honeypot = readField(formData, "website", 120);
  if (honeypot) {
    return { status: "success", message: siteContent.contact.success };
  }

  const name = readField(formData, "name", 80);
  const company = readField(formData, "company", 120);
  const contact = readField(formData, "contact", 120);
  const interest = readField(formData, "interest", 40) as InterestValue;
  const message = readField(formData, "message", 1200);

  if (!name || !contact || !interestLabels.has(interest)) {
    return {
      status: "error",
      message: "Будь ласка, заповніть ім’я, контакт і оберіть напрям.",
    };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error("Telegram environment variables are not configured.");
    return {
      status: "error",
      message:
        "Не вдалося надіслати форму. Напишіть нам, будь ласка, напряму в Telegram.",
    };
  }

  const lines = [
    "<b>Новий запит із Christmas by Flower Season</b>",
    "",
    `<b>Ім’я:</b> ${escapeTelegramHtml(name)}`,
    `<b>Компанія:</b> ${escapeTelegramHtml(company || "—")}`,
    `<b>Контакт:</b> ${escapeTelegramHtml(contact)}`,
    `<b>Напрям:</b> ${escapeTelegramHtml(interestLabels.get(interest) ?? interest)}`,
    `<b>Запит:</b> ${escapeTelegramHtml(message || "—")}`,
  ];

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join("\n"),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error("Telegram API returned an error.", await response.text());
      return {
        status: "error",
        message:
          "Не вдалося надіслати форму. Спробуйте ще раз або напишіть нам у Telegram.",
      };
    }

    return { status: "success", message: siteContent.contact.success };
  } catch (error) {
    console.error("Telegram request failed.", error);
    return {
      status: "error",
      message:
        "Не вдалося надіслати форму. Спробуйте ще раз або напишіть нам у Telegram.",
    };
  }
}
