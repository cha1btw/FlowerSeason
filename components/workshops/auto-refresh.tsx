"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// While a payment is pending: every few seconds ask the server to check with
// the payment provider (in case its webhook is late), then re-read the page.
// The page flips to "You are booked" as soon as the payment is confirmed.
export function AutoRefresh({
  bookingId,
  intervalMs = 4000,
}: {
  bookingId: string;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        await fetch(`/api/workshops/bookings/${bookingId}/sync`, { method: "POST" });
      } catch {
        // Offline or server hiccup: the next tick will try again.
      }
      if (!cancelled) router.refresh();
    }

    const timer = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router, bookingId, intervalMs]);

  return null;
}
