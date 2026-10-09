"use server";

import { redirect } from "next/navigation";
import { MAX_SEATS_PER_BOOKING } from "@/lib/booking/availability";
import {
  attachInvoice,
  createBooking,
  getBookingWithSession,
  markFailed,
} from "@/lib/booking/service";
import type { CheckoutFormState } from "@/lib/checkout-form-state";
import { isEmail, isUuid, normalizePhone } from "@/lib/checkout-validation";
import { siteContent } from "@/lib/content";
import { getDb } from "@/lib/db";
import { readField } from "@/lib/form";
import { createInvoice } from "@/lib/payments";

const { errors } = siteContent.workshopsPage;

export async function startCheckout(
  _previousState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const values = {
    name: readField(formData, "name", 80),
    phone: readField(formData, "phone", 30),
    email: readField(formData, "email", 120),
    seats: readField(formData, "seats", 2) || "1",
  };
  const fail = (message: string): CheckoutFormState => ({
    status: "error",
    message,
    values,
  });

  // Bots fill hidden fields. Pretend it worked, tell them nothing.
  if (readField(formData, "website", 120)) redirect("/workshops");

  const sessionId = readField(formData, "sessionId", 40);
  const phone = normalizePhone(values.phone);
  const seats = Number(values.seats);

  if (
    !isUuid(sessionId) ||
    !values.name ||
    !phone ||
    !isEmail(values.email) ||
    !Number.isInteger(seats) ||
    seats < 1 ||
    seats > MAX_SEATS_PER_BOOKING
  ) {
    return fail(errors.invalid);
  }
  if (readField(formData, "consent", 5) !== "yes") return fail(errors.consent);

  let paymentUrl: string;
  try {
    const db = getDb();
    const result = await createBooking(db, {
      sessionId,
      name: values.name,
      phone,
      email: values.email,
      seats,
    });

    if (!result.ok) {
      if (result.reason === "sold_out") {
        return fail(
          result.seatsLeft
            ? `${errors.soldOut} ${errors.seatsLeft} ${result.seatsLeft}.`
            : errors.soldOut,
        );
      }
      return fail(
        result.reason === "invalid_seats" ? errors.invalid : errors.unavailable,
      );
    }

    let { booking } = result;
    if (!booking.paymentUrl) {
      const loaded = await getBookingWithSession(db, booking.id);
      if (!loaded) return fail(errors.generic);

      try {
        const invoice = await createInvoice(booking, loaded.session);
        const attached = await attachInvoice(
          db,
          booking.id,
          invoice.invoiceId,
          invoice.paymentUrl,
        );
        // Lost a race with a parallel request: use the invoice it stored.
        const current = attached
          ? { ...booking, paymentUrl: invoice.paymentUrl }
          : (await getBookingWithSession(db, booking.id))?.booking;
        if (!current?.paymentUrl) return fail(errors.payment);
        booking = current;
      } catch (error) {
        console.error("Could not create a payment invoice.", error);
        // No invoice means nothing can be paid, so give the seats back.
        await markFailed(db, booking.id);
        return fail(errors.payment);
      }
    }
    paymentUrl = booking.paymentUrl!;
  } catch (error) {
    console.error("Checkout failed.", error);
    return fail(errors.generic);
  }

  // redirect() works by throwing, so it must stay outside the try/catch above.
  redirect(paymentUrl);
}
