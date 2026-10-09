const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isUuid = (value: string) => UUID.test(value);
export const isEmail = (value: string) => EMAIL.test(value) && value.length <= 120;

// Accepts "+380 50 123 45 67", "(050) 123-45-67" etc. and returns "+380501234567",
// or null when it does not look like a phone number.
export function normalizePhone(value: string): string | null {
  const cleaned = value.replace(/[\s()\-.]/g, "");
  return /^\+?\d{10,15}$/.test(cleaned) ? cleaned : null;
}
