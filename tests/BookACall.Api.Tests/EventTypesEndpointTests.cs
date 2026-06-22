using System.Net;
using System.Net.Http.Json;
using BookACall.Api.Models;

namespace BookACall.Api.Tests;

public class EventTypesEndpointTests : IAsyncLifetime
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
    public async Task ListEventTypes_ReturnsSeededEventTypesOnStartup()
    {
        var response = await client.GetAsync("/api/event-types");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var eventTypes = await response.Content.ReadFromJsonAsync<List<EventTypeDto>>();
        Assert.NotNull(eventTypes);
        Assert.Equal(2, eventTypes.Count);
        Assert.Contains(eventTypes, e => e.Name == "30 минут" && e.DurationMinutes == 30);
        Assert.Contains(eventTypes, e => e.Name == "15 минут" && e.DurationMinutes == 15);
    }

    [Fact]
    public async Task CreateEventType_ReturnsCreatedEventType()
    {
        var response = await client.PostAsJsonAsync(
            "/api/event-types",
            new CreateEventTypeRequest("Intro call", "Quick intro", 15));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<EventTypeDto>();
        Assert.NotNull(created);
        Assert.False(string.IsNullOrWhiteSpace(created.Id));
        Assert.Equal("Intro call", created.Name);
        Assert.Equal("Quick intro", created.Description);
        Assert.Equal(15, created.DurationMinutes);
    }

    [Fact]
    public async Task GetEventType_ReturnsEventType_WhenExists()
    {
        var created = await TestHelpers.CreateEventTypeAsync(client);

        var response = await client.GetAsync($"/api/event-types/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var eventType = await response.Content.ReadFromJsonAsync<EventTypeDto>();
        Assert.NotNull(eventType);
        Assert.Equal(created.Id, eventType.Id);
    }

    [Fact]
    public async Task GetEventType_ReturnsNotFound_WhenMissing()
    {
        var response = await client.GetAsync("/api/event-types/missing-id");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task UpdateEventType_ReturnsUpdatedEventType()
    {
        var created = await TestHelpers.CreateEventTypeAsync(client);

        var response = await client.PutAsJsonAsync(
            $"/api/event-types/{created.Id}",
            new UpdateEventTypeRequest("Updated call", "Updated description", 45));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<EventTypeDto>();
        Assert.NotNull(updated);
        Assert.Equal("Updated call", updated.Name);
        Assert.Equal("Updated description", updated.Description);
        Assert.Equal(45, updated.DurationMinutes);
    }

    [Fact]
    public async Task UpdateEventType_ReturnsNotFound_WhenMissing()
    {
        var response = await client.PutAsJsonAsync(
            "/api/event-types/missing-id",
            new UpdateEventTypeRequest("Name", "Description", 30));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteEventType_ReturnsNoContent_WhenExists()
    {
        var created = await TestHelpers.CreateEventTypeAsync(client);

        var response = await client.DeleteAsync($"/api/event-types/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var getResponse = await client.GetAsync($"/api/event-types/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }

    [Fact]
    public async Task DeleteEventType_ReturnsNotFound_WhenMissing()
    {
        var response = await client.DeleteAsync("/api/event-types/missing-id");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetSlots_ReturnsAvailableSlots_ForValidDate()
    {
        var created = await TestHelpers.CreateEventTypeAsync(client, durationMinutes: 60);
        var date = TestHelpers.TodayUtc().AddDays(1);

        var response = await client.GetAsync($"/api/event-types/{created.Id}/slots?date={TestHelpers.FormatDate(date)}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var slots = await response.Content.ReadFromJsonAsync<List<SlotDto>>();
        Assert.NotNull(slots);
        Assert.Equal(8, slots.Count);
        Assert.Equal(TestHelpers.UtcSlotStart(date, 9), slots[0].StartsAt);
        Assert.Equal(TestHelpers.UtcSlotStart(date, 10), slots[0].EndsAt);
    }

    [Fact]
    public async Task GetSlots_ReturnsBadRequest_ForDateOutsideWindow()
    {
        var created = await TestHelpers.CreateEventTypeAsync(client);
        var pastDate = TestHelpers.TodayUtc().AddDays(-1);

        var response = await client.GetAsync(
            $"/api/event-types/{created.Id}/slots?date={TestHelpers.FormatDate(pastDate)}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        Assert.NotNull(error);
        Assert.False(string.IsNullOrWhiteSpace(error.Message));
    }

    [Fact]
    public async Task GetSlots_ReturnsBadRequest_ForDateTooFarAhead()
    {
        var created = await TestHelpers.CreateEventTypeAsync(client);
        var futureDate = TestHelpers.TodayUtc().AddDays(15);

        var response = await client.GetAsync(
            $"/api/event-types/{created.Id}/slots?date={TestHelpers.FormatDate(futureDate)}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetSlots_ReturnsNotFound_WhenEventTypeMissing()
    {
        var date = TestHelpers.TodayUtc().AddDays(1);

        var response = await client.GetAsync($"/api/event-types/missing-id/slots?date={TestHelpers.FormatDate(date)}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
