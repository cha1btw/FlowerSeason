import { notifyAdmins } from "../admin.ts";
import type { Db } from "../db/index.ts";
import { sendEmail } from "../email.ts";
import { siteUrl } from "../site.ts";
import { escapeTelegramHtml } from "../telegram.ts";
import { emailFor } from "./email-templates.ts";
import { adminRequestMessage } from "./messages.ts";
import { getBookingWithSession, getSeatsLeft, markPaid } from "./service.ts";
import type { Booking } from "../db/schema.ts";

const detailsOf = (booking: Booking, startsAt: Date) => ({
  name: booking.name,
  email: booking.email,
  phone: booking.phone,
  seats: booking.seats,
  amountKop: booking.amountKop,
  startsAt,
});

const statusUrl = (booking: Booking) => `${siteUrl()}/workshops/booking/${booking.id}`;

// A new request arrived: tell the customer it was received, and tell the owner
// with buttons to confirm payment or cancel. Never throws: the request is
// already saved, and a failed notification must not lose it.
export async function announceRequest(db: Db, bookingId: string): Promise<void> {
  try {
    const loaded = await getBookingWithSession(db, bookingId);
    if (!loaded) return;
    const { booking, session } = loaded;
    const details = detailsOf(booking, session.startsAt);

    const emailSent = await sendEmail(await emailFor(db, "request", details, statusUrl(booking)));
    await notifyAdmins(
      adminRequestMessage(
        details,
        { seatsLeft: await getSeatsLeft(db, session), emailSent },
        escapeTelegramHtml,
      ),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Оплачено", callback_data: `bp:${booking.id}` },
              { text: "❌ Скасувати", callback_data: `bc:${booking.id}` },
            ],
          ],
        },
      },
    );
  } catch (error) {
    console.error("Could not announce the request.", error);
  }
}

export type ConfirmPaidResult = { booking: Booking; emailSent: boolean } | undefined;

// The owner pressed "Paid": confirm the booking and email the customer.
// Idempotent: a second press finds nothing to change and sends nothing.
export async function confirmPaid(db: Db, bookingId: string): Promise<ConfirmPaidResult> {
  const booking = await markPaid(db, bookingId);
  if (!booking) return undefined;

  let emailSent = false;
  try {
    const loaded = await getBookingWithSession(db, bookingId);
    if (loaded) {
      emailSent = await sendEmail(
        await emailFor(db, "paid", detailsOf(booking, loaded.session.startsAt), statusUrl(booking)),
      );
    }
  } catch (error) {
    console.error("Could not email the confirmation.", error);
  }
  return { booking, emailSent };
}
