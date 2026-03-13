using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.Entities;

namespace SmartWarehouse.API.Data;

// Sınıfımız DbContext'ten miras alarak bir veritabanı köprüsü haline geliyor.
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

   
    public DbSet<Product> Products { get; set; }
    public DbSet<WarehouseZone> WarehouseZones { get; set; }
    public DbSet<StockMovement> StockMovements { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }
}