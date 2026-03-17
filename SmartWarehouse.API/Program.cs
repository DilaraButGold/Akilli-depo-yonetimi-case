using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.Data;
using SmartWarehouse.API.Repositories;
using SmartWarehouse.API.Managers;
using SmartWarehouse.API.Hubs;
using SmartWarehouse.API.Services;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); 
    });
});

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = null;
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IProductManager, ProductManager>();
builder.Services.AddScoped<IStockMovementManager, StockMovementManager>();
builder.Services.AddScoped<IWarehouseZoneManager, WarehouseZoneManager>(); 

builder.Services.AddSignalR(); 
builder.Services.AddOpenApi(); 

var app = builder.Build();

// Global hata yakalayıcı middleware - EN ÜSTE OLMALI
app.Use(async (context, next) => {
    try {
        await next();
    } catch (Exception ex) {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        // Sadece Message ile dön, Success false olsun
        var response = new { Success = false, Message = ex.Message };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
});

app.UseCors("AllowReactApp");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();
app.MapHub<WarehouseHub>("/warehouseHub");

app.Run();