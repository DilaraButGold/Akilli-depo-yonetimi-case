using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.Data;
using SmartWarehouse.API.Repositories;
using SmartWarehouse.API.Managers;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// --- SERVİS KAYITLARI (Dependency Injection) ---

// 1. CORS Politikası (Frontend erişimi için)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// 2. JSON Yapılandırması (Kritik Kural: Response PascalCase döner)
builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Bu ayar, API yanıtlarının Property isimlerini (Örn: Success, Data) 
    // dökümanda istendiği gibi PascalCase olarak korunmasını sağlar.
    options.JsonSerializerOptions.PropertyNamingPolicy = null;
});

// 3. Veritabanı ve Repository Kayıtları
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// 4. Manager Kayıtları
builder.Services.AddScoped<IProductManager, ProductManager>();
builder.Services.AddScoped<IStockMovementManager, StockMovementManager>();

builder.Services.AddOpenApi(); 

var app = builder.Build();

// --- HTTP İSTEK BORU HATTI ---
app.UseCors("AllowReactApp");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();