import { expect, type APIRequestContext, type Page } from '@playwright/test';

export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
}

export interface Slot {
  startsAt: string;
  endsAt: string;
}

export function todayUtcDateKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysUtcDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function bookingDateKeyForTests(): string {
  return addDaysUtcDateKey(todayUtcDateKey(), 1);
}

export function formatTimeUtc(iso: string): string {
  const date = new Date(iso);
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatSlotRangeUtc(startsAt: string, endsAt: string): string {
  return `${formatTimeUtc(startsAt)}–${formatTimeUtc(endsAt)}`;
}

export async function createTestEventType(
  request: APIRequestContext,
  name?: string,
): Promise<EventType> {
  const eventTypeName = name ?? `E2E Call ${Date.now()}`;

  const response = await request.post('/api/event-types', {
    data: {
      name: eventTypeName,
      description: 'E2E test event type',
      durationMinutes: 30,
    },
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as EventType;
}

export async function getFirstAvailableSlot(
  request: APIRequestContext,
  eventTypeId: string,
  dateKey = bookingDateKeyForTests(),
): Promise<{ date: string; slot: Slot }> {
  const response = await request.get(
    `/api/event-types/${eventTypeId}/slots?date=${encodeURIComponent(dateKey)}`,
  );

  expect(response.ok()).toBeTruthy();

  const slots = (await response.json()) as Slot[];
  expect(slots.length).toBeGreaterThan(0);

  return { date: dateKey, slot: slots[0] };
}

export async function selectBookingDate(page: Page, dateKey: string): Promise<void> {
  const day = String(Number(dateKey.split('-')[2]));
  const dateCell = page
    .locator('.calendar-cell:not(.calendar-cell--disabled)')
    .filter({ has: page.locator('.calendar-day', { hasText: day }) })
    .first();

  await expect(dateCell).toBeVisible();
  await dateCell.click();
}

export async function openCatalog(page: Page): Promise<void> {
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: 'Выберите тип события' })).toBeVisible();
}

export async function openBookingPage(page: Page, eventTypeId: string): Promise<void> {
  await page.goto('/#/');
  await page.goto(`/#/event-types/${eventTypeId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

export async function openAdminPage(page: Page): Promise<void> {
  await page.goto('/#/admin');
  await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible();
}

export async function selectFreeSlot(
  page: Page,
  dateKey: string,
  slot: Slot,
): Promise<void> {
  const slotLabel = formatSlotRangeUtc(slot.startsAt, slot.endsAt);

  await expect(page.getByRole('heading', { name: 'Статус слотов' })).toBeVisible();

  if (dateKey !== todayUtcDateKey()) {
    await selectBookingDate(page, dateKey);
    await expect(page.locator('.slot-list .slot-item').first()).toBeVisible();
  }

  const slotButton = page
    .locator('.slot-item--free')
    .filter({ hasText: slotLabel })
    .first();

  await expect(slotButton).toBeVisible();
  await slotButton.click();
  await page.getByRole('button', { name: 'Продолжить' }).click();
}

export async function submitBookingForm(
  page: Page,
  guestName: string,
  guestEmail: string,
): Promise<void> {
  await page.getByLabel('Имя').fill(guestName);
  await page.getByLabel('Email').fill(guestEmail);
  await page.getByRole('button', { name: 'Забронировать' }).click();
}
