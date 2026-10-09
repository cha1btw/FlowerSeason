import { siteUrl } from "../site.ts";
import { formatSessionDate, formatSessionTime } from "../time.ts";
import type { Booking, Session } from "../db/schema.ts";
import { createMonobankInvoice, isMonobankConfigured } from "./monobank.ts";

export type PaymentInvoice = { invoiceId: string; paymentUrl: string };

// Dev-only sandbox: lets the whole booking flow be clicked through locally
// without a real payment provider. It is hard-disabled in production because
// anyone could "pay" with it.
export const isSandboxEnabled = () => process.env.NODE_ENV !== "production";

export const SANDBOX_INVOICE_PREFIX = "sandbox_";

export async function createInvoice(
  booking: Booking,
  session: Session,
): Promise<PaymentInvoice> {
  if (isMonobankConfigured()) {
    return createMonobankInvoice({
      booking,
      session,
      siteUrl: siteUrl(),
      destination: `Майстер-клас Flower Season, ${formatSessionDate(session.startsAt)} ${formatSessionTime(session.startsAt)}`,
    });
  }
  if (isSandboxEnabled()) {
    return {
      invoiceId: `${SANDBOX_INVOICE_PREFIX}${booking.id}`,
      paymentUrl: `/workshops/sandbox-pay/${booking.id}`,
    };
  }
  throw new Error("No payment provider is configured.");
}
