namespace BookACall.Api.Entities;

public class BookingEntity
{
    public string Id { get; set; } = string.Empty;
    public string EventTypeId { get; set; } = string.Empty;
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string GuestEmail { get; set; } = string.Empty;

    public EventTypeEntity EventType { get; set; } = null!;
}
