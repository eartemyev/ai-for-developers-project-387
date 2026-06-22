using BookACall.Api.Data;
using BookACall.Api.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase(builder.Configuration.GetConnectionString("BookACall") ?? "BookACall"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "Book a call API", Version = "v1" });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(db);
}

app.UseDefaultFiles();
app.MapStaticAssets();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Book a call API v1");
    options.RoutePrefix = "swagger";
});

app.MapEventTypeEndpoints();
app.MapBookingEndpoints();

app.MapFallbackToFile("/index.html");

app.Run();

public partial class Program;
