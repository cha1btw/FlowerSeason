export type InterestValue =
  | "decor"
  | "workshops"
  | "gifts"
  | "flower-bar"
  | "other";

export const siteContent = {
  brand: {
    name: "CHRISTMAS BY FLOWER SEASON",
    shortName: "FLOWER SEASON",
    logoLight: "/brand/logo-white.png",
  },
  seo: {
    title: "Christmas by Flower Season — святкові рішення для бізнесу",
    description:
      "Святкове оформлення, корпоративні подарунки, Christmas workshops і flower bar для команд, клієнтів та подій.",
    ogImage: "/og.jpg",
  },
  gateway: {
    seo: {
      title: "Flower Season — Christmas 2026 / 27",
      description:
        "Святкове оформлення, подарунки та майстер-класи від Flower Season у Києві. Для бізнесу та для приватних гостей.",
    },
    eyebrow: "SEASON 2026 / 27",
    prompt: "ОБЕРІТЬ НАПРЯМ",
    headline: "Святковий сезон\nвід Flower Season",
    options: [
      {
        id: "business",
        index: "01",
        title: "FOR BUSINESS",
        tags: "Оформлення · Подарунки · Workshops",
        focus: "50% 62%",
        description:
          "Святкове оформлення, корпоративні подарунки та майстер-класи для вашої команди.",
        cta: "ПЕРЕЙТИ",
        href: "/business",
        image: "/media/hero.webp",
        imageAlt: "Різдвяний вінок зі свічкою та сухими цитрусами",
      },
      {
        id: "individuals",
        index: "02",
        title: "FOR INDIVIDUALS",
        tags: "Відкриті майстер-класи · Заявка онлайн",
        focus: "50% 55%",
        description:
          "Відкриті новорічні майстер-класи: оберіть дату й залиште заявку онлайн.",
        cta: "ОБРАТИ ДАТУ",
        href: "/workshops",
        image: "/media/workshops-main.webp",
        imageAlt: "Учасниці створюють різдвяні вінки на майстер-класі",
      },
    ],
  },
  navigation: {
    openLabel: "Відкрити меню",
    closeLabel: "Закрити меню",
    menuLabel: "Головна навігація",
    links: [
      { label: "Decor", href: "#decor" },
      { label: "Workshops", href: "#workshops" },
      { label: "For individuals", href: "/workshops" },
      { label: "Gifts", href: "#gifts" },
      { label: "Projects", href: "#projects" },
      { label: "Contact", href: "#contact" },
    ],
  },
  hero: {
    eyebrow: "SEASON 2026 / 27",
    title: "CHRISTMAS\nBY FLOWER SEASON",
    subtitle:
      "Святкове оформлення, корпоративні подарунки та майстер-класи для вашої команди.",
    cta: "ОБГОВОРИТИ ПРОЄКТ",
    ctaHref: "#contact",
    image: "/media/hero.webp",
    imageAlt: "Різдвяна композиція з ялинових гілок, свічки та сухих цитрусів",
    scrollLabel: "Гортайте вниз",
  },
  create: {
    id: "create",
    index: "02",
    title: "WHAT WE CREATE",
    subtitle:
      "Створюємо Christmas для бізнесів — від оформлення простору до подарунків для команди та святкових подій.",
    actionLabel: "ДЕТАЛЬНІШЕ ↓",
    items: [
      {
        number: "01",
        title: "CHRISTMAS DECOR",
        description:
          "Святкове оформлення просторів та подій — від концепції до реалізації.",
        href: "#decor",
        image: "/media/create-decor.webp",
        imageAlt: "Різдвяний вінок з живої хвої та оливковою стрічкою",
      },
      {
        number: "02",
        title: "CORPORATE WORKSHOPS",
        description:
          "Різдвяні майстер-класи для команд, клієнтів та гостей ваших подій.",
        href: "#workshops",
        image: "/media/create-workshops.webp",
        imageAlt: "Учасники різдвяного майстер-класу створюють композиції",
      },
      {
        number: "03",
        title: "CORPORATE GIFTS",
        description:
          "Подарунки для команди, клієнтів і партнерів з можливістю персоналізації.",
        href: "#gifts",
        image: "/media/create-gifts.webp",
        imageAlt: "Персоналізований різдвяний подарунковий бокс",
      },
    ],
  },
  decor: {
    id: "decor",
    index: "03",
    title: "CHRISTMAS DECOR",
    subtitle: "Від концепції до готового святкового простору.",
    description:
      "Створюємо Christmas-оформлення для бізнесів, просторів та подій. Розробляємо концепцію, підбираємо флористику й декор, готуємо всі необхідні елементи та беремо на себе реалізацію, монтаж і демонтаж.",
    tags:
      "Офіси · ресторани · магазини · шоуруми · корпоративні події · святкові вечері",
    services: [
      "Ялинки",
      "Святкові столи",
      "Фотозони",
      "Welcome-зони",
      "Флористика",
      "Сезонний декор",
    ],
    process: "CONCEPT · FLORISTRY · DECOR · PRODUCTION · INSTALLATION",
    cta: "ОБГОВОРИТИ ОФОРМЛЕННЯ",
    interest: "decor" as InterestValue,
    images: [
      {
        src: "/media/decor-wide.webp",
        alt: "Святковий стіл з хвойним декором та високими свічками",
      },
      {
        src: "/media/decor-portrait.webp",
        alt: "Флористка з різдвяним вінком біля оформленої вітрини",
      },
      {
        src: "/media/decor-detail.webp",
        alt: "Темна хвойна композиція з теплими гірляндами",
      },
    ],
  },
  workshops: {
    id: "workshops",
    index: "04",
    title: "CORPORATE WORKSHOPS",
    subtitle: "Christmas, створений власноруч.",
    description:
      "Організовуємо камерні та масштабні різдвяні майстер-класи для команд і гостей бренду. Ми привозимо матеріали, інструменти та флористів — вам залишається зібратися разом і створити власний святковий об’єкт.",
    details: [
      "Різдвяні вінки та композиції",
      "Формат у вашому офісі або на обраній локації",
      "Повний комплект матеріалів для кожного учасника",
      "Брендинг, подарункове пакування та фотосупровід",
    ],
    note: "Підходить для камерних команд і подій до 100+ гостей.",
    cta: "ОРГАНІЗУВАТИ МАЙСТЕР-КЛАС",
    publicCta: "ЗАПИС НА ВІДКРИТІ МАЙСТЕР-КЛАСИ",
    publicHref: "/workshops",
    interest: "workshops" as InterestValue,
    media: {
      image: "/media/workshops-main.webp",
      imageAlt: "Команда створює різдвяні вінки на майстер-класі",
      detail: "/media/workshops-detail.webp",
      detailAlt: "Робота зі стрічками під час майстер-класу",
      kit: "/media/workshops-kit.webp",
      kitAlt: "Фірмові набори Flower Season для учасників",
      video: "/media/workshop.mp4",
      videoPoster: "/media/workshops-kit.webp",
      videoLabel: "Процес створення різдвяного вінка",
    },
  },
  gifts: {
    id: "gifts",
    index: "05",
    title: "CORPORATE GIFTS",
    subtitle: "Продумані подарунки, які хочеться залишити собі.",
    description:
      "Створюємо святкові бокси й флористичні подарунки для команди, клієнтів і партнерів. Розробляємо композицію під бюджет, додаємо продукцію вашого бренду та персоналізуємо пакування.",
    details: [
      "Тираж від камерної серії до великого корпоративного замовлення",
      "Листівки, стрічки й пакування у стилі вашого бренду",
      "Адресне комплектування та доставка",
    ],
    cta: "ОБГОВОРИТИ ПОДАРУНКИ",
    interest: "gifts" as InterestValue,
    images: [
      {
        src: "/media/gifts-main.webp",
        alt: "Подарунковий бокс з хвоєю, декором і листівкою",
      },
      {
        src: "/media/gifts-grid.webp",
        alt: "Серія персоналізованих корпоративних подарунків",
      },
    ],
  },
  flowerBar: {
    id: "flower-bar",
    index: "06",
    title: "FLOWER BAR",
    subtitle: "Жива флористична взаємодія для вашої події.",
    description:
      "Створюємо pop-up flower bar, де гості обирають квіти, сезонну хвою та деталі, а наші флористи збирають персональний букет або композицію просто на події. Формат легко інтегрується у запуск, корпоративний вечір чи клієнтський день.",
    details: [
      "Концепція та стилізація зони",
      "Сезонна флористика й матеріали",
      "Команда флористів на локації",
      "Брендоване пакування для гостей",
    ],
    cta: "ХОЧУ FLOWER BAR",
    interest: "flower-bar" as InterestValue,
    media: {
      main: "/media/flower-bar-main.webp",
      mainAlt: "Брендована квіткова композиція для корпоративної події",
      video: "/media/flower-bar.mp4",
      videoPoster: "/media/flower-bar-detail.webp",
      videoLabel: "Квіткові композиції на події",
    },
  },
  projects: {
    id: "projects",
    index: "PROJECTS",
    title: "SELECTED MOMENTS",
    subtitle:
      "Фрагменти святкових проєктів, створених для просторів, брендів і команд.",
    items: [
      {
        title: "SPACE DECOR",
        meta: "RESTAURANT · KYIV",
        image: "/media/project-matilda.webp",
        alt: "Монтаж великого хвойного вінка біля ресторану",
      },
      {
        title: "TABLE SETTING",
        meta: "PRIVATE EVENT · KYIV",
        image: "/media/project-table.webp",
        alt: "Персоналізоване різдвяне сервірування столу",
      },
      {
        title: "FLOWER SEASON EXPERIENCE",
        meta: "CORPORATE EVENT · KYIV",
        image: "/media/decor-portrait.webp",
        alt: "Флористка Flower Season завершує святкове оформлення",
      },
    ],
  },
  contact: {
    id: "contact",
    index: "07",
    title: "LET’S CREATE YOUR CHRISTMAS",
    subtitle:
      "Розкажіть коротко про ваш запит — ми запропонуємо формат, уточнимо деталі та підготуємо індивідуальну концепцію.",
    image: "/media/contact.webp",
    imageAlt: "Різдвяний вінок у процесі створення",
    fields: {
      name: { label: "Ім’я", placeholder: "Ваше ім’я" },
      company: { label: "Компанія", placeholder: "Назва компанії" },
      contact: {
        label: "Телефон / Telegram",
        placeholder: "+380 або @username",
      },
      interest: {
        label: "Що вас цікавить?",
        placeholder: "Оберіть напрям",
      },
      message: {
        label: "Коротко про ваш запит",
        placeholder: "Формат, дата, кількість гостей або орієнтовний бюджет",
      },
    },
    options: [
      { value: "decor" as InterestValue, label: "Christmas Decor" },
      { value: "workshops" as InterestValue, label: "Corporate Workshop" },
      { value: "gifts" as InterestValue, label: "Corporate Gifts" },
      { value: "flower-bar" as InterestValue, label: "Flower Bar" },
      { value: "other" as InterestValue, label: "Інше" },
    ],
    submit: "НАДІСЛАТИ",
    submitting: "НАДСИЛАЄМО…",
    success: "Дякуємо! Ми зв’яжемося з вами найближчим часом.",
    successDialog: {
      eyebrow: "ЗАЯВКА НАДІСЛАНА",
      title: "Дякуємо за ваш запит.",
      close: "ЗРОЗУМІЛО",
      closeLabel: "Закрити повідомлення про успішне надсилання заявки",
    },
    directPrefix: "Або напишіть нам напряму в Telegram",
    directLabel: "@rudnitskaya_n",
    privacy: "Надсилаючи форму, ви погоджуєтеся на обробку контактних даних.",
  },
  contacts: {
    telegram: {
      label: "Telegram",
      display: "@rudnitskaya_n",
      url: "https://t.me/rudnitskaya_n",
    },
    instagram: {
      label: "Instagram",
      display: "flowerseason.by.ar",
      url: "https://www.instagram.com/flowerseason.by.ar",
    },
    phone: {
      label: "Phone",
      display: "+380 50 311 45 59",
      url: "tel:+380503114559",
    },
  },
  footer: {
    copyright: "© FLOWER SEASON",
    location: "KYIV · UKRAINE",
    backToTop: "НАГОРУ ↑",
  },
  // DRAFT copy for the public booking page: the owner must confirm every claim
  // (what is included, location, duration) before sales open.
  workshopsPage: {
    seo: {
      title: "Новорічні майстер-класи — Flower Season",
      description:
        "Запишіться на різдвяний майстер-клас Flower Season у Києві: оберіть дату, залиште заявку й створіть власний святковий декор.",
    },
    navigation: {
      openLabel: "Відкрити меню",
      closeLabel: "Закрити меню",
      menuLabel: "Навігація",
      links: [
        { label: "About", href: "/workshops#about" },
        { label: "How it works", href: "/workshops#how" },
        { label: "Schedule", href: "/workshops#schedule" },
        { label: "For business", href: "/business" },
      ],
    },
    hero: {
      eyebrow: "NEW YEAR WORKSHOPS 2026 / 27",
      title: "CHRISTMAS\nWORKSHOP",
      subtitle:
        "Створіть власний різдвяний декор разом із флористами Flower Season. Оберіть зручну дату та запишіться онлайн.",
      cta: "ОБРАТИ ДАТУ",
      ctaHref: "#schedule",
      image: "/media/workshops-main.webp",
      imageAlt: "Учасниці створюють різдвяні вінки на майстер-класі",
      nextDate: "НАЙБЛИЖЧА ДАТА",
      seatsLeft: "ЛИШИЛОСЬ",
    },
    about: {
      id: "about",
      index: "01",
      title: "ABOUT",
      subtitle: "Christmas, створений власноруч.",
      description:
        "Камерний майстер-клас, на якому флористи Flower Season покроково покажуть, як зібрати святкову композицію. Ви забираєте її додому.",
      details: [
        "Камерна група",
        "Матеріали й інструменти надаємо на місці",
        "Не потрібен попередній досвід",
      ],
      image: "/media/workshops-detail.webp",
      imageAlt: "Робота зі стрічками під час майстер-класу",
      gallery: [
        {
          src: "/media/workshops-kit.webp",
          alt: "Фірмові коробки Flower Season з матеріалами для майстер-класу",
        },
        {
          src: "/media/create-workshops.webp",
          alt: "Різдвяна композиція, створена на майстер-класі",
        },
      ],
      video: "/media/workshop.mp4",
      videoPoster: "/media/workshops-kit.webp",
      videoLabel: "Процес створення різдвяного вінка",
    },
    how: {
      id: "how",
      index: "02",
      title: "HOW IT WORKS",
      subtitle: "Від вибору дати до готової композиції.",
      steps: [
        {
          number: "01",
          title: "Оберіть дату",
          description:
            "Подивіться розклад, виберіть зручний день і кількість місць.",
        },
        {
          number: "02",
          title: "Залиште заявку",
          description:
            "Вкажіть контакти без реєстрації. Місце закріпиться за вами одразу, а ми побачимо заявку в Telegram.",
        },
        {
          number: "03",
          title: "Оплатіть і приходьте",
          description:
            "Ми надішлемо посилання на оплату. Після неї запис підтверджено, а нагадування прийде на email.",
        },
      ],
    },
    schedule: {
      id: "schedule",
      index: "03",
      title: "SCHEDULE",
      subtitle:
        "Оберіть дату й залиште заявку. Місце закріпиться за вами, а посилання на оплату ми надішлемо особисто.",
      minutesSuffix: "хв",
      seatsLeftSuffix: "залишилось",
      soldOut: "МІСЦЬ НЕМАЄ",
      empty: {
        title: "Найближчих дат поки немає",
        description:
          "Нові дати з’являються регулярно. Напишіть нам у Telegram, і ми повідомимо, коли відкриємо запис.",
        cta: "НАПИСАТИ В TELEGRAM",
      },
      demoLabel: "ПРИКЛАД РОЗКЛАДУ",
      demoNote:
        "Онлайн-запис відкриється найближчим часом. Поки що напишіть нам у Telegram, і ми домовимось про дату.",
      demoCta: "НАПИСАТИ В TELEGRAM",
      loadError:
        "Розклад тимчасово недоступний. Спробуйте оновити сторінку або напишіть нам у Telegram.",
    },
    help: {
      eyebrow: "ЗАЛИШИЛИСЬ ПИТАННЯ?",
      title: "Напишіть нам",
      description:
        "Допоможемо обрати дату або домовимось про окремий формат для компанії.",
      telegram: "TELEGRAM",
      business: "FOR BUSINESS",
      businessHref: "/business",
    },
    form: {
      legend: "Оберіть дату",
      ticket: "ВАША ЗАЯВКА",
      emptySelection: "Оберіть дату зі списку, щоб залишити заявку.",
      selected: "ОБРАНА ДАТА",
      fields: {
        name: { label: "Ім’я", placeholder: "Ваше ім’я" },
        phone: {
          label: "Телефон",
          placeholder: "+380 50 123 45 67",
          hint: "Напишемо вам тут (Telegram, Viber або дзвінок)",
        },
        email: {
          label: "Email",
          placeholder: "name@example.com",
          hint: "Надішлемо підтвердження та нагадування",
        },
        seats: { label: "Кількість місць" },
      },
      consentPrefix: "Я погоджуюсь з",
      consentPrivacy: "політикою конфіденційності",
      total: "ДО СПЛАТИ",
      submit: "НАДІСЛАТИ ЗАЯВКУ",
      submitting: "НАДСИЛАЄМО…",
      secure: "Платити зараз не потрібно: посилання на оплату надішле студія.",
    },
    errors: {
      invalid: "Перевірте, будь ласка, ім’я, телефон та email.",
      consent: "Щоб продовжити, підтвердьте згоду з офертою.",
      unavailable: "Ця дата вже недоступна. Оберіть іншу.",
      soldOut: "На жаль, цієї кількості місць не залишилось.",
      seatsLeft: "На цю дату залишилось місць:",
      generic: "Щось пішло не так. Спробуйте ще раз.",
    },
    booking: {
      eyebrow: "ЗАЯВКА НА МАЙСТЕР-КЛАС",
      back: "ДО РОЗКЛАДУ",
      retry: "ОБРАТИ ІНШУ ДАТУ",
      labels: {
        date: "Дата",
        time: "Час",
        seats: "Місць",
        amount: "До сплати",
      },
      views: {
        requested: {
          title: "Заявку отримано.",
          description:
            "Місце закріплено за вами. Найближчим часом ми зв’яжемося з вами й надішлемо посилання на оплату. Після оплати запис буде підтверджено, а підтвердження прийде на email.",
        },
        paid: {
          title: "Ви записані.",
          description:
            "Оплату отримано. Підтвердження надіслано на вашу пошту, а напередодні ми нагадаємо про зустріч.",
        },
        cancelled: {
          title: "Заявку скасовано.",
          description:
            "Майстер-клас у цю дату не відбудеться або запис скасовано. Якщо ви вже платили, студія зв’яжеться з вами щодо повернення коштів. Маєте питання, напишіть нам у Telegram.",
        },
      },
    },
  },
} as const;

export type SiteContent = typeof siteContent;
