import { applySuccessfulPayment } from "../booking/payment-events.ts";
import type { Db } from "../db/index.ts";
import { bookings } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { SANDBOX_INVOICE_PREFIX } from "./index.ts";
import { getMonobankInvoiceStatus, isMonobankConfigured } from "./monobank.ts";

const MIN_AGE_MS = 15_000; // give the normal webhook a head start
const MIN_GAP_MS = 8_000; // at most one provider call per booking per 8 s
const lastChecked = new Map<string, number>();

// Webhooks can be late or lost. While a customer is looking at the status page,
// ask the provider directly. Safe to call repeatedly: confirmation is idempotent.
export async function syncBookingPayment(
  db: Db,
  bookingId: string,
  nowMs: number = Date.now(),
): Promise<"skipped" | "checked"> {
  if (!isMonobankConfigured()) return "skipped";

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (
    !booking ||
    !booking.invoiceId ||
    booking.invoiceId.startsWith(SANDBOX_INVOICE_PREFIX) ||
    (booking.status !== "pending" && booking.status !== "expired") ||
    nowMs - booking.createdAt.getTime() < MIN_AGE_MS
  ) {
    return "skipped";
  }

  const previous = lastChecked.get(bookingId) ?? 0;
  if (nowMs - previous < MIN_GAP_MS) return "skipped";
  lastChecked.set(bookingId, nowMs);

  const status = await getMonobankInvoiceStatus(booking.invoiceId);
  if (status.status === "success") {
    await applySuccessfulPayment(db, booking.id, status.amount);
  }
  return "checked";
}
