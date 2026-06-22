using System.Net;
using System.Net.Http.Json;
using BookACall.Api.Models;

namespace BookACall.Api.Tests;

public class BookingsEndpointTests : IAsyncLifetime
{
    private ApiWebApplicationFactory factory = null!;
    private HttpClient client = null!;

    public Task InitializeAsync()
    {
        factory = new ApiWebApplicationFactory();
        client = factory.CreateClient();
        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        client.Dispose();
        factory.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task CreateBooking_ReturnsCreatedBooking_ForValidSlot()
    {
        var eventType = await TestHelpers.CreateEventTypeAsync(client);
        var bookingDate = TestHelpers.TodayUtc().AddDays(1);
        var startsAt = TestHelpers.UtcSlotStart(bookingDate, 9);

        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(eventType.Id, startsAt, "Guest User", "guest@example.com"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var booking = await response.Content.ReadFromJsonAsync<BookingDto>();
        Assert.NotNull(booking);
        Assert.False(string.IsNullOrWhiteSpace(booking.Id));
        Assert.Equal(eventType.Id, booking.EventTypeId);
        Assert.Equal(eventType.Name, booking.EventTypeName);
        Assert.Equal(startsAt, booking.StartsAt);
        Assert.Equal(startsAt.AddMinutes(30), booking.EndsAt);
        Assert.Equal("Guest User", booking.GuestName);
        Assert.Equal("guest@example.com", booking.GuestEmail);
    }

    [Fact]
    public async Task CreateBooking_ReturnsBadRequest_ForPastSlot()
    {
        var eventType = await TestHelpers.CreateEventTypeAsync(client);
        var pastDate = TestHelpers.TodayUtc().AddDays(-1);
        var startsAt = TestHelpers.UtcSlotStart(pastDate, 9);

        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(eventType.Id, startsAt, "Guest User", "guest@example.com"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.False(string.IsNullOrWhiteSpace(error.Message));
    }

    [Fact]
    public async Task CreateBooking_ReturnsBadRequest_ForDateOutsideWindow()
    {
        var eventType = await TestHelpers.CreateEventTypeAsync(client);
        var futureDate = TestHelpers.TodayUtc().AddDays(15);
        var startsAt = TestHelpers.UtcSlotStart(futureDate, 9);

        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(eventType.Id, startsAt, "Guest User", "guest@example.com"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateBooking_ReturnsNotFound_ForUnknownEventType()
    {
        var bookingDate = TestHelpers.TodayUtc().AddDays(1);
        var startsAt = TestHelpers.UtcSlotStart(bookingDate, 9);

        var response = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest("missing-id", startsAt, "Guest User", "guest@example.com"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.False(string.IsNullOrWhiteSpace(error.Message));
    }

    [Fact]
    public async Task CreateBooking_ReturnsConflict_WhenSlotAlreadyBooked()
    {
        var eventType = await TestHelpers.CreateEventTypeAsync(client);
        var bookingDate = TestHelpers.TodayUtc().AddDays(1);
        var startsAt = TestHelpers.UtcSlotStart(bookingDate, 9);

        var firstResponse = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(eventType.Id, startsAt, "First Guest", "first@example.com"));
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        var secondEventType = await TestHelpers.CreateEventTypeAsync(client, name: "Another call", durationMinutes: 60);
        var conflictResponse = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(secondEventType.Id, startsAt, "Second Guest", "second@example.com"));

        Assert.Equal(HttpStatusCode.Conflict, conflictResponse.StatusCode);
        var error = await conflictResponse.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.False(string.IsNullOrWhiteSpace(error.Message));
    }

    [Fact]
    public async Task ListBookings_ReturnsBookingsSortedByStartsAt()
    {
        var firstEventType = await TestHelpers.CreateEventTypeAsync(client, name: "First");
        var secondEventType = await TestHelpers.CreateEventTypeAsync(client, name: "Second");
        var bookingDate = TestHelpers.TodayUtc().AddDays(2);
        var laterSlot = TestHelpers.UtcSlotStart(bookingDate, 10);
        var earlierSlot = TestHelpers.UtcSlotStart(bookingDate, 9);

        await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(firstEventType.Id, laterSlot, "Later Guest", "later@example.com"));

        await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(secondEventType.Id, earlierSlot, "Earlier Guest", "earlier@example.com"));

        var response = await client.GetAsync("/api/bookings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bookings = await response.Content.ReadFromJsonAsync<List<BookingDto>>();
        Assert.NotNull(bookings);
        Assert.Equal(2, bookings.Count);
        Assert.True(bookings[0].StartsAt < bookings[1].StartsAt);
    }

    [Fact]
    public async Task DeleteBooking_ReturnsNoContent_WhenExists()
    {
        var eventType = await TestHelpers.CreateEventTypeAsync(client);
        var bookingDate = TestHelpers.TodayUtc().AddDays(1);
        var startsAt = TestHelpers.UtcSlotStart(bookingDate, 9);

        var createResponse = await client.PostAsJsonAsync(
            "/api/bookings",
            new CreateBookingRequest(eventType.Id, startsAt, "Guest User", "guest@example.com"));
        var booking = await createResponse.Content.ReadFromJsonAsync<BookingDto>();

        var deleteResponse = await client.DeleteAsync($"/api/bookings/{booking!.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var listResponse = await client.GetAsync("/api/bookings");
        var bookings = await listResponse.Content.ReadFromJsonAsync<List<BookingDto>>();
        Assert.NotNull(bookings);
        Assert.Empty(bookings);
    }

    [Fact]
    public async Task DeleteBooking_ReturnsNotFound_WhenMissing()
    {
        var response = await client.DeleteAsync("/api/bookings/missing-id");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
