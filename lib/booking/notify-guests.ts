import type { Db } from "../db/index.ts";
import type { Booking, Session } from "../db/schema.ts";

// Guests choose a messenger; the owner contacts them personally.
const manual = async () => ({ sent: 0, failed: 0 });
export function notifyRescheduled(_db: Db, _guests: Booking[], _session: Pick<Session, "startsAt">, _oldStartsAt: Date) { return manual(); }
export function notifyCancelled(_db: Db, _guests: Booking[], _session: Pick<Session, "startsAt">) { return manual(); }
