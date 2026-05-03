using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.Entities;

namespace SmartWarehouse.API.Data;

public class AppDbContext : IdentityDbContext<AppUser, AppRole, Guid>
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor httpContextAccessor)
        : base(options)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    // Mevcut DbSet'ler
    public DbSet<Product> Products { get; set; }
    public DbSet<WarehouseZone> WarehouseZones { get; set; }
    public DbSet<StockMovement> StockMovements { get; set; }
    
    // 🆕 Üretim Emri Modülü Entity'leri
    public DbSet<WorkOrder> WorkOrders { get; set; }
    public DbSet<WorkOrderMaterial> WorkOrderMaterials { get; set; }
    public DbSet<WorkOrderOperation> WorkOrderOperations { get; set; }
    public DbSet<ProductMaterial> ProductMaterials { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ============================================
        // İLİŞKİ KONFİGÜRASYONLARI
        // ============================================

        // Product - ProductMaterial (1-N)
        builder.Entity<ProductMaterial>()
            .HasOne(pm => pm.Product)
            .WithMany(p => p.BillOfMaterials)
            .HasForeignKey(pm => pm.ProductId)
            .OnDelete(DeleteBehavior.Restrict); // Mamul silinirse reçete kalmasın ama silmeyi engelle

        builder.Entity<ProductMaterial>()
            .HasOne(pm => pm.Material)
            .WithMany()
            .HasForeignKey(pm => pm.MaterialId)
            .OnDelete(DeleteBehavior.Restrict);

        // WorkOrder - WorkOrderMaterial (1-N)
        builder.Entity<WorkOrderMaterial>()
            .HasOne(wom => wom.WorkOrder)
            .WithMany(wo => wo.Materials)
            .HasForeignKey(wom => wom.WorkOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Entity<WorkOrderMaterial>()
            .HasOne(wom => wom.Material)
            .WithMany()
            .HasForeignKey(wom => wom.MaterialId)
            .OnDelete(DeleteBehavior.Restrict);

        // WorkOrder - WorkOrderOperation (1-N)
        builder.Entity<WorkOrderOperation>()
            .HasOne(woo => woo.WorkOrder)
            .WithMany(wo => wo.Operations)
            .HasForeignKey(woo => woo.WorkOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        // WorkOrder - Product (N-1)
        builder.Entity<WorkOrder>()
            .HasOne(wo => wo.Product)
            .WithMany()
            .HasForeignKey(wo => wo.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        // WorkOrderMaterial - WarehouseZone (Opsiyonel Raf)
        builder.Entity<WorkOrderMaterial>()
            .HasOne(wom => wom.FromRaf)
            .WithMany()
            .HasForeignKey(wom => wom.FromRafId)
            .OnDelete(DeleteBehavior.SetNull);

        // WorkOrderOperation - AppUser (Opsiyonel Personel)
        builder.Entity<WorkOrderOperation>()
            .HasOne(woo => woo.AssignedEmployee)
            .WithMany()
            .HasForeignKey(woo => woo.AssignedEmployeeId)
            .OnDelete(DeleteBehavior.SetNull);

        // ============================================
        // GLOBAL MULTI-TENANT FİLTRELERİ
        // ============================================
        builder.Entity<Product>().HasQueryFilter(p => p.CompanyId == GetCurrentCompanyId() && !p.IsDeleted);
        builder.Entity<WarehouseZone>().HasQueryFilter(w => w.CompanyId == GetCurrentCompanyId() && !w.IsDeleted);
        builder.Entity<StockMovement>().HasQueryFilter(s => s.CompanyId == GetCurrentCompanyId() && !s.IsDeleted);
        
        builder.Entity<WorkOrder>().HasQueryFilter(wo => wo.CompanyId == GetCurrentCompanyId() && !wo.IsDeleted);
        builder.Entity<WorkOrderMaterial>().HasQueryFilter(wom => wom.CompanyId == GetCurrentCompanyId() && !wom.IsDeleted);
        builder.Entity<WorkOrderOperation>().HasQueryFilter(woo => woo.CompanyId == GetCurrentCompanyId() && !woo.IsDeleted);
        builder.Entity<ProductMaterial>().HasQueryFilter(pm => pm.CompanyId == GetCurrentCompanyId() && !pm.IsDeleted);
        
        builder.Entity<AppUser>().HasQueryFilter(u => u.CompanyId.ToString() == GetCurrentCompanyId());

        // ============================================
        // IDENTITY TABLO İSİMLERİ
        // ============================================
        builder.Entity<AppUser>(entity => entity.ToTable("Users"));
        builder.Entity<AppRole>(entity => entity.ToTable("Roles"));
        builder.Entity<IdentityUserRole<Guid>>(entity => entity.ToTable("UserRoles"));
        builder.Entity<IdentityUserClaim<Guid>>(entity => entity.ToTable("UserClaims"));
        builder.Entity<IdentityUserLogin<Guid>>(entity => entity.ToTable("UserLogins"));
        builder.Entity<IdentityRoleClaim<Guid>>(entity => entity.ToTable("RoleClaims"));
        builder.Entity<IdentityUserToken<Guid>>(entity => entity.ToTable("UserTokens"));
    }

    private string GetCurrentCompanyId()
    {
        if (_httpContextAccessor?.HttpContext == null)
            return string.Empty;

        var companyIdClaim = _httpContextAccessor.HttpContext.User.FindFirst("CompanyId");
        return companyIdClaim?.Value ?? string.Empty;
    }
}