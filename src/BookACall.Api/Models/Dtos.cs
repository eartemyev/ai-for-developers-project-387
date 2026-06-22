namespace BookACall.Api.Models;

public record ErrorResponse(string Message);

public record EventTypeDto(string Id, string Name, string Description, int DurationMinutes);

public record CreateEventTypeRequest(string Name, string? Description, int DurationMinutes);

public record UpdateEventTypeRequest(string Name, string? Description, int DurationMinutes);

public record SlotDto(DateTimeOffset StartsAt, DateTimeOffset EndsAt);

public record BookingDto(
    string Id,
    string EventTypeId,
    string EventTypeName,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string GuestName,
    string GuestEmail);

public record CreateBookingRequest(
    string EventTypeId,
    DateTimeOffset StartsAt,
    string GuestName,
    string GuestEmail);
