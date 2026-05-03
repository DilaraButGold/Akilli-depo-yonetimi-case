// Entities/AppUser.cs
using Microsoft.AspNetCore.Identity;

namespace SmartWarehouse.API.Entities;

public class AppUser : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public Guid CompanyId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties (şimdilik yorum satırı)
    // public Company Company { get; set; }
    // public ICollection<StockMovement> StockMovements { get; set; }
}