import { expect, test } from '@playwright/test';
import {
  createTestEventType,
  formatSlotRangeUtc,
  getFirstAvailableSlot,
  openBookingPage,
  openCatalog,
  selectBookingDate,
  selectFreeSlot,
  submitBookingForm,
} from './helpers';

test.describe('Guest booking flow', () => {
  test('books a slot from catalog to admin confirmation', async ({ page, request }) => {
    const eventType = await createTestEventType(request);
    const { date, slot } = await getFirstAvailableSlot(request, eventType.id);
    const guestName = 'Playwright Guest';
    const guestEmail = 'playwright@example.com';

    await openCatalog(page);
    await page.getByRole('button', { name: new RegExp(eventType.name) }).click();
    await expect(page.getByRole('heading', { level: 1, name: eventType.name })).toBeVisible();

    await selectFreeSlot(page, date, slot);
    await submitBookingForm(page, guestName, guestEmail);

    await expect(page.getByRole('heading', { name: 'Бронирование подтверждено' })).toBeVisible();
    await expect(page.getByText(eventType.name)).toBeVisible();
    await expect(page.getByText(formatSlotRangeUtc(slot.startsAt, slot.endsAt))).toBeVisible();

    await page.getByRole('button', { name: 'Админка' }).click();
    await expect(page.getByRole('heading', { name: 'Админка' })).toBeVisible();
    await expect(page.getByText(guestName)).toBeVisible();
    await expect(page.getByText(guestEmail)).toBeVisible();
    await expect(
      page.locator('.booking-list-item').filter({ hasText: guestName }).getByText(eventType.name),
    ).toBeVisible();
  });

  test('shows booked slot as unavailable on booking page', async ({ page, request }) => {
    const eventType = await createTestEventType(request);
    const { date, slot } = await getFirstAvailableSlot(request, eventType.id);
    const slotLabel = formatSlotRangeUtc(slot.startsAt, slot.endsAt);
    const guestName = 'Busy Slot Guest';
    const guestEmail = 'busy-slot@example.com';

    await openBookingPage(page, eventType.id);
    await selectFreeSlot(page, date, slot);
    await submitBookingForm(page, guestName, guestEmail);
    await expect(page.getByRole('heading', { name: 'Бронирование подтверждено' })).toBeVisible();

    await openBookingPage(page, eventType.id);
    await selectBookingDate(page, date);
    await expect(page.getByRole('heading', { name: 'Статус слотов' })).toBeVisible();

    const bookedSlot = page
      .locator('.slot-item--busy')
      .filter({ hasText: slotLabel })
      .first();

    await expect(bookedSlot).toBeVisible();
    await expect(bookedSlot).toBeDisabled();
    await expect(bookedSlot.getByText('Занято')).toBeVisible();
  });
});
