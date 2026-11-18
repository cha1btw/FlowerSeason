import { notifyAdmins } from "../admin.ts";
import type { Db } from "../db/index.ts";
import { escapeTelegramHtml } from "../telegram.ts";
import { adminRequestMessage } from "./messages.ts";
import { getBookingWithSession, getSeatsLeft, markPaid } from "./service.ts";
import type { Booking } from "../db/schema.ts";

const detailsOf = (booking: Booking, startsAt: Date) => ({
  name: booking.name,
  email: booking.email,
  messenger: booking.messenger,
  comment: booking.comment,
  phone: booking.phone,
  seats: booking.seats,
  amountKop: booking.amountKop,
  startsAt,
});

// A new request arrived: tell the customer it was received, and tell the owner
// with buttons to confirm payment or cancel. Never throws: the request is
// already saved, and a failed notification must not lose it.
export async function announceRequest(db: Db, bookingId: string): Promise<void> {
  try {
    const loaded = await getBookingWithSession(db, bookingId);
    if (!loaded) return;
    const { booking, session } = loaded;
    const details = { ...detailsOf(booking, session.startsAt), title: session.title };

    await notifyAdmins(
      adminRequestMessage(
        details,
        { seatsLeft: await getSeatsLeft(db, session) },
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

export type ConfirmPaidResult = { booking: Booking; emailSent: false } | undefined;

export async function confirmPaid(db: Db, bookingId: string): Promise<ConfirmPaidResult> {
  const booking = await markPaid(db, bookingId);
  return booking ? { booking, emailSent: false } : undefined;
}
