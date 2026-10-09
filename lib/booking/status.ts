import type { Booking } from "../db/schema.ts";

export type BookingView =
  | "requested" // the request is in, waiting for payment
  | "paid" // confirmed
  | "cancelled"; // cancelled by the studio (or the whole date was)

// What the customer should see on the status page.
export function bookingView(
  booking: Pick<Booking, "status">,
  sessionStatus?: string,
): BookingView {
  if (booking.status === "cancelled") return "cancelled";
  if (sessionStatus === "cancelled") return "cancelled";
  return booking.status;
}
