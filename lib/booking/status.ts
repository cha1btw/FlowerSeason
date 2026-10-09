import type { Booking } from "../db/schema.ts";

export type BookingView =
  | "paid" // seats are confirmed
  | "processing" // waiting for the payment to arrive
  | "expired" // hold ran out and nothing was paid
  | "failed" // the payment was declined or could not be started
  | "needs_attention" // paid, but the owner has to sort out the seat
  | "cancelled"; // the owner cancelled this booking or the whole date

// What the customer should see on the status page.
export function bookingView(
  booking: Pick<Booking, "status" | "holdExpiresAt">,
  now: Date,
  sessionStatus?: string,
): BookingView {
  const paid = booking.status === "paid" || booking.status === "needs_attention";
  if (booking.status === "cancelled" || (paid && sessionStatus === "cancelled")) {
    return "cancelled";
  }
  switch (booking.status) {
    case "paid":
      return "paid";
    case "needs_attention":
      return "needs_attention";
    case "failed":
      return "failed";
    case "expired":
      return "expired";
    case "pending":
      return booking.holdExpiresAt.getTime() > now.getTime()
        ? "processing"
        : "expired";
  }
}
