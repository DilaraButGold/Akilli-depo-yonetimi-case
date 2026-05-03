using Microsoft.AspNetCore.Identity;

namespace SmartWarehouse.API.Entities;

public class AppRole : IdentityRole<Guid>
{
    public string Description { get; set; } = string.Empty;
}