import type { SiteContent } from "@/lib/content";

type SiteFooterProps = {
  footer: SiteContent["footer"];
  contacts: SiteContent["contacts"];
  topHref?: string;
};

export function SiteFooter({ footer, contacts, topHref = "#top" }: SiteFooterProps) {
  return (
    <footer className="bg-ink px-5 py-10 text-white sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-y-10 border-t border-white/20 pt-8">
        <p className="col-span-12 text-xs tracking-[0.16em] sm:col-span-4">{footer.copyright}</p>
        <div className="col-span-12 flex flex-col gap-3 sm:col-span-5 sm:flex-row sm:gap-6">
          {[contacts.instagram, contacts.telegram, contacts.phone].map((item) => (
            <a
              key={item.url}
              href={item.url}
              target={item.url.startsWith("http") ? "_blank" : undefined}
              rel={item.url.startsWith("http") ? "noreferrer" : undefined}
              className="text-xs tracking-[0.12em] transition-opacity hover:opacity-55 active:opacity-40"
            >
              {item.label} · {item.display}
            </a>
          ))}
        </div>
        <div className="col-span-12 flex items-end justify-between sm:col-span-3 sm:block sm:text-right">
          <p className="text-[10px] tracking-[0.14em] text-white/60">{footer.location}</p>
          <a href={topHref} className="mt-4 inline-block text-xs tracking-[0.14em] transition-opacity hover:opacity-55 active:opacity-40">
            {footer.backToTop}
          </a>
        </div>
      </div>
    </footer>
  );
}
