using BookACall.Api.Data;
using BookACall.Api.Entities;
using BookACall.Api.Models;
using BookACall.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace BookACall.Api.Endpoints;

public static class BookingEndpoints
{
    public static RouteGroupBuilder MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/bookings");

        group.MapPost("/", CreateBooking);
        group.MapGet("/", ListBookings);
        group.MapDelete("/{id}", DeleteBooking);

        return group;
    }

    private static async Task<IResult> CreateBooking(CreateBookingRequest request, AppDbContext db)
    {
        if (!BookingWindowService.IsDateTimeInWindow(request.StartsAt))
        {
            return Results.BadRequest(new ErrorResponse("Booking must be in the future and within the 14-day window."));
        }

        var eventType = await db.EventTypes.FindAsync(request.EventTypeId);
        if (eventType is null)
        {
            return Results.NotFound(new ErrorResponse("Event type not found."));
        }

        var startsAtUtc = request.StartsAt.ToUniversalTime();
        var date = DateOnly.FromDateTime(startsAtUtc.UtcDateTime);

        var bookedStartsAt = await db.Bookings
            .Select(b => b.StartsAt)
            .ToListAsync();

        if (bookedStartsAt.Contains(startsAtUtc))
        {
            return Results.Conflict(new ErrorResponse("This time slot is already booked."));
        }

        var availableSlots = BookingWindowService.GenerateSlots(
            date,
            eventType.DurationMinutes,
            bookedStartsAt.ToHashSet());

        var matchingSlot = availableSlots.FirstOrDefault(slot => slot.StartsAt == startsAtUtc);
        if (matchingSlot == default)
        {
            return Results.BadRequest(new ErrorResponse("The selected time slot is not available."));
        }

        var booking = new BookingEntity
        {
            Id = Guid.NewGuid().ToString(),
            EventTypeId = eventType.Id,
            StartsAt = matchingSlot.StartsAt,
            EndsAt = matchingSlot.EndsAt,
            GuestName = request.GuestName,
            GuestEmail = request.GuestEmail
        };

        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        return Results.Created($"/api/bookings/{booking.Id}", ToDto(booking, eventType.Name));
    }

    private static async Task<IResult> ListBookings(AppDbContext db)
    {
        var bookings = await db.Bookings
            .Include(b => b.EventType)
            .OrderBy(b => b.StartsAt)
            .Select(b => ToDto(b, b.EventType.Name))
            .ToListAsync();

        return Results.Ok(bookings);
    }

    private static async Task<IResult> DeleteBooking(string id, AppDbContext db)
    {
        var booking = await db.Bookings.FindAsync(id);
        if (booking is null)
        {
            return Results.NotFound();
        }

        db.Bookings.Remove(booking);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static BookingDto ToDto(BookingEntity entity, string eventTypeName) =>
        new(
            entity.Id,
            entity.EventTypeId,
            eventTypeName,
            entity.StartsAt,
            entity.EndsAt,
            entity.GuestName,
            entity.GuestEmail);
}
