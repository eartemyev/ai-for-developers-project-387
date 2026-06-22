using System.Text.RegularExpressions;
using Microsoft.Playwright;
using Microsoft.Playwright.Xunit.v3;

namespace BookACall.E2e.Tests;

[Collection("E2E")]
public sealed class GuestBookingFlowTests(E2eAppFixture fixture) : PageTest
{
    public override BrowserNewContextOptions ContextOptions() =>
        new() { BaseURL = fixture.BaseUrl };

    [Fact]
    public async Task BooksSlot_FromCatalogToAdminConfirmation()
    {
        var eventType = await BookingTestHelpers.CreateTestEventTypeAsync(fixture.Client);
        var (date, slot) = await BookingTestHelpers.GetFirstAvailableSlotAsync(fixture.Client, eventType.Id);
        const string guestName = "Playwright Guest";
        const string guestEmail = "playwright@example.com";

        await BookingTestHelpers.OpenCatalogAsync(Page);
        await Page.GetByRole(AriaRole.Button, new() { NameRegex = new Regex(eventType.Name) }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Level = 1, Name = eventType.Name }))
            .ToBeVisibleAsync();

        await BookingTestHelpers.SelectFreeSlotAsync(Page, date, slot);
        await BookingTestHelpers.SubmitBookingFormAsync(Page, guestName, guestEmail);

        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Бронирование подтверждено" }))
            .ToBeVisibleAsync();
        await Expect(Page.GetByText(eventType.Name)).ToBeVisibleAsync();
        await Expect(Page.GetByText(BookingTestHelpers.FormatSlotRangeUtc(slot.StartsAt, slot.EndsAt)))
            .ToBeVisibleAsync();

        await Page.GetByRole(AriaRole.Button, new() { Name = "Админка" }).ClickAsync();
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Админка" })).ToBeVisibleAsync();
        await Expect(Page.GetByText(guestName)).ToBeVisibleAsync();
        await Expect(Page.GetByText(guestEmail)).ToBeVisibleAsync();
        await Expect(
            Page.Locator(".booking-list-item")
                .Filter(new() { HasText = guestName })
                .GetByText(eventType.Name))
            .ToBeVisibleAsync();
    }

    [Fact]
    public async Task ShowsBookedSlotAsUnavailableOnBookingPage()
    {
        var eventType = await BookingTestHelpers.CreateTestEventTypeAsync(fixture.Client);
        var (date, slot) = await BookingTestHelpers.GetFirstAvailableSlotAsync(fixture.Client, eventType.Id);
        var slotLabel = BookingTestHelpers.FormatSlotRangeUtc(slot.StartsAt, slot.EndsAt);
        const string guestName = "Busy Slot Guest";
        const string guestEmail = "busy-slot@example.com";

        await BookingTestHelpers.OpenBookingPageAsync(Page, eventType.Id);
        await BookingTestHelpers.SelectFreeSlotAsync(Page, date, slot);
        await BookingTestHelpers.SubmitBookingFormAsync(Page, guestName, guestEmail);
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Бронирование подтверждено" }))
            .ToBeVisibleAsync();

        await BookingTestHelpers.OpenBookingPageAsync(Page, eventType.Id);
        await BookingTestHelpers.SelectBookingDateAsync(Page, date);
        await Expect(Page.GetByRole(AriaRole.Heading, new() { Name = "Статус слотов" }))
            .ToBeVisibleAsync();

        var bookedSlot = Page.Locator(".slot-item--busy")
            .Filter(new() { HasText = slotLabel })
            .First;

        await Expect(bookedSlot).ToBeVisibleAsync();
        await Expect(bookedSlot).ToBeDisabledAsync();
        await Expect(bookedSlot.GetByText("Занято")).ToBeVisibleAsync();
    }
}
