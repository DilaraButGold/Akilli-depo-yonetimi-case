using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartWarehouse.API.Constants;
using SmartWarehouse.API.Entities;

namespace SmartWarehouse.API.Data;

public static class DbInitializer
{
    public static async Task SeedRolesAndAdminAsync(IServiceProvider serviceProvider)
    {
        var roleManager = serviceProvider.GetRequiredService<RoleManager<AppRole>>();
        var userManager = serviceProvider.GetRequiredService<UserManager<AppUser>>();
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        // Roller
        string[] roleNames = { UserRoles.Admin, UserRoles.WarehouseManager, UserRoles.WarehouseStaff, UserRoles.Accountant };
        foreach (var roleName in roleNames)
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new AppRole { Name = roleName, Description = $"{roleName} rolü" });
            }
        }

        // Varsayılan admin (global filtreyi atlayarak sorgula)
        var adminEmail = "admin@depo.com";
        var normalizedEmail = adminEmail.ToUpperInvariant();
        var existingAdmin = await dbContext.Users
            .IgnoreQueryFilters() // 🆕 Multi-tenant filtresini yok say
            .FirstOrDefaultAsync(u => u.NormalizedEmail == normalizedEmail);

        if (existingAdmin == null)
        {
            var adminUser = new AppUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FirstName = "Sistem",
                LastName = "Yönetici",
                CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            var result = await userManager.CreateAsync(adminUser, "Admin123!");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, UserRoles.Admin);
            }
        }
    }
}