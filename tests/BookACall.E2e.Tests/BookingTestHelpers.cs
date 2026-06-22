using System.Net.Http.Json;
using BookACall.Api.Models;
using Microsoft.Playwright;

namespace BookACall.E2e.Tests;

internal static class BookingTestHelpers
{
    public static DateOnly TodayUtc() => DateOnly.FromDateTime(DateTime.UtcNow);

    public static string FormatDateKey(DateOnly date) => date.ToString("yyyy-MM-dd");

    public static string BookingDateKeyForTests() => FormatDateKey(TodayUtc().AddDays(1));

    public static string FormatSlotRangeUtc(DateTimeOffset startsAt, DateTimeOffset endsAt) =>
        $"{startsAt.UtcDateTime:HH:mm}–{endsAt.UtcDateTime:HH:mm}";

    public static async Task<EventTypeDto> CreateTestEventTypeAsync(
        HttpClient client,
        string? name = null)
    {
        var eventTypeName = name ?? $"E2E Call {DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";

        var response = await client.PostAsJsonAsync(
            "/api/event-types",
            new CreateEventTypeRequest(eventTypeName, "E2E test event type", 30));

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<EventTypeDto>())!;
    }

    public static async Task<(string Date, SlotDto Slot)> GetFirstAvailableSlotAsync(
        HttpClient client,
        string eventTypeId,
        string? dateKey = null)
    {
        var date = dateKey ?? BookingDateKeyForTests();

        var response = await client.GetAsync(
            $"/api/event-types/{eventTypeId}/slots?date={Uri.EscapeDataString(date)}");

        response.EnsureSuccessStatusCode();

        var slots = (await response.Content.ReadFromJsonAsync<List<SlotDto>>())!;
        if (slots.Count == 0)
        {
            throw new InvalidOperationException($"No available slots for event type {eventTypeId} on {date}.");
        }

        return (date, slots[0]);
    }

    public static async Task SelectBookingDateAsync(IPage page, string dateKey)
    {
        var day = int.Parse(dateKey.Split('-')[2], System.Globalization.CultureInfo.InvariantCulture)
            .ToString(System.Globalization.CultureInfo.InvariantCulture);

        var dateCell = page.Locator(".calendar-cell:not(.calendar-cell--disabled)")
            .Filter(new() { Has = page.Locator(".calendar-day", new() { HasText = day }) })
            .First;

        await Assertions.Expect(dateCell).ToBeVisibleAsync();
        await dateCell.ClickAsync();
    }

    public static async Task OpenCatalogAsync(IPage page)
    {
        await page.GotoAsync("/#/");
        await Assertions.Expect(page.GetByRole(AriaRole.Heading, new() { Name = "Выберите тип события" }))
            .ToBeVisibleAsync();
    }

    public static async Task OpenBookingPageAsync(IPage page, string eventTypeId)
    {
        await page.GotoAsync("/#/");
        await page.GotoAsync($"/#/event-types/{eventTypeId}");
        await Assertions.Expect(page.GetByRole(AriaRole.Heading, new() { Level = 1 })).ToBeVisibleAsync();
    }

    public static async Task SelectFreeSlotAsync(IPage page, string dateKey, SlotDto slot)
    {
        var slotLabel = FormatSlotRangeUtc(slot.StartsAt, slot.EndsAt);

        await Assertions.Expect(page.GetByRole(AriaRole.Heading, new() { Name = "Статус слотов" }))
            .ToBeVisibleAsync();

        if (dateKey != FormatDateKey(TodayUtc()))
        {
            await SelectBookingDateAsync(page, dateKey);
            await Assertions.Expect(page.Locator(".slot-list .slot-item").First).ToBeVisibleAsync();
        }

        var slotButton = page.Locator(".slot-item--free")
            .Filter(new() { HasText = slotLabel })
            .First;

        await Assertions.Expect(slotButton).ToBeVisibleAsync();
        await slotButton.ClickAsync();
        await page.GetByRole(AriaRole.Button, new() { Name = "Продолжить" }).ClickAsync();
    }

    public static async Task SubmitBookingFormAsync(IPage page, string guestName, string guestEmail)
    {
        await page.GetByLabel("Имя").FillAsync(guestName);
        await page.GetByLabel("Email").FillAsync(guestEmail);
        await page.GetByRole(AriaRole.Button, new() { Name = "Забронировать" }).ClickAsync();
    }
}
