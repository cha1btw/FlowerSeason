import { notifyAdmins } from "../admin.ts";
import type { Db } from "../db/index.ts";
import { sendEmail } from "../email.ts";
import { siteUrl } from "../site.ts";
import { escapeTelegramHtml } from "../telegram.ts";
import {
  adminAttentionMessage,
  adminPaymentMessage,
  confirmationEmail,
} from "./messages.ts";
import {
  confirmPayment,
  getBookingWithSession,
  getSeatsLeft,
  type ConfirmPaymentResult,
} from "./service.ts";

// The single place where "a payment arrived" turns into emails and
// notifications. Both the provider webhook and the status-page sync call it;
// confirmPayment() guarantees that only one of them wins, so nothing is sent twice.
export async function applySuccessfulPayment(
  db: Db,
  bookingId: string,
  paidAmountKop?: number,
): Promise<ConfirmPaymentResult> {
  const result = await confirmPayment(db, bookingId, { paidAmountKop });

  // Side effects must never turn a recorded payment into an error response.
  try {
    if (result.kind === "confirmed" || result.kind === "amount_mismatch") {
      const loaded = await getBookingWithSession(db, bookingId);
      if (loaded) {
        const { booking, session } = loaded;
        const details = {
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          seats: booking.seats,
          amountKop: booking.amountKop,
          startsAt: session.startsAt,
        };

        if (result.kind === "confirmed" && result.outcome === "paid") {
          const emailSent = await sendEmail(
            confirmationEmail(details, `${siteUrl()}/workshops/booking/${booking.id}`),
          );
          await notifyAdmins(
            adminPaymentMessage(
              details,
              { seatsLeft: await getSeatsLeft(db, session), emailSent },
              escapeTelegramHtml,
            ),
          );
        } else {
          const reason =
            result.kind === "amount_mismatch"
              ? `Сума оплати не збігається з очікуваною (${paidAmountKop ?? "?"} коп. замість ${booking.amountKop}). Запис не підтверджено.`
              : "Оплату отримано, але місць уже немає або дату скасовано. Поверніть кошти або знайдіть місце вручну.";
          await notifyAdmins(
            adminAttentionMessage(details, reason, escapeTelegramHtml),
          );
        }
      }
    }
  } catch (error) {
    console.error("Payment side effects failed.", error);
  }

  return result;
}
