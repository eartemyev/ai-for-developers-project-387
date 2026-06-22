using BookACall.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookACall.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.EventTypes.AnyAsync())
        {
            return;
        }

        db.EventTypes.AddRange(
            new EventTypeEntity
            {
                Id = Guid.NewGuid().ToString(),
                Name = "30 минут",
                Description = string.Empty,
                DurationMinutes = 30
            },
            new EventTypeEntity
            {
                Id = Guid.NewGuid().ToString(),
                Name = "15 минут",
                Description = string.Empty,
                DurationMinutes = 15
            });

        await db.SaveChangesAsync();
    }
}
