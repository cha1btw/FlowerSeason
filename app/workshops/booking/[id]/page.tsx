import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { bookingView } from "@/lib/booking/status";
import { getBookingWithSession } from "@/lib/booking/service";
import { isUuid } from "@/lib/checkout-validation";
import { siteContent } from "@/lib/content";
import { getDb } from "@/lib/db";
import { formatUah, pluralSeats } from "@/lib/format";
import { formatSessionDate, formatSessionTime } from "@/lib/time";

const { brand, contacts, footer, workshopsPage: page } = siteContent;

// The link is private to whoever sent the request, so keep it out of search engines.
export const metadata: Metadata = {
  title: page.booking.eyebrow,
  robots: { index: false, follow: false },
};

const ctaClass =
  "inline-flex min-h-12 items-center border-b border-current py-3 text-xs font-medium tracking-[0.15em] transition-opacity hover:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 active:opacity-45";

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const found = await getBookingWithSession(getDb(), id);
  if (!found) notFound();

  const { booking, session } = found;
  const view = bookingView(booking, session.status);
  const text = page.booking.views[view];

  const rows = [
    [page.booking.labels.date, formatSessionDate(session.startsAt)],
    [page.booking.labels.time, formatSessionTime(session.startsAt)],
    [page.booking.labels.seats, pluralSeats(booking.seats)],
    [page.booking.labels.amount, formatUah(booking.amountKop)],
  ];

  return (
    <>
      <Header brand={brand} navigation={page.navigation} homeHref="/" />

      <main className="mx-auto min-h-[80svh] max-w-[1600px] px-5 pb-24 pt-36 sm:px-8 lg:px-12 lg:pt-44">
        <p className="text-[11px] tracking-[0.2em]">{page.booking.eyebrow}</p>
        <h1 className="mt-10 max-w-3xl text-[clamp(2.6rem,7vw,6.5rem)] font-light leading-[0.9] tracking-[-0.045em]">
          {text.title}
        </h1>
        <p className="mt-8 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
          {text.description}
        </p>

        <dl className="mt-14 grid max-w-3xl grid-cols-2 border-y border-line sm:grid-cols-4">
          {rows.map(([label, value]) => (
            <div key={label} className="border-line py-6 pr-4 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0">
              <dt className="text-[10px] tracking-[0.16em] text-neutral-500">
                {label.toUpperCase()}
              </dt>
              <dd className="mt-3 text-lg font-light">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
          {view === "cancelled" ? (
            <Link href="/workshops#schedule" className={ctaClass}>
              {page.booking.retry}
            </Link>
          ) : (
            <Link href="/workshops" className={ctaClass}>
              {page.booking.back}
            </Link>
          )}
          {view !== "paid" ? (
            <a href={contacts.telegram.url} target="_blank" rel="noreferrer" className={ctaClass}>
              TELEGRAM
            </a>
          ) : null}
        </div>
      </main>

      <SiteFooter footer={footer} contacts={contacts} />
    </>
  );
}
