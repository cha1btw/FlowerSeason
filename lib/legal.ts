// DRAFT legal texts. They are TEMPLATES: every [bracketed] value must be filled
// in and the whole text reviewed by the owner's accountant or lawyer before
// sales open. Set LEGAL_DRAFT to false only after that review: it hides the
// visible "draft" banner on /oferta and /privacy.
export const LEGAL_DRAFT = true;

export type LegalSection = { title: string; paragraphs: string[] };
export type LegalDocument = { title: string; updated: string; sections: LegalSection[] };

export const seller = {
  name: "[ПІБ ФОП]",
  email: "[Email для звернень]",
  phone: "+380 50 311 45 59",
  telegram: "@rudnitskaya_n",
};

export const privacy: LegalDocument = {
  title: "Політика конфіденційності",
  updated: "[Дата]",
  sections: [
    {
      title: "1. Які дані ми збираємо",
      paragraphs: [
        "Під час заявки на майстер-клас: ім’я, номер телефону, email, обрана дата й кількість місць. Дані банківської картки ми на сайті не збираємо: посилання на оплату студія надсилає окремо.",
      ],
    },
    {
      title: "2. Навіщо ми їх використовуємо",
      paragraphs: [
        "Щоб зв’язатися з вами щодо заявки й оплати, підтвердити запис, надіслати лист із деталями та нагадування про майстер-клас, повідомити про зміни, вести облік оплат.",
        "Ми не продаємо ваші дані й не використовуємо їх для сторонньої реклами.",
      ],
    },
    {
      title: "3. Кому ми їх передаємо",
      paragraphs: [
        "Лише сервісам, без яких заявка неможлива: сервіс надсилання листів Resend, хостинг Vercel і база даних [назва провайдера БД]. Також дані бачить власниця студії в Telegram.",
      ],
    },
    {
      title: "4. Скільки зберігаємо",
      paragraphs: [
        "[Термін зберігання, наприклад: 3 роки для бухгалтерського обліку, далі дані видаляються.]",
      ],
    },
    {
      title: "5. Ваші права",
      paragraphs: [
        `Ви можете запросити доступ до своїх даних, їх виправлення або видалення, написавши на ${seller.email} або в Telegram ${seller.telegram}.`,
      ],
    },
    {
      title: "6. Контакти",
      paragraphs: [`${seller.name}, ${seller.email}, ${seller.phone}`],
    },
  ],
};
