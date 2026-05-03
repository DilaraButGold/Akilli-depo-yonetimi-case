using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using SmartWarehouse.API.Data;
using SmartWarehouse.API.Repositories;
using SmartWarehouse.API.Managers;
using SmartWarehouse.API.Hubs;
using SmartWarehouse.API.Services;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using SmartWarehouse.API.Entities;

var builder = WebApplication.CreateBuilder(args);

// 1. Veritabanı
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Identity
builder.Services.AddIdentity<AppUser, AppRole>(options =>
{
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// 3. HttpContextAccessor (multi-tenant filtre için)
builder.Services.AddHttpContextAccessor();

// 4. Authentication (JWT)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/warehouseHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 5. CORS (Geliştirme için genişletilmiş)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .SetIsOriginAllowed(_ => true); // Tüm origin'lere izin ver (sadece geliştirme için)
    });
});

// 6. Controller + JSON (Döngü koruması eklendi)
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// 7. Dependency Injection
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IProductManager, ProductManager>();
builder.Services.AddScoped<IStockMovementManager, StockMovementManager>();
builder.Services.AddScoped<IWarehouseZoneManager, WarehouseZoneManager>();
builder.Services.AddScoped<ITokenService, TokenService>(); 
builder.Services.AddScoped<IWorkOrderManager, WorkOrderManager>();

// 8. SignalR + OpenAPI
builder.Services.AddSignalR();
builder.Services.AddOpenApi();

var app = builder.Build();

// 9. Global exception handler
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        var response = new { Success = false, Message = ex.Message };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
});

app.UseCors("AllowReactApp");

// 10. OPTIONS istekleri için kısa devre (preflight sorunlarını giderir)
app.Use(async (context, next) =>
{
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.StatusCode = 200;
        await context.Response.CompleteAsync();
        return;
    }
    await next();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// app.UseHttpsRedirection(); // Geliştirme için kapalı

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<WarehouseHub>("/warehouseHub");

// 🆕 Tüm ağ arayüzlerini dinle (mobil erişim için gerekli)
app.Urls.Add("http://*:5041");

app.Run();