import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { applySuccessfulPayment } from "@/lib/booking/payment-events";
import { getBookingWithSession, markFailed } from "@/lib/booking/service";
import { isUuid } from "@/lib/checkout-validation";
import { getDb } from "@/lib/db";
import { formatUah } from "@/lib/format";
import { isSandboxEnabled } from "@/lib/payments";

// Local stand-in for the bank's payment page. It does not exist in production.
export const metadata = { robots: { index: false, follow: false } };

export default async function SandboxPayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  if (!isSandboxEnabled()) notFound();

  const { id } = await params;
  if (!isUuid(id)) notFound();
  const found = await getBookingWithSession(getDb(), id);
  if (!found) notFound();
  const { booking } = found;

  async function pay() {
    "use server";
    if (!isSandboxEnabled()) notFound();
    await applySuccessfulPayment(getDb(), id, booking.amountKop);
    redirect(`/workshops/booking/${id}`);
  }

  async function decline() {
    "use server";
    if (!isSandboxEnabled()) notFound();
    await markFailed(getDb(), id);
    redirect(`/workshops/booking/${id}`);
  }

  return (
    <main className="mx-auto max-w-xl px-5 py-32">
      <p className="text-[11px] tracking-[0.2em]">SANDBOX PAYMENT (DEV ONLY)</p>
      <h1 className="mt-8 text-5xl font-light tracking-[-0.04em]">
        {formatUah(booking.amountKop)}
      </h1>
      <p className="mt-4 text-sm text-neutral-600">
        {booking.name} · {booking.email} · status: {booking.status}
      </p>
      <form className="mt-10 flex gap-4">
        <button formAction={pay} className="min-h-12 border border-ink bg-ink px-6 text-xs tracking-[0.16em] text-white">
          PAY
        </button>
        <button formAction={decline} className="min-h-12 border border-ink px-6 text-xs tracking-[0.16em]">
          DECLINE
        </button>
      </form>
    </main>
  );
}
