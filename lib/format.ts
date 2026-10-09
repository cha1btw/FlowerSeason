const NBSP = " ";

// Prices are stored in kopecks (integers) so there are no rounding errors.
// Formatted by hand on purpose: Intl's currency symbol for UAH differs between
// Node ("₴") and browsers ("грн"), which breaks hydration of client components.
export function formatUah(kopecks: number): string {
  const whole = Math.floor(kopecks / 100);
  const rest = kopecks % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const fraction = rest === 0 ? "" : `,${String(rest).padStart(2, "0")}`;
  return `${grouped}${fraction}${NBSP}₴`;
}

// Ukrainian plural: 1 місце, 2-4 місця, 5+ місць.
export function pluralSeats(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} місце`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} місця`;
  return `${count} місць`;
}
