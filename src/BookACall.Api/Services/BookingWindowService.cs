namespace BookACall.Api.Services;

public static class BookingWindowService
{
    public const int MaxDaysAhead = 14;
    private static readonly TimeOnly BusinessDayStart = new(9, 0);
    private static readonly TimeOnly BusinessDayEnd = new(17, 0);

    public static DateOnly TodayUtc() => DateOnly.FromDateTime(DateTime.UtcNow);

    public static DateOnly MaxDateUtc() => TodayUtc().AddDays(MaxDaysAhead);

    public static bool IsDateInWindow(DateOnly date)
    {
        var today = TodayUtc();
        return date >= today && date <= MaxDateUtc();
    }

    public static bool IsDateTimeInWindow(DateTimeOffset dateTime)
    {
        var utc = dateTime.ToUniversalTime();
        return utc > DateTimeOffset.UtcNow && IsDateInWindow(DateOnly.FromDateTime(utc.UtcDateTime));
    }

    public static IReadOnlyList<(DateTimeOffset StartsAt, DateTimeOffset EndsAt)> GenerateSlots(
        DateOnly date,
        int durationMinutes,
        IReadOnlySet<DateTimeOffset> bookedStartsAt)
    {
        var slots = new List<(DateTimeOffset StartsAt, DateTimeOffset EndsAt)>();
        var dayStart = new DateTimeOffset(date.ToDateTime(BusinessDayStart), TimeSpan.Zero);
        var dayEnd = new DateTimeOffset(date.ToDateTime(BusinessDayEnd), TimeSpan.Zero);
        var duration = TimeSpan.FromMinutes(durationMinutes);

        for (var startsAt = dayStart; startsAt.Add(duration) <= dayEnd; startsAt = startsAt.Add(duration))
        {
            var endsAt = startsAt.Add(duration);
            if (!bookedStartsAt.Contains(startsAt))
            {
                slots.Add((startsAt, endsAt));
            }
        }

        return slots;
    }
}
