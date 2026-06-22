using BookACall.Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace BookACall.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<EventTypeEntity> EventTypes => Set<EventTypeEntity>();
    public DbSet<BookingEntity> Bookings => Set<BookingEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EventTypeEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired();
            entity.Property(e => e.Description).IsRequired();
            entity.Property(e => e.DurationMinutes).IsRequired();
        });

        modelBuilder.Entity<BookingEntity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.EventTypeId).IsRequired();
            entity.Property(e => e.GuestName).IsRequired();
            entity.Property(e => e.GuestEmail).IsRequired();
            entity.HasIndex(e => e.StartsAt).IsUnique();

            entity.HasOne(e => e.EventType)
                .WithMany()
                .HasForeignKey(e => e.EventTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
