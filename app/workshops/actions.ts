"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { MAX_SEATS_PER_BOOKING } from "@/lib/booking/availability";
import { announceRequest } from "@/lib/booking/request-events";
import { createBooking } from "@/lib/booking/service";
import type { CheckoutFormState } from "@/lib/checkout-form-state";
import { isEmail, isUuid, normalizePhone } from "@/lib/checkout-validation";
import { siteContent } from "@/lib/content";
import { getDb } from "@/lib/db";
import { readField } from "@/lib/form";

const { errors } = siteContent.workshopsPage;

// The customer leaves a request; the owner gets it in Telegram and sends the
// payment link herself.
export async function submitRequest(
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

  let bookingId: string;
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

    bookingId = result.booking.id;
    // Sending the same form twice must not ping the owner twice. The emails and
    // the Telegram message go out after the customer already has their answer.
    if (!result.reused) after(() => announceRequest(db, result.booking.id));
  } catch (error) {
    console.error("Could not save the request.", error);
    return fail(errors.generic);
  }

  // redirect() works by throwing, so it must stay outside the try/catch above.
  redirect(`/workshops/booking/${bookingId}`);
}
