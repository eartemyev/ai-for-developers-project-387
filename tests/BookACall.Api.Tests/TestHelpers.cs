using System.Net.Http.Json;
using BookACall.Api.Models;

namespace BookACall.Api.Tests;

internal static class TestHelpers
{
    public static DateOnly TodayUtc() => DateOnly.FromDateTime(DateTime.UtcNow);

    public static string FormatDate(DateOnly date) => date.ToString("yyyy-MM-dd");

    public static DateTimeOffset UtcSlotStart(DateOnly date, int hour, int minute = 0) =>
        new(date.ToDateTime(new TimeOnly(hour, minute)), TimeSpan.Zero);

    public static async Task<EventTypeDto> CreateEventTypeAsync(
        HttpClient client,
        string name = "Consultation",
        int durationMinutes = 30,
        string? description = "30-minute call")
    {
        var response = await client.PostAsJsonAsync(
            "/api/event-types",
            new CreateEventTypeRequest(name, description, durationMinutes));

        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<EventTypeDto>())!;
    }
}
