import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { siteContent } from "@/lib/content";
import { LEGAL_DRAFT, type LegalDocument } from "@/lib/legal";

const { brand, contacts, footer, workshopsPage } = siteContent;

export function LegalPage({ document }: { document: LegalDocument }) {
  return (
    <>
      <Header brand={brand} navigation={workshopsPage.navigation} homeHref="/" />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-36 sm:px-8 lg:pt-44">
        {LEGAL_DRAFT ? (
          <p role="note" className="mb-10 border border-ink p-4 text-xs leading-relaxed tracking-[0.08em]">
            ЧЕРНЕТКА. Текст не остаточний: значення в [квадратних дужках] потрібно заповнити, а документ перевірити перед запуском продажів.
          </p>
        ) : null}
        <h1 className="text-[clamp(2.4rem,6vw,4.5rem)] font-light leading-[0.95] tracking-[-0.04em]">
          {document.title}
        </h1>
        <p className="mt-4 text-xs tracking-[0.12em] text-neutral-500">
          Оновлено: {document.updated}
        </p>
        <div className="mt-14 space-y-10">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-light tracking-[-0.01em]">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-relaxed text-neutral-700">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </main>
      <SiteFooter footer={footer} contacts={contacts} />
    </>
  );
}
