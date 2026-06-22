export const BOOKING_WINDOW_DAYS = 14;
export const BUSINESS_START_HOUR = 9;
export const BUSINESS_END_HOUR = 17;

export function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function formatDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function getBookingWindowDates(): Date[] {
  const today = todayUtcDate();
  return Array.from({ length: BOOKING_WINDOW_DAYS + 1 }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

export function formatDateLongRu(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
}

export function formatMonthYearRu(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatTimeUtc(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatSlotRangeUtc(startsAt: string, endsAt: string): string {
  return `${formatTimeUtc(startsAt)}–${formatTimeUtc(endsAt)}`;
}

export function generateAllSlots(dateKey: string, durationMinutes: number): SlotLike[] {
  const date = parseDateKey(dateKey);
  const slots: SlotLike[] = [];
  const startMinutes = BUSINESS_START_HOUR * 60;
  const endMinutes = BUSINESS_END_HOUR * 60;

  for (let m = startMinutes; m + durationMinutes <= endMinutes; m += durationMinutes) {
    const startsAt = new Date(date);
    const hours = Math.floor(m / 60);
    const mins = m % 60;
    startsAt.setUTCHours(hours, mins, 0, 0);
    const endsAt = new Date(startsAt);
    endsAt.setUTCMinutes(endsAt.getUTCMinutes() + durationMinutes);
    slots.push({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  }

  return slots;
}

interface SlotLike {
  startsAt: string;
  endsAt: string;
}

export function mergeSlotsWithAvailability(
  allSlots: SlotLike[],
  freeSlots: SlotLike[],
): Array<SlotLike & { available: boolean }> {
  const freeSet = new Set(freeSlots.map((s) => new Date(s.startsAt).getTime()));
  return allSlots.map((slot) => ({
    ...slot,
    available: freeSet.has(new Date(slot.startsAt).getTime()),
  }));
}

export function countFreeSlotsPerDate(
  eventTypeId: string,
  dates: Date[],
  listSlotsFn: (id: string, date: string) => Promise<SlotLike[]>,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  return Promise.all(
    dates.map(async (date) => {
      const key = formatDateKey(date);
      try {
        const slots = await listSlotsFn(eventTypeId, key);
        counts[key] = slots.length;
      } catch {
        counts[key] = 0;
      }
    }),
  ).then(() => counts);
}
