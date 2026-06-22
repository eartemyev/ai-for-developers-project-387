using BookACall.Api.Data;
using BookACall.Api.Entities;
using BookACall.Api.Models;
using BookACall.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace BookACall.Api.Endpoints;

public static class EventTypeEndpoints
{
    public static RouteGroupBuilder MapEventTypeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/event-types");

        group.MapGet("/", ListEventTypes);
        group.MapGet("/{id}", GetEventType);
        group.MapPost("/", CreateEventType);
        group.MapPut("/{id}", UpdateEventType);
        group.MapDelete("/{id}", DeleteEventType);
        group.MapGet("/{id}/slots", GetSlots);

        return group;
    }

    private static async Task<IResult> ListEventTypes(AppDbContext db)
    {
        var eventTypes = await db.EventTypes
            .OrderBy(e => e.Name)
            .Select(e => ToDto(e))
            .ToListAsync();

        return Results.Ok(eventTypes);
    }

    private static async Task<IResult> GetEventType(string id, AppDbContext db)
    {
        var eventType = await db.EventTypes.FindAsync(id);
        return eventType is null ? Results.NotFound() : Results.Ok(ToDto(eventType));
    }

    private static async Task<IResult> CreateEventType(CreateEventTypeRequest request, AppDbContext db)
    {
        var eventType = new EventTypeEntity
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Description = request.Description ?? string.Empty,
            DurationMinutes = request.DurationMinutes
        };

        db.EventTypes.Add(eventType);
        await db.SaveChangesAsync();

        return Results.Created($"/api/event-types/{eventType.Id}", ToDto(eventType));
    }

    private static async Task<IResult> UpdateEventType(string id, UpdateEventTypeRequest request, AppDbContext db)
    {
        var eventType = await db.EventTypes.FindAsync(id);
        if (eventType is null)
        {
            return Results.NotFound();
        }

        eventType.Name = request.Name;
        eventType.Description = request.Description ?? string.Empty;
        eventType.DurationMinutes = request.DurationMinutes;

        await db.SaveChangesAsync();
        return Results.Ok(ToDto(eventType));
    }

    private static async Task<IResult> DeleteEventType(string id, AppDbContext db)
    {
        var eventType = await db.EventTypes.FindAsync(id);
        if (eventType is null)
        {
            return Results.NotFound();
        }

        db.EventTypes.Remove(eventType);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> GetSlots(string id, string date, AppDbContext db)
    {
        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", out var parsedDate))
        {
            return Results.BadRequest(new ErrorResponse("Invalid date format. Use YYYY-MM-DD."));
        }

        if (!BookingWindowService.IsDateInWindow(parsedDate))
        {
            return Results.BadRequest(new ErrorResponse("Date must be between today and 14 days ahead."));
        }

        var eventType = await db.EventTypes.FindAsync(id);
        if (eventType is null)
        {
            return Results.NotFound();
        }

        var bookedStartsAt = await db.Bookings
            .Select(b => b.StartsAt)
            .ToListAsync();

        var bookedSet = bookedStartsAt.ToHashSet();
        var slots = BookingWindowService.GenerateSlots(parsedDate, eventType.DurationMinutes, bookedSet)
            .Select(slot => new SlotDto(slot.StartsAt, slot.EndsAt))
            .ToList();

        return Results.Ok(slots);
    }

    private static EventTypeDto ToDto(EventTypeEntity entity) =>
        new(entity.Id, entity.Name, entity.Description, entity.DurationMinutes);
}
